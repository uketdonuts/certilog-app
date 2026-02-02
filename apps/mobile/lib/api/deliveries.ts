import api from './client';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Delivery {
  id: string;
  trackingCode: string;
  publicTrackingToken: string | null;
  customerId: string;
  customer: Customer;
  courierId: string | null;
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  description: string | null;
  packageDetails: string | null;
  scheduledDate: string | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  videoUrl: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  rating: number | null;
  rescheduledCount: number;
  rescheduleReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeliveryRoutePoint {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: string;
}

export interface DeliveryRouteResponse {
  deliveryId: string;
  points: DeliveryRoutePoint[];
}

export async function getMyDeliveries(
  page = 1,
  limit = 20,
  status?: string
): Promise<PaginatedResponse<Delivery>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (status) {
    params.append('status', status);
  }

  const response = await api.get(`/api/deliveries/my?${params}`);
  return response.data.data;
}

export async function getDeliveryById(id: string): Promise<Delivery> {
  const response = await api.get(`/api/deliveries/${id}`);
  return response.data.data;
}

export async function updateDeliveryStatus(
  id: string,
  status: Delivery['status']
): Promise<Delivery> {
  const response = await api.put(`/api/deliveries/${id}`, { status });
  return response.data.data;
}

export async function startDelivery(id: string): Promise<Delivery> {
  const response = await api.put(`/api/deliveries/${id}/start`);
  return response.data.data;
}

export async function completeDelivery(
  id: string,
  data: {
    photoUrl: string;
    signatureUrl: string;
    videoUrl?: string;
    deliveryLat: number;
    deliveryLng: number;
    deliveryNotes?: string;
    extraPhotoUrls?: string[];
    rating: number;
  }
): Promise<Delivery> {
  const response = await api.put(`/api/deliveries/${id}/complete`, data);
  return response.data.data;
}

export async function getDeliveryRoute(
  id: string,
  params?: { limit?: number; fromDate?: string; toDate?: string }
): Promise<DeliveryRouteResponse> {
  const response = await api.get(`/api/deliveries/${id}/route`, { params });
  return response.data.data;
}

export interface SyncData {
  deliveries: {
    localId: string;
    serverId?: string;
    status: Delivery['status'];
    photoUrl?: string;
    signatureUrl?: string;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveredAt?: string;
    deliveryNotes?: string;
  }[];
  locations?: {
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    battery?: number;
    recordedAt?: string;
  }[];
}

export async function syncDeliveries(data: SyncData): Promise<{
  deliveriesUpdated: number;
  locationsAdded: number;
  deliveries: Delivery[];
}> {
  const response = await api.post('/api/deliveries/sync', data);
  return response.data.data;
}

export async function rescheduleDelivery(
  id: string,
  data: {
    scheduledDate: string;
    reason?: string;
  }
): Promise<Delivery> {
  const response = await api.post(`/api/deliveries/${id}/reschedule`, data);
  return response.data.data;
}
