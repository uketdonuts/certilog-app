import { Request, Response } from 'express';
import prisma from '../config/database.js';

/**
 * Public tracking endpoint - no authentication required
 * Returns limited delivery info for public tracking page
 */
export async function getPublicTracking(req: Request, res: Response): Promise<void> {
  try {
    const tokenParam = req.params.token;
    if (!tokenParam || Array.isArray(tokenParam)) {
      res.status(400).json({ success: false, error: 'Token requerido' });
      return;
    }
    const token = tokenParam;

    const delivery = await prisma.delivery.findUnique({
      where: { publicTrackingToken: token },
      select: {
        id: true,
        trackingCode: true,
        status: true,
        priority: true,
        createdAt: true,
        deliveredAt: true,
        customer: {
          select: {
            // Only return partial address for privacy (zone/sector, not full address)
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        courier: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Mask the full address - only show general area
    const maskedAddress = maskAddress(delivery.customer?.address ?? '');

    res.json({
      success: true,
      data: {
        trackingCode: delivery.trackingCode,
        status: delivery.status,
        priority: delivery.priority,
        createdAt: delivery.createdAt,
        deliveredAt: delivery.deliveredAt,
        // Only show partial address
        zone: maskedAddress,
        // Only show destination coordinates if delivery is in progress or completed
        destinationLat: delivery.status !== 'PENDING' ? delivery.customer?.latitude ?? null : null,
        destinationLng: delivery.status !== 'PENDING' ? delivery.customer?.longitude ?? null : null,
        // Courier name (first name only for privacy)
        courierName: delivery.courier?.fullName
          ? delivery.courier.fullName.split(' ')[0]
          : null,
      },
    });
  } catch (error) {
    console.error('Get public tracking error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

/**
 * Get courier's real-time location for public tracking
 * Only returns location if delivery is IN_TRANSIT
 */
export async function getPublicCourierLocation(req: Request, res: Response): Promise<void> {
  try {
    const tokenParam = req.params.token;
    if (!tokenParam || Array.isArray(tokenParam)) {
      res.status(400).json({ success: false, error: 'Token requerido' });
      return;
    }
    const token = tokenParam;

    const delivery = await prisma.delivery.findUnique({
      where: { publicTrackingToken: token },
      select: {
        id: true,
        status: true,
        courierId: true,
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Only show courier location if delivery is in transit
    if (delivery.status !== 'IN_TRANSIT' || !delivery.courierId) {
      res.json({
        success: true,
        data: {
          available: false,
          message: delivery.status === 'DELIVERED'
            ? 'Entrega completada'
            : delivery.status === 'IN_TRANSIT'
              ? 'Ubicación no disponible'
              : 'El mensajero aún no ha iniciado el recorrido',
        },
      });
      return;
    }

    // Get the most recent location from courier's current deliveries route
    const latestPoint = await prisma.deliveryRoutePoint.findFirst({
      where: { deliveryId: delivery.id },
      orderBy: { recordedAt: 'desc' },
      select: {
        latitude: true,
        longitude: true,
        recordedAt: true,
      },
    });

    if (!latestPoint) {
      res.json({
        success: true,
        data: {
          available: false,
          message: 'Ubicación no disponible aún',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        available: true,
        lat: latestPoint.latitude,
        lng: latestPoint.longitude,
        updatedAt: latestPoint.recordedAt,
      },
    });
  } catch (error) {
    console.error('Get public courier location error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

/**
 * Get route points for public tracking (limited)
 */
export async function getPublicRoutePoints(req: Request, res: Response): Promise<void> {
  try {
    const tokenParam = req.params.token;
    if (!tokenParam || Array.isArray(tokenParam)) {
      res.status(400).json({ success: false, error: 'Token requerido' });
      return;
    }
    const token = tokenParam;

    const delivery = await prisma.delivery.findUnique({
      where: { publicTrackingToken: token },
      select: {
        id: true,
        status: true,
      },
    });

    if (!delivery) {
      res.status(404).json({ success: false, error: 'Entrega no encontrada' });
      return;
    }

    // Only show route if delivery is in transit or delivered
    if (delivery.status !== 'IN_TRANSIT' && delivery.status !== 'DELIVERED') {
      res.json({
        success: true,
        data: { points: [] },
      });
      return;
    }

    // Get route points (simplified - every 5th point to reduce data)
    const allPoints = await prisma.deliveryRoutePoint.findMany({
      where: { deliveryId: delivery.id },
      orderBy: { recordedAt: 'asc' },
      select: {
        latitude: true,
        longitude: true,
        recordedAt: true,
      },
    });

    // Return every 5th point to reduce data sent to client
    const simplifiedPoints = allPoints.filter((_, i) => i % 5 === 0 || i === allPoints.length - 1);

    res.json({
      success: true,
      data: {
        points: simplifiedPoints.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          recordedAt: p.recordedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get public route points error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

/**
 * Mask address to only show general zone/sector
 * E.g., "Calle 50, Edificio Global Bank, Apt 12-B, Panama City" -> "Zona: Panama City"
 */
function maskAddress(fullAddress?: string): string {
  // Common Panama areas/sectors to detect
  const knownAreas = [
    'Panama City', 'Ciudad de Panamá', 'San Miguelito', 'Tocumen',
    'Juan Díaz', 'Parque Lefevre', 'Bethania', 'Bella Vista',
    'El Cangrejo', 'Obarrio', 'San Francisco', 'Costa del Este',
    'Punta Pacífica', 'Marbella', 'Calidonia', 'Santa Ana',
    'El Chorrillo', 'Curundú', 'Ancón', 'Clayton', 'La Chorrera',
    'Arraiján', 'Colón', 'David', 'Santiago', 'Chitré',
    'Las Tablas', 'Penonomé', 'Aguadulce', 'Bocas del Toro',
  ];

  if (!fullAddress || fullAddress.trim().length === 0) return 'Zona: Desconocida';

  // Try to find a known area in the address
  for (const area of knownAreas) {
    if (fullAddress.toLowerCase().includes(area.toLowerCase())) {
      return `Zona: ${area}`;
    }
  }

  // If no known area found, extract last part after comma (usually city/area)
  const parts = fullAddress.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    return `Zona: ${parts[parts.length - 1]}`;
  }

  // Fallback: show "Panama" as generic zone
  return 'Zona: Panamá';
}
