import axios from 'axios';
import { Platform } from 'react-native';
import * as Storage from '../storage';

// Determine API URL with precedence:
// 1. `EXPO_PUBLIC_API_URL` env var (useful for overriding in development)
// 2. For web: dev tunnel (previous default)
// 3. For native: localhost
const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (Platform.OS === 'web' ? 'https://jtfrcpdb-2120.use2.devtunnels.ms' : 'http://localhost:2120');
console.log('API_URL configured:', API_URL, 'Platform:', Platform.OS);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await Storage.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await Storage.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data.data;

        await Storage.setItemAsync('accessToken', token);
        await Storage.setItemAsync('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        // Refresh failed, clear tokens
        await Storage.deleteItemAsync('accessToken');
        await Storage.deleteItemAsync('refreshToken');
        await Storage.deleteItemAsync('user');
        throw error;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Users (admin/dispatcher)
export async function getUsers(page = 1, limit = 50) {
  const response = await api.get('/api/users', { params: { page, limit } });
  return response.data.data;
}

export async function getUserById(id: string) {
  const response = await api.get(`/api/users/${id}`);
  return response.data.data;
}

export async function updateUser(id: string, data: Record<string, unknown>) {
  const response = await api.put(`/api/users/${id}`, data);
  return response.data.data;
}

export async function deactivateUser(id: string) {
  await api.delete(`/api/users/${id}`);
}

export async function createUser(data: {
  email?: string;
  username?: string;
  password?: string;
  pin?: string;
  fullName: string;
  phone?: string;
  role?: 'ADMIN' | 'DISPATCHER' | 'COURIER';
}) {
  const response = await api.post('/api/auth/register', data);
  return response.data.data;
}
