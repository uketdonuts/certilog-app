import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { locationBatchSchema, paginationSchema } from '../utils/validation.js';
import { AuthRequest } from '../middleware/auth.js';

export async function addLocationBatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const validation = locationBatchSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { locations } = validation.data;
    const courierId = req.user!.userId;

    // If courier has exactly one IN_TRANSIT delivery, attach route points to it.
    // (We enforce 1 active delivery elsewhere, but keep this robust.)
    const activeDelivery = await prisma.delivery.findFirst({
      where: { courierId, status: 'IN_TRANSIT' },
      select: { id: true },
    });

    if (locations.length === 0) {
      res.json({ success: true, data: { added: 0 } });
      return;
    }

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

    if (activeDelivery) {
      await prisma.deliveryRoutePoint.createMany({
        data: locations.map((loc) => ({
          deliveryId: activeDelivery.id,
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

    res.json({ success: true, data: { added: locations.length, deliveryId: activeDelivery?.id ?? null } });
  } catch (error) {
    console.error('Add location batch error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getCouriersLocations(req: Request, res: Response): Promise<void> {
  try {
    // Get the latest location for each active courier
    const couriers = await prisma.user.findMany({
      where: {
        role: 'COURIER',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        locations: {
          take: 1,
          orderBy: { recordedAt: 'desc' },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            accuracy: true,
            speed: true,
            batteryLevel: true,
            recordedAt: true,
          },
        },
        _count: {
          select: {
            deliveries: {
              where: {
                status: {
                  in: ['ASSIGNED', 'IN_TRANSIT'],
                },
              },
            },
          },
        },
      },
    });

    // Transform data
    const result = couriers
      .filter((c) => c.locations.length > 0)
      .map((c) => ({
        courierId: c.id,
        fullName: c.fullName,
        phone: c.phone,
        activeDeliveries: c._count.deliveries,
        location: c.locations[0]
          ? {
              lat: Number(c.locations[0].latitude),
              lng: Number(c.locations[0].longitude),
              accuracy: c.locations[0].accuracy ? Number(c.locations[0].accuracy) : null,
              speed: c.locations[0].speed ? Number(c.locations[0].speed) : null,
              batteryLevel: c.locations[0].batteryLevel,
              recordedAt: c.locations[0].recordedAt,
            }
          : null,
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get couriers locations error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getCourierLocationHistory(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    // Get date range from query params (defaults to today)
    const fromDate = req.query.fromDate
      ? new Date(req.query.fromDate as string)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = req.query.toDate
      ? new Date(req.query.toDate as string)
      : new Date();

    const [locations, total] = await Promise.all([
      prisma.courierLocation.findMany({
        where: {
          courierId: id,
          recordedAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        skip,
        take: limit,
        orderBy: { recordedAt: 'desc' },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          accuracy: true,
          speed: true,
          batteryLevel: true,
          recordedAt: true,
        },
      }),
      prisma.courierLocation.count({
        where: {
          courierId: id,
          recordedAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      }),
    ]);

    // Transform locations
    const transformedLocations = locations.map((loc) => ({
      id: loc.id,
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      accuracy: loc.accuracy ? Number(loc.accuracy) : null,
      speed: loc.speed ? Number(loc.speed) : null,
      batteryLevel: loc.batteryLevel,
      recordedAt: loc.recordedAt,
    }));

    res.json({
      success: true,
      data: {
        data: transformedLocations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get courier location history error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
