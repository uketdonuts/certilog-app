import { z } from 'zod';
import { Role, DeliveryStatus, Priority } from '@prisma/client';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6),
}).refine(data => data.username || data.email, {
  message: 'Se requiere username o email',
});

export const loginPinSchema = z.object({
  pin: z.string().min(4).max(6),
});

export const registerSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).optional(),
  pin: z.string().min(4).max(6).optional(),
  fullName: z.string().min(2).max(100),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.COURIER),
}).refine(data => data.password || data.pin, {
  message: 'Se requiere password o PIN',
});

// User schemas
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  pin: z.string().min(4).max(6).optional(),
  password: z.string().min(6).optional(),
});

export const updateFcmTokenSchema = z.object({
  fcmToken: z.string(),
});

// Customer schemas
export const createCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  address: z.string().min(5).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// Delivery schemas
export const createDeliverySchema = z.object({
  customerId: z.string().uuid(),
  courierId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  packageDetails: z.string().max(500).optional(),
  scheduledDate: z.string().datetime().optional(),
  priority: z.nativeEnum(Priority).default(Priority.NORMAL),
});

export const updateDeliverySchema = z.object({
  customerId: z.string().uuid().optional(),
  courierId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(DeliveryStatus).optional(),
  description: z.string().max(500).optional(),
  packageDetails: z.string().max(500).optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
});

export const assignDeliverySchema = z.object({
  courierId: z.string().uuid(),
});

export const completeDeliverySchema = z.object({
  photoUrl: z.string().min(1),
  signatureUrl: z.string().min(1),
  videoUrl: z.string().min(1).optional(),
  deliveryLat: z.number().min(-90).max(90),
  deliveryLng: z.number().min(-180).max(180),
  deliveryNotes: z.string().max(500).optional(),
  extraPhotoUrls: z.array(z.string().min(1)).optional(),
  rating: z.number().int().min(1).max(10),
});

// Location schemas
export const locationBatchSchema = z.object({
  locations: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    speed: z.number().optional(),
    battery: z.number().min(0).max(100).optional(),
    recordedAt: z.string().datetime().optional(),
  })),
});

// Sync schema
export const syncSchema = z.object({
  deliveries: z.array(z.object({
    localId: z.string(),
    serverId: z.string().uuid().optional(),
    status: z.nativeEnum(DeliveryStatus),
    photoUrl: z.string().min(1).optional(),
    signatureUrl: z.string().min(1).optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    deliveredAt: z.string().datetime().optional(),
    deliveryNotes: z.string().optional(),
  })),
  locations: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    speed: z.number().optional(),
    battery: z.number().optional(),
    recordedAt: z.string().datetime().optional(),
  })).optional(),
});

// Query params schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const deliveryFiltersSchema = z.object({
  status: z.nativeEnum(DeliveryStatus).optional(),
  courierId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  priority: z.nativeEnum(Priority).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  search: z.string().optional(),
});
