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
  // Courier/Helper specific fields
  firstName: z.string().max(100).optional(),
  middleName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  secondLastName: z.string().max(100).optional(),
  gender: z.enum(['M', 'F']).optional(),
  birthDate: z.string().datetime().optional(),
  personalPhone: z.string().max(20).optional(),
  basePhone: z.string().max(20).optional(),
  emergencyPhone: z.string().max(20).optional(),
  licensePlate: z.string().max(20).optional(),
  insurancePolicy: z.string().max(100).optional(),
  insurerPhone: z.string().max(20).optional(),
  insurerName: z.string().max(100).optional(),
  nextWeightReview: z.string().datetime().optional(),
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
  // Courier/Helper specific fields
  firstName: z.string().max(100).optional(),
  middleName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  secondLastName: z.string().max(100).optional(),
  gender: z.enum(['M', 'F']).optional(),
  birthDate: z.string().datetime().optional(),
  personalPhone: z.string().max(20).optional(),
  basePhone: z.string().max(20).optional(),
  emergencyPhone: z.string().max(20).optional(),
  licensePlate: z.string().max(20).optional(),
  insurancePolicy: z.string().max(100).optional(),
  insurerPhone: z.string().max(20).optional(),
  insurerName: z.string().max(100).optional(),
  nextWeightReview: z.string().datetime().optional(),
});

export const updateFcmTokenSchema = z.object({
  fcmToken: z.string(),
});

// Customer schemas
export const createCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  cedula: z.string().min(5).max(20).optional(), // Panama identification number
  email: z.string().email().optional(),
  address: z.string().min(5).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

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
  rating: z.number().int().min(0).max(10).optional(),
});

export const rescheduleDeliverySchema = z.object({
  scheduledDate: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export const cancelDeliverySchema = z.object({
  reason: z.string().min(1).max(500),
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
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
  search: z.string().optional(),
});

// Fleet / vehicle schemas
export const createVehicleSchema = z.object({
  licensePlate: z.string().min(1).max(20),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().optional(),
  vin: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  driverId: z.string().uuid().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// Gas report
export const createGasReportSchema = z.object({
  vehicleId: z.string().uuid(),
  reportedBy: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  liters: z.coerce.number().positive(),
  cost: z.coerce.number().optional(),
  odometer: z.coerce.number().int().optional(),
  fuelType: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// Attendance records (asistencia, ausencia, vacaciones, incapacidad, tardanza)
export const createAttendanceSchema = z.object({
  userId: z.string().uuid(),
  date: z.string().datetime(),
  type: z.enum(['ATTENDANCE', 'ABSENCE', 'VACATION', 'DISABILITY', 'TARDY']),
  minutesLate: z.coerce.number().int().optional(),
  reason: z.string().max(1000).optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  reportedBy: z.string().uuid().optional(),
  status: z.string().optional(),
});

export const updateAttendanceSchema = createAttendanceSchema.partial();

// Aliases for backward compatibility
export const createAbsenceSchema = createAttendanceSchema;
export const updateAbsenceSchema = updateAttendanceSchema;

// Fleet maintenance
export const createFleetMaintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  reportedBy: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  description: z.string().min(1).max(2000),
  severity: z.string().optional(),
  attachments: z.any().optional(),
  status: z.enum(['OPEN','IN_PROGRESS','CLOSED']).optional(),
});

export const updateFleetMaintenanceSchema = createFleetMaintenanceSchema.partial();

// Preventive maintenance
export const createPreventiveSchema = z.object({
  vehicleId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  performedAt: z.string().datetime().optional(),
  type: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updatePreventiveSchema = createPreventiveSchema.partial();

// Repair
export const createRepairSchema = z.object({
  vehicleId: z.string().uuid(),
  date: z.string().datetime().optional(),
  performedBy: z.string().uuid().optional(),
  description: z.string().min(1).max(2000),
  cost: z.coerce.number().optional(),
  attachments: z.any().optional(),
});

// Tire semaphore
export const createTireSemaphoreSchema = z.object({
  vehicleId: z.string().uuid(),
  inspectorId: z.string().uuid().optional(),
  frontLeft: z.enum(['GOOD','WARNING','REPLACE']).optional(),
  frontRight: z.enum(['GOOD','WARNING','REPLACE']).optional(),
  rearLeft: z.enum(['GOOD','WARNING','REPLACE']).optional(),
  rearRight: z.enum(['GOOD','WARNING','REPLACE']).optional(),
  notes: z.string().optional(),
  recordedAt: z.string().datetime().optional(),
});

// Delivery Product schemas
export const deliveryProductSchema = z.object({
  itemNumber: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  assemblyBy: z.string().max(100).optional(),
  requiresAssembly: z.boolean().default(false),
});

export const addDeliveryProductsSchema = z.object({
  products: z.array(deliveryProductSchema).min(1),
});

export const updateDeliveryProductSchema = z.object({
  isAssembled: z.boolean().optional(),
  photoUrl: z.string().optional(),
  photoPublicId: z.string().optional(),
});

