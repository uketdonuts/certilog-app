import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../config/database.js';
import { sendPushNotification } from '../config/firebase.js';
import {
  createDeliverySchema,
  updateDeliverySchema,
  assignDeliverySchema,
  completeDeliverySchema,
  paginationSchema,
  deliveryFiltersSchema,
  syncSchema,
  rescheduleDeliverySchema,
  cancelDeliverySchema,
  addDeliveryProductsSchema,
  updateDeliveryProductSchema,
} from '../utils/validation.js';
import { AuthRequest } from '../middleware/auth.js';
import { DeliveryStatus, Role } from '@prisma/client';

// Ensure lat/lng are plain numbers in JSON responses (Prisma Decimal may serialize as string/object)
function normalizeDeliveryLatLng<T extends Record<string, any>>(obj: T | null) {
  if (!obj) return obj;
  return {
    ...obj,
    deliveryLat: obj.deliveryLat == null ? null : Number((obj.deliveryLat as any)),
    deliveryLng: obj.deliveryLng == null ? null : Number((obj.deliveryLng as any)),
  } as T;
}

function normalizeRoutePoint(p: any) {
  return {
    id: p.id,
    lat: Number(p.latitude),
    lng: Number(p.longitude),
    accuracy: p.accuracy == null ? null : Number(p.accuracy),
    speed: p.speed == null ? null : Number(p.speed),
    batteryLevel: p.batteryLevel ?? null,
    recordedAt: p.recordedAt,
  };
}

