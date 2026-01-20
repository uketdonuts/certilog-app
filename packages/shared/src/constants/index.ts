// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGIN_PIN: '/api/auth/login-pin',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  USERS: {
    BASE: '/api/users',
    BY_ID: (id: string) => `/api/users/${id}`,
    FCM_TOKEN: (id: string) => `/api/users/${id}/fcm-token`,
  },
  CUSTOMERS: {
    BASE: '/api/customers',
    BY_ID: (id: string) => `/api/customers/${id}`,
  },
  DELIVERIES: {
    BASE: '/api/deliveries',
    BY_ID: (id: string) => `/api/deliveries/${id}`,
    ASSIGN: (id: string) => `/api/deliveries/${id}/assign`,
    COMPLETE: (id: string) => `/api/deliveries/${id}/complete`,
    SYNC: '/api/deliveries/sync',
    MY_DELIVERIES: '/api/deliveries/my',
  },
  LOCATIONS: {
    BATCH: '/api/locations/batch',
    COURIERS: '/api/locations/couriers',
    COURIER_HISTORY: (id: string) => `/api/locations/courier/${id}/history`,
  },
  UPLOAD: {
    PHOTO: '/api/upload/photo',
    SIGNATURE: '/api/upload/signature',
  },
} as const;

// Photo compression settings
export const PHOTO_CONFIG = {
  MAX_WIDTH: 1280,
  MAX_HEIGHT: 1280,
  QUALITY: 0.7,
  MAX_SIZE_BYTES: 300000, // 300KB
  FALLBACK_QUALITY: 0.5,
  FALLBACK_WIDTH: 1024,
} as const;

// Signature settings
export const SIGNATURE_CONFIG = {
  WIDTH: 400,
  HEIGHT: 200,
  STROKE_WIDTH: 2,
  STROKE_COLOR: '#000000',
  BACKGROUND_COLOR: '#FFFFFF',
} as const;

// Location tracking settings
export const LOCATION_CONFIG = {
  UPDATE_INTERVAL_MS: 30000, // 30 seconds
  BATCH_UPLOAD_INTERVAL_MS: 300000, // 5 minutes
  ACCURACY: 'balanced' as const,
  DISTANCE_FILTER: 10, // meters
} as const;

// Sync settings
export const SYNC_CONFIG = {
  INTERVAL_MS: 300000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  UPLOAD_TIMEOUT_MS: 30000,
} as const;

// Delivery status labels (Spanish)
export const DELIVERY_STATUS_LABELS = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregada',
  FAILED: 'Fallida',
} as const;

// Priority labels (Spanish)
export const PRIORITY_LABELS = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
} as const;

// Role labels (Spanish)
export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  DISPATCHER: 'Despachador',
  COURIER: 'Mensajero',
} as const;

// Status colors for UI
export const STATUS_COLORS = {
  PENDING: '#FFA500',
  ASSIGNED: '#3B82F6',
  IN_TRANSIT: '#8B5CF6',
  DELIVERED: '#22C55E',
  FAILED: '#EF4444',
} as const;

// Priority colors for UI
export const PRIORITY_COLORS = {
  LOW: '#6B7280',
  NORMAL: '#3B82F6',
  HIGH: '#F59E0B',
  URGENT: '#EF4444',
} as const;
