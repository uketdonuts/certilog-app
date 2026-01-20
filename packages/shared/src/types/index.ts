// Enums
export enum Role {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  COURIER = 'COURIER',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// User types
export interface User {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  fcmToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Delivery types
export interface Delivery {
  id: string;
  trackingCode: string;
  customerId: string;
  customer?: Customer;
  courierId: string | null;
  courier?: UserPublic | null;
  status: DeliveryStatus;
  priority: Priority;
  description: string | null;
  packageDetails: string | null;
  scheduledDate: Date | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveredAt: Date | null;
  deliveryNotes: string | null;
  localId: string | null;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryCreate {
  customerId: string;
  courierId?: string;
  description?: string;
  packageDetails?: string;
  scheduledDate?: Date;
  priority?: Priority;
}

export interface DeliveryComplete {
  photoUrl: string;
  signatureUrl: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryNotes?: string;
}

// Location types
export interface CourierLocation {
  id: string;
  courierId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: Date;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  battery?: number;
}

// Auth types
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginPinRequest {
  pin: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserPublic;
}

export interface TokenPayload {
  userId: string;
  role: Role;
  iat: number;
  exp: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Socket events
export interface SocketEvents {
  'location:update': (data: LocationUpdate) => void;
  'courier:location': (data: { courierId: string; lat: number; lng: number; timestamp: number }) => void;
  'delivery:assigned': (data: { deliveryId: string; courierId: string }) => void;
  'delivery:completed': (data: { deliveryId: string }) => void;
}

// Offline sync types
export interface SyncPayload {
  deliveries: DeliverySyncItem[];
  locations: LocationUpdate[];
}

export interface DeliverySyncItem {
  localId: string;
  serverId?: string;
  status: DeliveryStatus;
  photoUrl?: string;
  signatureUrl?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveredAt?: string;
  deliveryNotes?: string;
}
