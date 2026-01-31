import { Request, Response } from 'express';
import prisma from '../config/database.js';

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}
import { createCustomerSchema, updateCustomerSchema, paginationSchema } from '../utils/validation.js';

export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      console.warn('Invalid pagination params, falling back to defaults', parsed.error.errors);
    }
    const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 };
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        data: customers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        deliveries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            trackingCode: true,
            status: true,
            deliveredAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer by id error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    const validation = createCustomerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const customer = await prisma.customer.create({
      data: validation.data,
    });

    // Log creation
    try {
      await prisma.appLog.create({
        data: {
          level: 'INFO',
          message: `Cliente ${customer.id} creado`,
          context: safeJson({ action: 'create', entityType: 'customer', entityId: customer.id }),
          userId: null,
        },
      });
    } catch (e) {
      console.error('Error creating app log for customer creation:', e);
    }

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = updateCustomerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: validation.data,
    });

    // Log update
    try {
      await prisma.appLog.create({
        data: {
          level: 'INFO',
          message: `Cliente ${id} actualizado`,
          context: safeJson({ action: 'update', entityType: 'customer', entityId: id, changes: validation.data }),
          userId: null,
        },
      });
    } catch (e) {
      console.error('Error creating app log for customer update:', e);
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const permanent = req.query.permanent === 'true';

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      return;
    }

    if (permanent) {
      // Check if customer has deliveries for permanent deletion
      if (customer._count.deliveries > 0) {
        res.status(400).json({
          success: false,
          error: 'No se puede eliminar permanentemente un cliente con entregas asociadas',
        });
        return;
      }

      await prisma.customer.delete({
        where: { id },
      });

      // Log permanent deletion
      try {
        await prisma.appLog.create({
          data: {
            level: 'INFO',
            message: `Cliente ${id} eliminado permanentemente`,
            context: safeJson({ action: 'delete_permanent', entityType: 'customer', entityId: id }),
            userId: null,
          },
        });
      } catch (e) {
        console.error('Error creating app log for customer deletion:', e);
      }

      res.json({ success: true, message: 'Cliente eliminado permanentemente' });
    } else {
      // Soft delete - just deactivate
      await prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });

      // Log deactivation
      try {
        await prisma.appLog.create({
          data: {
            level: 'INFO',
            message: `Cliente ${id} desactivado`,
            context: safeJson({ action: 'deactivate', entityType: 'customer', entityId: id }),
            userId: null,
          },
        });
      } catch (e) {
        console.error('Error creating app log for customer deactivation:', e);
      }

      res.json({ success: true, message: 'Cliente desactivado exitosamente' });
    }
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
