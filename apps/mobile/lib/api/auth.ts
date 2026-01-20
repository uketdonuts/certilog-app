import * as Storage from '../storage';
import api from './client';

export interface User {
  id: string;
  fullName: string;
  phone: string | null;
  role: 'ADMIN' | 'DISPATCHER' | 'COURIER';
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export async function loginWithCredentials(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await api.post('/api/auth/login', { username, password });
  const data = response.data.data as AuthResponse;

  await Storage.setItemAsync('accessToken', data.token);
  await Storage.setItemAsync('refreshToken', data.refreshToken);
  await Storage.setItemAsync('user', JSON.stringify(data.user));

  return data;
}

export async function loginWithPin(pin: string): Promise<AuthResponse> {
  const response = await api.post('/api/auth/login-pin', { pin });
  const data = response.data.data as AuthResponse;

  await Storage.setItemAsync('accessToken', data.token);
  await Storage.setItemAsync('refreshToken', data.refreshToken);
  await Storage.setItemAsync('user', JSON.stringify(data.user));

  return data;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = await Storage.getItemAsync('refreshToken');
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken });
    }
  } catch {
    // Ignore errors during logout
  } finally {
    await Storage.deleteItemAsync('accessToken');
    await Storage.deleteItemAsync('refreshToken');
    await Storage.deleteItemAsync('user');
  }
}

export async function getStoredUser(): Promise<User | null> {
  const userStr = await Storage.getItemAsync('user');
  if (!userStr) return null;
  return JSON.parse(userStr);
}

export async function getStoredToken(): Promise<string | null> {
  return Storage.getItemAsync('accessToken');
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredToken();
  return !!token;
}

export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
  await api.put(`/api/users/${userId}/fcm-token`, { fcmToken });
}
