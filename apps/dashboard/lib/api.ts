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
  createdAtFrom?: string;
  createdAtTo?: string;
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

export async function deactivateCustomer(id: string) {
  await api.delete(`/api/customers/${id}`);
}

export async function deleteCustomerPermanently(id: string) {
  await api.delete(`/api/customers/${id}?permanent=true`);
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

export async function deleteUserPermanently(id: string) {
  await api.delete(`/api/users/${id}?permanent=true`);
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

// Logs
export async function getUserLogs(id: string, params?: { limit?: number; offset?: number }) {
  const response = await api.get(`/api/logs/users/${id}`, { params });
  return response.data.data;
}

export async function getCustomerLogs(id: string, params?: { limit?: number; offset?: number }) {
  const response = await api.get(`/api/logs/customers/${id}`, { params });
  return response.data.data;
}

// Locations
export async function getCouriersLocations() {
  const response = await api.get('/api/locations/couriers');
  return response.data.data;
}

// Fleet - Vehicles
export async function getVehicles(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/vehicles', { params });
  return response.data.data;
}

export async function createVehicle(data: {
  licensePlate: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
}) {
  const response = await api.post('/api/vehicles', data);
  return response.data.data;
}

export async function updateVehicle(id: string, data: Partial<{ licensePlate: string; make?: string; model?: string; year?: number; vin?: string }>) {
  const response = await api.put(`/api/vehicles/${id}`, data);
  return response.data.data;
}

export async function deleteVehicle(id: string) {
  await api.delete(`/api/vehicles/${id}`);
}

// Gas reports
export async function getGasReports(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/gas', { params });
  return response.data.data;
}

export async function createGasReport(data: { vehicleId: string; liters: number; cost?: number; odometer?: number; fuelType?: string; notes?: string }) {
  const response = await api.post('/api/gas', data);
  return response.data.data;
}

export async function updateGasReport(id: string, data: Partial<{ vehicleId: string; liters: number; cost?: number; odometer?: number; fuelType?: string; notes?: string }>) {
  const response = await api.put(`/api/gas/${id}`, data);
  return response.data.data;
}

export async function deleteGasReport(id: string) {
  await api.delete(`/api/gas/${id}`);
}

// Attendance records (asistencia, ausencias, incapacidades, tardanzas)
export async function getAttendanceRecords(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/attendance', { params });
  return response.data.data;
}

export async function createAttendanceRecord(data: {
  userId: string;
  type: 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';
  date: string;
  minutesLate?: number;
  reason?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  const response = await api.post('/api/attendance', data);
  return response.data.data;
}

export async function updateAttendanceRecord(
  id: string,
  data: Partial<{
    userId: string;
    type: 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';
    date: string;
    minutesLate?: number;
    reason?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }>
) {
  const response = await api.put(`/api/attendance/${id}`, data);
  return response.data.data;
}

export async function deleteAttendanceRecord(id: string) {
  await api.delete(`/api/attendance/${id}`);
}

// Aliases for backward compatibility
export const getAbsences = getAttendanceRecords;
export const createAbsence = createAttendanceRecord;
export const updateAbsence = updateAttendanceRecord;
export const deleteAbsence = deleteAttendanceRecord;

// Fleet maintenance
export async function getFleetMaintenance(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/fleet-maintenance', { params });
  return response.data.data;
}

export async function createFleetMaintenance(data: { vehicleId: string; description?: string; severity?: string; reportedAt?: string }) {
  const response = await api.post('/api/fleet-maintenance', data);
  return response.data.data;
}

export async function updateFleetMaintenance(id: string, data: Partial<{ vehicleId: string; description?: string; severity?: string; reportedAt?: string }>) {
  const response = await api.put(`/api/fleet-maintenance/${id}`, data);
  return response.data.data;
}

export async function deleteFleetMaintenance(id: string) {
  await api.delete(`/api/fleet-maintenance/${id}`);
}

// Preventive maintenance
export async function getPreventives(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/preventive', { params });
  return response.data.data;
}

export async function createPreventive(data: { vehicleId: string; scheduledAt: string; type?: string; notes?: string }) {
  const response = await api.post('/api/preventive', data);
  return response.data.data;
}

export async function updatePreventive(id: string, data: Partial<{ vehicleId: string; scheduledAt?: string; performedAt?: string; type?: string; notes?: string }>) {
  const response = await api.put(`/api/preventive/${id}`, data);
  return response.data.data;
}

export async function deletePreventive(id: string) {
  await api.delete(`/api/preventive/${id}`);
}

// Repairs
export async function getRepairs(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/repairs', { params });
  return response.data.data;
}

export async function createRepair(data: { vehicleId: string; description?: string; cost?: number; performedAt?: string }) {
  const response = await api.post('/api/repairs', data);
  return response.data.data;
}

export async function updateRepair(id: string, data: Partial<{ vehicleId: string; description?: string; cost?: number; performedAt?: string }>) {
  const response = await api.put(`/api/repairs/${id}`, data);
  return response.data.data;
}

export async function deleteRepair(id: string) {
  await api.delete(`/api/repairs/${id}`);
}

// Tire semaphore
export async function getTireSemaphores(params?: { page?: number; limit?: number }) {
  const response = await api.get('/api/tire-semaphore', { params });
  return response.data.data;
}

export async function createTireSemaphore(data: { vehicleId: string; frontLeft?: string; frontRight?: string; rearLeft?: string; rearRight?: string; recordedAt?: string }) {
  const response = await api.post('/api/tire-semaphore', data);
  return response.data.data;
}

export async function updateTireSemaphore(id: string, data: Partial<{ vehicleId: string; frontLeft?: string; frontRight?: string; rearLeft?: string; rearRight?: string; recordedAt?: string }>) {
  const response = await api.put(`/api/tire-semaphore/${id}`, data);
  return response.data.data;
}

export async function deleteTireSemaphore(id: string) {
  await api.delete(`/api/tire-semaphore/${id}`);
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

// Export deliveries to Excel
export async function exportDeliveriesToExcel(params?: {
  status?: string;
  search?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}): Promise<void> {
  const response = await api.get('/api/deliveries/export', {
    params,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `entregas_${date}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
