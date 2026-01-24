import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2120';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw error;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth functions
export async function login(username: string, password: string) {
  const response = await api.post('/api/auth/login', { username, password });
  const { token, refreshToken, user } = response.data.data;

  localStorage.setItem('accessToken', token);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));

  return user;
}

export async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken });
    }
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Deliveries
export async function getDeliveries(params?: {
  page?: number;
  limit?: number;
  status?: string;
  courierId?: string;
  search?: string;
}) {
  const response = await api.get('/api/deliveries', { params });
  return response.data.data;
}

export async function getDeliveryById(id: string) {
  const response = await api.get(`/api/deliveries/${id}`);
  return response.data.data;
}

export async function getDeliveryRoute(
  id: string,
  params?: { limit?: number; fromDate?: string; toDate?: string }
): Promise<{ deliveryId: string; points: Array<{ id: string; lat: number; lng: number; recordedAt: string }> }> {
  const response = await api.get(`/api/deliveries/${id}/route`, { params });
  return response.data.data;
}

export async function getDeliveryStats() {
  const response = await api.get('/api/deliveries/stats');
  return response.data.data;
}

export async function createDelivery(data: {
  customerId: string;
  courierId?: string;
  description?: string;
  priority?: string;
  scheduledDate?: string;
}) {
  const response = await api.post('/api/deliveries', data);
  return response.data.data;
}

export async function assignDelivery(deliveryId: string, courierId: string) {
  const response = await api.put(`/api/deliveries/${deliveryId}/assign`, { courierId });
  return response.data.data;
}

export async function deleteDelivery(deliveryId: string) {
  await api.delete(`/api/deliveries/${deliveryId}`);
}

// Customers
export async function getCustomers(params?: { page?: number; limit?: number; search?: string }) {
  const response = await api.get('/api/customers', { params });
  return response.data.data;
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  address: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}) {
  const response = await api.post('/api/customers', data);
  return response.data.data;
}

export async function updateCustomer(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    address: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }>
) {
  const response = await api.put(`/api/customers/${id}`, data);
  return response.data.data;
}

export async function deleteCustomer(id: string) {
  await api.delete(`/api/customers/${id}`);
}

// Couriers
export async function getCouriers() {
  const response = await api.get('/api/users/couriers');
  return response.data.data;
}

// Users (admin / dispatcher)
export async function getUsers(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/users', { params });
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
  role?: string;
}) {
  // Registration endpoint is under /api/auth/register and requires admin token
  const response = await api.post('/api/auth/register', data);
  return response.data.data;
}

// Locations
export async function getCouriersLocations() {
  const response = await api.get('/api/locations/couriers');
  return response.data.data;
}

export async function getCourierLocationHistory(
  courierId: string,
  params?: {
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
  }
) {
  const response = await api.get(`/api/locations/courier/${courierId}/history`, { params });
  return response.data.data;
}

// Import
export async function importDeliveriesFromExcel(file: File): Promise<{
  deliveriesCreated: number;
  customersCreated: number;
  totalRows: number;
  errors: string[];
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/import/deliveries', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
}

export async function downloadImportTemplate(): Promise<void> {
  const response = await api.get('/api/import/template', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'plantilla_entregas.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