export async function getDeliveries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const filters = deliveryFiltersSchema.parse(req.query);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.courierId) where.courierId = filters.courierId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.priority) where.priority = filters.priority;

    if (filters.fromDate || filters.toDate) {
      where.scheduledDate = {};
      if (filters.fromDate) (where.scheduledDate as Record<string, Date>).gte = new Date(filters.fromDate);
      if (filters.toDate) (where.scheduledDate as Record<string, Date>).lte = new Date(filters.toDate);
    }

    // Filter by creation date
    if (filters.createdAtFrom || filters.createdAtTo) {
      where.createdAt = {};
      if (filters.createdAtFrom) (where.createdAt as Record<string, Date>).gte = new Date(filters.createdAtFrom);
      if (filters.createdAtTo) (where.createdAt as Record<string, Date>).lte = new Date(filters.createdAtTo);
    }

    if (filters.search) {
      where.OR = [
        { trackingCode: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { address: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          courier: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          photos: true,
          products: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    const normalized = deliveries.map((d) => normalizeDeliveryLatLng(d));

    res.json({
      success: true,
      data: {
        data: normalized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getMyDeliveries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const courierId = req.user!.userId;
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const statusFilter = req.query.status as DeliveryStatus | undefined;

    const where = {
      courierId,
      ...(statusFilter && { status: statusFilter }),
    };

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          photos: true,
          products: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    const normalized = deliveries.map((d) => normalizeDeliveryLatLng(d));

    res.json({
      success: true,
      data: {
        data: normalized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get my deliveries error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getDeliveryById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        photos: true,
        products: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers can only see their own deliveries
    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para ver esta entrega' });
      return;
    }

    res.json({ success: true, data: normalizeDeliveryLatLng(delivery) });
  } catch (error) {
    console.error('Get delivery by id error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getDeliveryRoute(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      select: { id: true, courierId: true, status: true },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para ver la ruta de esta entrega' });
      return;
    }

    // Only allow route access when delivery is in-transit or delivered (otherwise route is not meaningful)
    if (delivery.status !== DeliveryStatus.IN_TRANSIT && delivery.status !== DeliveryStatus.DELIVERED) {
      res.status(400).json({ success: false, error: 'Ruta no disponible hasta que la entrega esté en tránsito o entregada' });
      return;
    }

    const limitRaw = req.query.limit ? Number(req.query.limit) : 5000;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10000) : 5000;

    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      res.status(400).json({ success: false, error: 'fromDate inválido' });
      return;
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      res.status(400).json({ success: false, error: 'toDate inválido' });
      return;
    }

    const points = await prisma.deliveryRoutePoint.findMany({
      where: {
        deliveryId: id,
        ...(fromDate || toDate
          ? {
              recordedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      take: limit,
      orderBy: { recordedAt: 'asc' },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        accuracy: true,
        speed: true,
        batteryLevel: true,
        recordedAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        deliveryId: id,
        points: points.map(normalizeRoutePoint),
      },
    });
  } catch (error) {
    console.error('Get delivery route error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createDelivery(req: Request, res: Response): Promise<void> {
  try {
    const validation = createDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const data = validation.data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      res.status(400).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }

    // Verify courier exists if provided
    if (data.courierId) {
      const courier = await prisma.user.findUnique({
        where: { id: data.courierId, role: Role.COURIER, isActive: true },
      });

      if (!courier) {
        res.status(400).json({ success: false, error: 'Mensajero no encontrado o inactivo' });
        return;
      }

      // NOTE: we allow assigning multiple deliveries to a courier.
      // The restriction that a courier cannot have more than one delivery
      // IN_TRANSIT is enforced in `startDelivery` (they may only *start*
      // one at a time).
    }

    const delivery = await prisma.delivery.create({
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        status: data.courierId ? DeliveryStatus.ASSIGNED : DeliveryStatus.PENDING,
      },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            fcmToken: true,
          },
        },
      },
    });

    // Send push notification if assigned
    if (delivery.courier?.fcmToken) {
      await sendPushNotification(
        delivery.courier.fcmToken,
        '📦 Nueva entrega asignada',
        `Entrega para ${delivery.customer.name} - ${delivery.customer.address}`,
        { deliveryId: delivery.id, type: 'NEW_DELIVERY' }
      );
    }

    res.status(201).json({ success: true, data: normalizeDeliveryLatLng(delivery) });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
export async function updateDelivery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = updateDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const existingDelivery = await prisma.delivery.findUnique({ where: { id } });
    if (!existingDelivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers/helpers can only update their own deliveries
    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && existingDelivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta entrega' });
      return;
    }

    const data = validation.data;

    const updated = await prisma.delivery.update({
      where: { id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : data.scheduledDate,
      },
      include: {
        customer: true,
        courier: {
          select: { id: true, fullName: true, phone: true },
        },
        photos: true,
      },
    });

    res.json({ success: true, data: normalizeDeliveryLatLng(updated) });
  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function assignDelivery(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = assignDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { courierId } = validation.data;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    if (delivery.status === DeliveryStatus.DELIVERED) {
      res.status(400).json({ success: false, error: 'La entrega ya fue completada' });
      return;
    }

    const courier = await prisma.user.findUnique({
      where: { id: courierId, role: Role.COURIER, isActive: true },
    });

    if (!courier) {
      res.status(400).json({ success: false, error: 'Mensajero no encontrado o inactivo' });
      return;
    }

    // Allow assigning multiple deliveries. The courier may have several
    // ASSIGNED deliveries, but they are only allowed to transition one
    // to IN_TRANSIT at a time (this is checked in `startDelivery`).

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        courierId,
        status: DeliveryStatus.ASSIGNED,
      },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            fcmToken: true,
          },
        },
      },
    });

    // Send push notification
    if (courier.fcmToken) {
      await sendPushNotification(
        courier.fcmToken,
        '📦 Nueva entrega asignada',
        `Entrega para ${updatedDelivery.customer.name} - ${updatedDelivery.customer.address}`,
        { deliveryId: updatedDelivery.id, type: 'NEW_DELIVERY' }
      );
    }

    res.json({ success: true, data: normalizeDeliveryLatLng(updatedDelivery) });
  } catch (error) {
    console.error('Assign delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function startDelivery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers can only start their own deliveries
    if (req.user!.role === Role.COURIER && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para iniciar esta entrega' });
      return;
    }

    if (delivery.status !== DeliveryStatus.ASSIGNED) {
      res.status(400).json({ success: false, error: 'Solo se pueden iniciar entregas asignadas' });
      return;
    }

    // Enforce: courier can only have 1 delivery IN_TRANSIT.
    if (delivery.courierId) {
      const inTransitOther = await prisma.delivery.findFirst({
        where: {
          courierId: delivery.courierId,
          status: DeliveryStatus.IN_TRANSIT,
          NOT: { id },
        },
        select: { id: true, trackingCode: true },
      });

      if (inTransitOther) {
        res.status(400).json({
          success: false,
          error: `Ya tienes una entrega en tránsito (${inTransitOther.trackingCode}). Completa esa entrega antes de iniciar otra.`,
        });
        return;
      }
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: DeliveryStatus.IN_TRANSIT,
      },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    res.json({ success: true, data: normalizeDeliveryLatLng(updatedDelivery) });
  } catch (error) {
    console.error('Start delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function completeDelivery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    console.log('Complete delivery request:', { id, body: req.body });

    const validation = completeDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      console.log('Complete delivery validation error:', validation.error.errors);
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers/helpers can only complete their own deliveries
    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para completar esta entrega' });
      return;
    }

    if (delivery.status === DeliveryStatus.DELIVERED) {
      res.status(400).json({ success: false, error: 'La entrega ya fue completada' });
      return;
    }

    const data = validation.data;

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: DeliveryStatus.DELIVERED,
        photoUrl: data.photoUrl,
        signatureUrl: data.signatureUrl,
        videoUrl: data.videoUrl,
        deliveryLat: data.deliveryLat,
        deliveryLng: data.deliveryLng,
        deliveryNotes: data.deliveryNotes,
        rating: data.rating,
        deliveredAt: new Date(),
        syncedAt: new Date(),
      },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        photos: true,
      },
    });

    // Save extra photos (if any) to DeliveryPhoto
    if (data.extraPhotoUrls && Array.isArray(data.extraPhotoUrls) && data.extraPhotoUrls.length > 0) {
      const photoRecords = data.extraPhotoUrls.map((url: string) => ({ deliveryId: id, url }));
      await prisma.deliveryPhoto.createMany({ data: photoRecords, skipDuplicates: true });
    }

    res.json({ success: true, data: normalizeDeliveryLatLng(updatedDelivery) });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteDelivery(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    if (delivery.status === DeliveryStatus.DELIVERED) {
      res.status(400).json({ success: false, error: 'No se puede eliminar una entrega completada' });
      return;
    }

    await prisma.delivery.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Entrega eliminada exitosamente' });
  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function syncDeliveries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = syncSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { deliveries, locations } = validation.data;
    const courierId = req.user!.userId;

    const results = {
      deliveriesUpdated: 0,
      locationsAdded: 0,
    };

    // Process delivery updates
    for (const item of deliveries) {
      if (item.serverId) {
        await prisma.delivery.update({
          where: { id: item.serverId, courierId },
          data: {
            status: item.status,
            photoUrl: item.photoUrl,
            signatureUrl: item.signatureUrl,
            deliveryLat: item.deliveryLat,
            deliveryLng: item.deliveryLng,
            deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : null,
            deliveryNotes: item.deliveryNotes,
            localId: item.localId,
            syncedAt: new Date(),
          },
        });
        results.deliveriesUpdated++;
      }
    }

    // Process location updates
    if (locations && locations.length > 0) {
      await prisma.courierLocation.createMany({
        data: locations.map((loc) => ({
          courierId,
          latitude: loc.lat,
          longitude: loc.lng,
          accuracy: loc.accuracy,
          speed: loc.speed,
          batteryLevel: loc.battery,
          recordedAt: loc.recordedAt ? new Date(loc.recordedAt) : new Date(),
        })),
      });

      // Best-effort: attach synced points to the currently in-transit delivery.
      const inTransitFromPayload = deliveries.find((d) => d.serverId && d.status === DeliveryStatus.IN_TRANSIT);
      const activeDeliveryId = inTransitFromPayload?.serverId
        ? inTransitFromPayload.serverId
        : (
            await prisma.delivery.findFirst({
              where: { courierId, status: DeliveryStatus.IN_TRANSIT },
              select: { id: true },
            })
          )?.id;

      if (activeDeliveryId) {
        await prisma.deliveryRoutePoint.createMany({
          data: locations.map((loc) => ({
            deliveryId: activeDeliveryId,
            courierId,
            latitude: loc.lat,
            longitude: loc.lng,
            accuracy: loc.accuracy,
            speed: loc.speed,
            batteryLevel: loc.battery,
            recordedAt: loc.recordedAt ? new Date(loc.recordedAt) : new Date(),
          })),
        });
      }

      results.locationsAdded = locations.length;
    }

    // Return updated deliveries (exclude cancelled for couriers)
    const updatedDeliveries = await prisma.delivery.findMany({
      where: {
        courierId,
        status: {
          in: [DeliveryStatus.ASSIGNED, DeliveryStatus.IN_TRANSIT],
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    const normalized = updatedDeliveries.map((d) => normalizeDeliveryLatLng(d));

    res.json({
      success: true,
      data: {
        ...results,
        deliveries: normalized,
      },
    });
  } catch (error) {
    console.error('Sync deliveries error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getDeliveryStats(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, pending, assigned, inTransit, delivered, failed, cancelled, todayDelivered] = await Promise.all([
      prisma.delivery.count(),
      prisma.delivery.count({ where: { status: DeliveryStatus.PENDING } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.ASSIGNED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.IN_TRANSIT } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.DELIVERED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.FAILED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.CANCELLED } }),
      prisma.delivery.count({
        where: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: { gte: today },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        assigned,
        inTransit,
        delivered,
        failed,
        cancelled,
        todayDelivered,
      },
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function exportDeliveries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filters = deliveryFiltersSchema.parse(req.query);

    // Build where clause (same as getDeliveries)
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.courierId) where.courierId = filters.courierId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.priority) where.priority = filters.priority;

    if (filters.fromDate || filters.toDate) {
      where.scheduledDate = {};
      if (filters.fromDate) (where.scheduledDate as Record<string, Date>).gte = new Date(filters.fromDate);
      if (filters.toDate) (where.scheduledDate as Record<string, Date>).lte = new Date(filters.toDate);
    }

    if (filters.createdAtFrom || filters.createdAtTo) {
      where.createdAt = {};
      if (filters.createdAtFrom) (where.createdAt as Record<string, Date>).gte = new Date(filters.createdAtFrom);
      if (filters.createdAtTo) (where.createdAt as Record<string, Date>).lte = new Date(filters.createdAtTo);
    }

    if (filters.search) {
      where.OR = [
        { trackingCode: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { address: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Get all deliveries (no pagination for export)
    const deliveries = await prisma.delivery.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            cedula: true,
            address: true,
          },
        },
        courier: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    });

    // Format data for Excel
    const excelData = deliveries.map((d) => ({
      'Código': d.trackingCode,
      'Estado': d.status,
      'Prioridad': d.priority,
      'Cliente': d.customer.name,
      'Cédula': d.customer.cedula || '',
      'Teléfono Cliente': d.customer.phone,
      'Dirección': d.customer.address,
      'Mensajero': d.courier?.fullName || 'Sin asignar',
      'Descripción': d.description || '',
      'Fecha Creación': d.createdAt.toISOString(),
      'Fecha Programada': d.scheduledDate?.toISOString() || '',
      'Fecha Entregada': d.deliveredAt?.toISOString() || '',
      'Reagendada': d.rescheduledCount > 0 ? `Sí (${d.rescheduledCount}x)` : 'No',
      'Motivo Reagendamiento': d.rescheduleReason || '',
      'Fecha Cancelación': d.cancelledAt?.toISOString() || '',
      'Motivo Cancelación': d.cancellationReason || '',
      'Notas': d.deliveryNotes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Código
      { wch: 12 }, // Estado
      { wch: 10 }, // Prioridad
      { wch: 25 }, // Cliente
      { wch: 15 }, // Cédula
      { wch: 15 }, // Teléfono
      { wch: 40 }, // Dirección
      { wch: 20 }, // Mensajero
      { wch: 30 }, // Descripción
      { wch: 20 }, // Fecha Creación
      { wch: 20 }, // Fecha Programada
      { wch: 20 }, // Fecha Entregada
      { wch: 15 }, // Reagendada
      { wch: 30 }, // Motivo Reagendamiento
      { wch: 20 }, // Fecha Cancelación
      { wch: 30 }, // Motivo Cancelación
      { wch: 30 }, // Notas
    ];

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=entregas_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export deliveries error:', error);
    res.status(500).json({ success: false, error: 'Error al exportar entregas' });
  }
}

export async function rescheduleDelivery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = rescheduleDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { scheduledDate, reason } = validation.data;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Cannot reschedule delivered or cancelled deliveries
    if (delivery.status === DeliveryStatus.DELIVERED) {
      res.status(400).json({ success: false, error: 'No se puede reagendar una entrega ya entregada' });
      return;
    }

    if (delivery.status === DeliveryStatus.CANCELLED) {
      res.status(400).json({ success: false, error: 'No se puede reagendar una entrega cancelada' });
      return;
    }

    // Couriers can only reschedule their own deliveries
    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para reagendar esta entrega' });
      return;
    }

    const newScheduledDate = new Date(scheduledDate);
    const previousDate = delivery.scheduledDate;

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        scheduledDate: newScheduledDate,
        rescheduledFrom: previousDate,
        rescheduledCount: { increment: 1 },
        rescheduleReason: reason || null,
        // If was in transit, reset to assigned
        status: delivery.status === DeliveryStatus.IN_TRANSIT ? DeliveryStatus.ASSIGNED : delivery.status,
      },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            fcmToken: true,
          },
        },
        photos: true,
      },
    });

    // Send push notification if assigned to a courier
    if (updatedDelivery.courier?.fcmToken) {
      const formattedDate = newScheduledDate.toLocaleDateString('es-ES', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      await sendPushNotification(
        updatedDelivery.courier.fcmToken,
        '📅 Entrega reagendada',
        `Entrega para ${updatedDelivery.customer.name} reagendada para ${formattedDate}`,
        { deliveryId: updatedDelivery.id, type: 'DELIVERY_RESCHEDULED' }
      );
    }

    res.json({ success: true, data: normalizeDeliveryLatLng(updatedDelivery) });
  } catch (error) {
    console.error('Reschedule delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function cancelDelivery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = cancelDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { reason } = validation.data;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Cannot cancel already delivered or cancelled deliveries
    if (delivery.status === DeliveryStatus.DELIVERED) {
      res.status(400).json({ success: false, error: 'No se puede cancelar una entrega ya entregada' });
      return;
    }

    if (delivery.status === DeliveryStatus.CANCELLED) {
      res.status(400).json({ success: false, error: 'La entrega ya está cancelada' });
      return;
    }

    // Only ADMIN and DISPATCHER can cancel (couriers cannot cancel)
    if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.DISPATCHER) {
      res.status(403).json({ success: false, error: 'Solo administradores y despachadores pueden cancelar entregas' });
      return;
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: DeliveryStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: req.user!.userId,
        cancellationReason: reason,
        courierId: null, // Unassign courier
      },
      include: {
        customer: true,
        courier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            fcmToken: true,
          },
        },
        photos: true,
      },
    });

    // Notify courier if assigned
    if (delivery.courier?.fcmToken) {
      await sendPushNotification(
        delivery.courier.fcmToken,
        '❌ Entrega cancelada',
        `La entrega para ${delivery.customer.name} ha sido cancelada`,
        { deliveryId: delivery.id, type: 'DELIVERY_CANCELLED' }
      );
    }

    res.json({ success: true, data: normalizeDeliveryLatLng(updatedDelivery) });
  } catch (error) {
    console.error('Cancel delivery error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}


// Delivery Products Controller Functions

export async function getDeliveryProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers can only see products for their own deliveries
    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para ver esta entrega' });
      return;
    }

    res.json({ success: true, data: delivery.products });
  } catch (error) {
    console.error('Get delivery products error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function addDeliveryProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = addDeliveryProductsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    const { products } = validation.data;

    // Create all products
    const createdProducts = await prisma.$transaction(
      products.map((product) =>
        prisma.deliveryProduct.create({
          data: {
            deliveryId: id as string,
            itemNumber: product.itemNumber,
            description: product.description,
            assemblyBy: product.assemblyBy,
            requiresAssembly: product.requiresAssembly || product.assemblyBy === 'TRANSPORTE',
          },
        })
      )
    );

    res.status(201).json({ success: true, data: createdProducts });
  } catch (error) {
    console.error('Add delivery products error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateDeliveryProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const productId = String(req.params.productId);

    const validation = updateDeliveryProductSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers can only update their own deliveries
    if ((req.user!.role === Role.COURIER || req.user!.role === Role.HELPER) && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta entrega' });
      return;
    }

    const product = await prisma.deliveryProduct.findFirst({
      where: { id: productId, deliveryId: id },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    const updatedProduct = await prisma.deliveryProduct.update({
      where: { id: productId },
      data: validation.data,
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Update delivery product error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteDeliveryProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const productId = String(req.params.productId);

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    const product = await prisma.deliveryProduct.findFirst({
      where: { id: productId, deliveryId: id },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    await prisma.deliveryProduct.delete({
      where: { id: productId as string },
    });

    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Delete delivery product error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateAllDeliveryProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = addDeliveryProductsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    const { products } = validation.data;

    // Delete existing products and create new ones in a transaction
    await prisma.$transaction([
      prisma.deliveryProduct.deleteMany({
        where: { deliveryId: id as string },
      }),
      ...products.map((product) =>
        prisma.deliveryProduct.create({
          data: {
            deliveryId: id as string,
            itemNumber: product.itemNumber,
            description: product.description,
            assemblyBy: product.assemblyBy,
            requiresAssembly: product.requiresAssembly || product.assemblyBy === 'TRANSPORTE',
          },
        })
      ),
    ]);

    // Return updated products
    const updatedProducts = await prisma.deliveryProduct.findMany({
      where: { deliveryId: id as string },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error('Update all delivery products error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
