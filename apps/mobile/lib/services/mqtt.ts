import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import { getStoredToken, type User } from '../api/auth';

const MQTT_URL = process.env.EXPO_PUBLIC_MQTT_URL || 'ws://localhost:8083/mqtt';
const TOPIC_PREFIX = (process.env.EXPO_PUBLIC_MQTT_TOPIC_PREFIX || 'couriers').replace(/\/+$/, '');

let client: MqttClient | null = null;
let currentUserId: string | null = null;
let currentToken: string | null = null;

function json(payload: unknown): string {
  return JSON.stringify(payload);
}

export async function connectMqtt(user: User): Promise<MqttClient> {
  if (client?.connected && currentUserId === user.id) return client;

  const token = await getStoredToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  // Close any existing connection for a different user.
  if (client) {
    try {
      client.end(true);
    } catch {
      // ignore
    }
    client = null;
  }

  currentUserId = user.id;
  currentToken = token;

  const presenceTopic = `${TOPIC_PREFIX}/${user.id}/presence`;
  const willPayload = json({ token, status: 'offline', ts: Date.now() });

  const opts: IClientOptions = {
    clientId: `certilog-mobile-${user.id}-${Math.random().toString(16).slice(2)}`,
    clean: false,
    reconnectPeriod: 2000,
    keepalive: 30,
    will: {
      topic: presenceTopic,
      payload: willPayload,
      qos: 1,
      retain: false,
    },
  };

  client = mqtt.connect(MQTT_URL, opts);

  client.on('connect', () => {
    client?.publish(presenceTopic, json({ token, status: 'online', ts: Date.now() }), { qos: 1 });
  });

  client.on('error', (err: unknown) => {
    // Keep app running; mqtt will retry.
    const msg = typeof err === 'object' && err && 'message' in err ? (err as any).message : err;
    console.warn('MQTT error:', msg);
  });

  return client;
}

export function disconnectMqtt(): void {
  if (!client) return;
  try {
    // try to send offline (best effort)
    if (currentUserId && currentToken && client.connected) {
      const presenceTopic = `${TOPIC_PREFIX}/${currentUserId}/presence`;
      client.publish(presenceTopic, json({ token: currentToken, status: 'offline', ts: Date.now() }), { qos: 1 });
    }
  } catch {
    // ignore
  }

  try {
    client.end(true);
  } finally {
    client = null;
    currentUserId = null;
    currentToken = null;
  }
}

export function publishLocation(payload: {
  userId: string;
  token: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  battery?: number | null;
  ts?: number;
}): void {
  if (!client?.connected) return;

  const topic = `${TOPIC_PREFIX}/${payload.userId}/location`;
  client.publish(
    topic,
    json({
      token: payload.token,
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy ?? undefined,
      speed: payload.speed ?? undefined,
      battery: payload.battery ?? undefined,
      ts: payload.ts ?? Date.now(),
    }),
    { qos: 1 }
  );
}

export async function publishCurrentUserLocation(data: {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  battery?: number | null;
  ts?: number;
}): Promise<void> {
  if (!currentUserId || !currentToken) return;
  publishLocation({
    userId: currentUserId,
    token: currentToken,
    lat: data.lat,
    lng: data.lng,
    accuracy: data.accuracy,
    speed: data.speed,
    battery: data.battery,
    ts: data.ts,
  });
}
