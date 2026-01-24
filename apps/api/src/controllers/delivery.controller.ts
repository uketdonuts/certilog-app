import { Request, Response } from 'express';
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
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Couriers can only see their own deliveries
    if (req.user!.role === Role.COURIER && delivery.courierId !== req.user!.userId) {
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
      select: { id: true, courierId: true },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    if (req.user!.role === Role.COURIER && delivery.courierId !== req.user!.userId) {
      res.status(403).json({ success: false, error: 'No tienes permiso para ver la ruta de esta entrega' });
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

      // Enforce: 1 active delivery (ASSIGNED/IN_TRANSIT) per courier.
      const activeCount = await prisma.delivery.count({
        where: {
          courierId: data.courierId,
          status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.IN_TRANSIT] },
        },
      });

      if (activeCount > 0) {
        res.status(400).json({
          success: false,
          error: 'El mensajero ya tiene una entrega activa. Solo se permite 1 a la vez.',
        });
        return;
      }
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

export async function updateDelivery(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = updateDeliverySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const existingDelivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!existingDelivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    const data = validation.data;

    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : data.scheduledDate,
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

    res.json({ success: true, data: normalizeDeliveryLatLng(delivery) });
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

    // Enforce: 1 active delivery (ASSIGNED/IN_TRANSIT) per courier.
    // This prevents assigning multiple deliveries at the same time.
    const activeOther = await prisma.delivery.findFirst({
      where: {
        courierId,
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.IN_TRANSIT] },
        NOT: { id },
      },
      select: { id: true, trackingCode: true, status: true },
    });

    if (activeOther) {
      res.status(400).json({
        success: false,
        error: `El mensajero ya tiene una entrega activa (${activeOther.trackingCode}). Solo se permite 1 a la vez.`,
      });
      return;
    }

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

    // Couriers can only complete their own deliveries
    if (req.user!.role === Role.COURIER && delivery.courierId !== req.user!.userId) {
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

    // Return updated deliveries
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

    const [total, pending, assigned, inTransit, delivered, failed, todayDelivered] = await Promise.all([
      prisma.delivery.count(),
      prisma.delivery.count({ where: { status: DeliveryStatus.PENDING } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.ASSIGNED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.IN_TRANSIT } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.DELIVERED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.FAILED } }),
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
        todayDelivered,
      },
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
