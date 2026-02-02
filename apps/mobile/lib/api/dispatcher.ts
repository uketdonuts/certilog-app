import api from './client';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  assigned: number;
  inTransit: number;
  delivered: number;
  failed: number;
  todayDelivered: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

export interface Delivery {
  id: string;
  trackingCode: string;
  status: string;
  priority: string;
  description?: string | null;
  packageDetails?: string | null;
  scheduledDate?: string | null;
  createdAt: string;
  customer: { name: string; address: string };
  courier?: { id: string; fullName: string } | null;
}

export async function createDelivery(data: {
  customerId: string;
  courierId?: string;
  description?: string;
  packageDetails?: string;
  scheduledDate?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}) {
  const response = await api.post('/api/deliveries', data);
  return response.data.data as Delivery;
}

export interface CourierLocation {
  courierId: string;
  fullName: string;
  activeDeliveries: number;
  location: {
    lat: number;
    lng: number;
    batteryLevel: number | null;
    recordedAt: string;
  } | null;
}

export async function getDeliveryStats(): Promise<DeliveryStats> {
  const response = await api.get('/api/deliveries/stats');
  return response.data.data;
}

export async function getDeliveries(params?: {
  page?: number;
  limit?: number;
  status?: string;
  courierId?: string;
  search?: string;
}) {
  const response = await api.get('/api/deliveries', { params });
  return response.data.data as PaginatedResponse<Delivery>;
}

export async function getCustomers(params?: { page?: number; limit?: number; search?: string }) {
  const response = await api.get('/api/customers', { params });
  return response.data.data as PaginatedResponse<Customer>;
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
  return response.data.data as Customer;
}

export async function updateCustomer(id: string, data: Partial<Omit<Customer, 'id'>>) {
  const response = await api.put(`/api/customers/${id}`, data);
  return response.data.data as Customer;
}

export async function deleteCustomer(id: string) {
  await api.delete(`/api/customers/${id}`);
}

export async function getCouriersLocations(): Promise<CourierLocation[]> {
  const response = await api.get('/api/locations/couriers');
  return response.data.data;
}

export async function getCouriers(): Promise<{ id: string; fullName: string; phone?: string | null }[]> {
  const response = await api.get('/api/users/couriers');
  return response.data.data;
}

export async function assignDelivery(deliveryId: string, courierId: string) {
  const response = await api.put(`/api/deliveries/${deliveryId}/assign`, { courierId });
  return response.data.data;
}

export async function updateDelivery(
  deliveryId: string,
  data: {
    customerId?: string;
    courierId?: string | null;
    status?: string;
    description?: string;
    packageDetails?: string;
    scheduledDate?: string | null;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  }
) {
  const response = await api.put(`/api/deliveries/${deliveryId}`, data);
  return response.data.data as Delivery;
}

export async function rescheduleDelivery(
  deliveryId: string,
  data: {
    scheduledDate: string;
    reason?: string;
  }
) {
  const response = await api.post(`/api/deliveries/${deliveryId}/reschedule`, data);
  return response.data.data as Delivery;
}

export async function cancelDelivery(deliveryId: string, reason: string) {
  const response = await api.post(`/api/deliveries/${deliveryId}/cancel`, { reason });
  return response.data.data as Delivery;
}
