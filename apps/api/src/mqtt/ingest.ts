import type { Server as SocketIOServer } from 'socket.io';
import mqtt, { type IClientOptions, type MqttClient, type ISubscriptionGrant } from 'mqtt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database.js';
import { Role } from '@prisma/client';

const LocationMessageSchema = z.object({
  token: z.string().min(1),
  lat: z.number().finite(),
  lng: z.number().finite(),
  accuracy: z.number().finite().optional(),
  speed: z.number().finite().optional(),
  battery: z.number().int().min(0).max(100).optional(),
  ts: z.number().int().positive().optional(),
});

type LocationMessage = z.infer<typeof LocationMessageSchema>;

const PresenceMessageSchema = z.object({
  token: z.string().min(1),
  status: z.enum(['online', 'offline']),
  ts: z.number().int().positive().optional(),
});

type PresenceMessage = z.infer<typeof PresenceMessageSchema>;

function safeJsonParse(payload: Buffer): unknown {
  try {
    return JSON.parse(payload.toString('utf8'));
  } catch {
    return null;
  }
}

function extractBearer(token: string): string {
  const trimmed = token.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) return trimmed.slice(7).trim();
  return trimmed;
}

async function getCourierCached(
  cache: Map<string, { fullName: string; role: Role; fetchedAt: number }>,
  courierId: string
): Promise<{ fullName: string; role: Role } | null> {
  const now = Date.now();
  const cached = cache.get(courierId);
  if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
    return { fullName: cached.fullName, role: cached.role };
  }

  const user = await prisma.user.findUnique({
    where: { id: courierId },
    select: { id: true, fullName: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  cache.set(courierId, { fullName: user.fullName, role: user.role, fetchedAt: now });
  return { fullName: user.fullName, role: user.role };
}

function parseCourierIdFromTopic(topicPrefix: string, topic: string): string | null {
  // expected: `${prefix}/{courierId}/location` or `${prefix}/{courierId}/presence`
  const normalizedPrefix = topicPrefix.replace(/\/+$/, '');
  const parts = topic.split('/');
  const prefixParts = normalizedPrefix.split('/').filter(Boolean);

  if (parts.length < prefixParts.length + 2) return null;
  for (let i = 0; i < prefixParts.length; i++) {
    if (parts[i] !== prefixParts[i]) return null;
  }
  return parts[prefixParts.length] || null;
}

export type InitializeMqttIngestOptions = {
  io: SocketIOServer;
};

export function initializeMqttIngest({ io }: InitializeMqttIngestOptions): { client: MqttClient | null } {
  const MQTT_URL = process.env.MQTT_URL;
  if (!MQTT_URL) {
    console.log('📭 MQTT_URL not set; MQTT ingest disabled');
    return { client: null };
  }

  console.log(`📡 MQTT ingest starting (${MQTT_URL})`);

  const topicPrefix = (process.env.MQTT_TOPIC_PREFIX || 'couriers').replace(/\/+$/, '');
  const locationTopic = `${topicPrefix}/+/location`;
  const presenceTopic = `${topicPrefix}/+/presence`;

  const options: IClientOptions = {
    // Stable-ish id so EMQX can keep session if desired
    clientId: `certilog-api-ingest-${process.pid}-${Math.random().toString(16).slice(2)}`,
    clean: false,
    reconnectPeriod: 2000,
  };

  if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;

  const client = mqtt.connect(MQTT_URL, options);
  const courierCache = new Map<string, { fullName: string; role: Role; fetchedAt: number }>();

  client.on('connect', () => {
    console.log(`📡 MQTT ingest connected (${MQTT_URL})`);
    client.subscribe([locationTopic, presenceTopic], { qos: 1 }, (err?: Error | null, _granted?: ISubscriptionGrant[]) => {
      if (err) console.error('MQTT subscribe error:', err);
      else console.log(`📥 Subscribed: ${locationTopic}, ${presenceTopic}`);
    });
  });

  client.on('reconnect', () => console.log('📡 MQTT ingest reconnecting...'));
  client.on('error', (err: Error) => console.error('MQTT ingest error:', err));

  client.on('message', async (topic: string, payload: Buffer) => {
    const courierIdFromTopic = parseCourierIdFromTopic(topicPrefix, topic);
    if (!courierIdFromTopic) return;

    const raw = safeJsonParse(payload);
    if (!raw || typeof raw !== 'object') return;

    const isLocation = topic.endsWith('/location');
    const isPresence = topic.endsWith('/presence');

    try {
      if (isLocation) {
        const msg = LocationMessageSchema.parse(raw) as LocationMessage;
        const token = extractBearer(msg.token);

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: Role };
        if (decoded.userId !== courierIdFromTopic) return;
        if (decoded.role !== Role.COURIER) return;

        const courier = await getCourierCached(courierCache, decoded.userId);
        if (!courier || courier.role !== Role.COURIER) return;

        await prisma.courierLocation.create({
          data: {
            courierId: decoded.userId,
            latitude: msg.lat,
            longitude: msg.lng,
            accuracy: msg.accuracy,
            speed: msg.speed,
            batteryLevel: msg.battery,
          },
        });

        // If courier has an active IN_TRANSIT delivery, persist route point as well.
        const activeDelivery = await prisma.delivery.findFirst({
          where: { courierId: decoded.userId, status: 'IN_TRANSIT' },
          select: { id: true },
        });

        if (activeDelivery) {
          await (prisma as any).deliveryRoutePoint.create({
            data: {
              deliveryId: activeDelivery.id,
              courierId: decoded.userId,
              latitude: msg.lat,
              longitude: msg.lng,
              accuracy: msg.accuracy,
              speed: msg.speed,
              batteryLevel: msg.battery,
              recordedAt: msg.ts ? new Date(msg.ts) : new Date(),
            },
          });
        }

        io.to('dashboard').emit('courier:location', {
          courierId: decoded.userId,
          fullName: courier.fullName,
          lat: msg.lat,
          lng: msg.lng,
          accuracy: msg.accuracy,
          speed: msg.speed,
          battery: msg.battery,
          timestamp: msg.ts ?? Date.now(),
        });
      } else if (isPresence) {
        const msg = PresenceMessageSchema.parse(raw) as PresenceMessage;
        const token = extractBearer(msg.token);

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: Role };
        if (decoded.userId !== courierIdFromTopic) return;
        if (decoded.role !== Role.COURIER) return;

        if (msg.status === 'offline') {
          io.to('dashboard').emit('courier:offline', {
            courierId: decoded.userId,
            timestamp: msg.ts ?? Date.now(),
          });
        }
      }
    } catch (err) {
      // Keep ingest resilient; log in dev only
      if (process.env.NODE_ENV === 'development') {
        console.warn('MQTT ingest message ignored:', err);
      }
    }
  });

  return { client };
}
