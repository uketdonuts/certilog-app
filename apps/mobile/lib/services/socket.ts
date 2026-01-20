import { io, Socket } from 'socket.io-client';
import * as Storage from '../storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:2120';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const token = await Storage.getItemAsync('accessToken');

  if (!token) {
    throw new Error('No authentication token');
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function sendLocationUpdate(data: {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  battery?: number;
}): void {
  if (socket?.connected) {
    socket.emit('location:update', data);
  }
}

export function sendDeliveryStatus(deliveryId: string, status: string): void {
  if (socket?.connected) {
    socket.emit('delivery:status', { deliveryId, status });
  }
}

export function onDeliveryAssigned(callback: (data: { deliveryId: string }) => void): void {
  socket?.on('delivery:assigned', callback);
}

export function offDeliveryAssigned(callback: (data: { deliveryId: string }) => void): void {
  socket?.off('delivery:assigned', callback);
}
