import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { Role } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    role: Role;
    fullName: string;
  };
}

export function initializeSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Token de autenticación requerido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        role: Role;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, fullName: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('Usuario no encontrado o inactivo'));
      }

      (socket as AuthenticatedSocket).data = {
        userId: user.id,
        role: user.role,
        fullName: user.fullName,
      };

      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, role, fullName } = authSocket.data;

    console.log(`User connected: ${fullName} (${role})`);

    // Join appropriate rooms
    if (role === Role.ADMIN || role === Role.DISPATCHER) {
      socket.join('dashboard');
      console.log(`${fullName} joined dashboard room`);
    }

    if (role === Role.COURIER) {
      socket.join(`courier:${userId}`);
      console.log(`${fullName} joined courier room`);
    }

    // Handle courier location updates
    socket.on('location:update', async (data: { lat: number; lng: number; accuracy?: number; speed?: number; battery?: number }) => {
      if (role !== Role.COURIER) return;

      try {
        // Save to database
        await prisma.courierLocation.create({
          data: {
            courierId: userId,
            latitude: data.lat,
            longitude: data.lng,
            accuracy: data.accuracy,
            speed: data.speed,
            batteryLevel: data.battery,
          },
        });

        // Broadcast to dashboard
        io.to('dashboard').emit('courier:location', {
          courierId: userId,
          fullName,
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          speed: data.speed,
          battery: data.battery,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error saving location:', error);
      }
    });

    // Handle delivery status updates (from courier)
    socket.on('delivery:status', async (data: { deliveryId: string; status: string }) => {
      if (role !== Role.COURIER) return;

      try {
        // Broadcast to dashboard
        io.to('dashboard').emit('delivery:updated', {
          deliveryId: data.deliveryId,
          status: data.status,
          courierId: userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error broadcasting delivery status:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${fullName}`);

      // Notify dashboard that courier went offline
      if (role === Role.COURIER) {
        io.to('dashboard').emit('courier:offline', {
          courierId: userId,
          timestamp: Date.now(),
        });
      }
    });
  });

  return io;
}

// Helper to send notification to specific courier
export function notifyCourier(io: Server, courierId: string, event: string, data: unknown): void {
  io.to(`courier:${courierId}`).emit(event, data);
}

// Helper to broadcast to all dashboard users
export function notifyDashboard(io: Server, event: string, data: unknown): void {
  io.to('dashboard').emit(event, data);
}
