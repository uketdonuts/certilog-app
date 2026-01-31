import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { updateUserSchema, updateFcmTokenSchema, paginationSchema } from '../utils/validation.js';
import { AuthRequest } from '../middleware/auth.js';

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: {
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        // Courier/Helper specific fields
        firstName: true,
        middleName: true,
        lastName: true,
        secondLastName: true,
        gender: true,
        birthDate: true,
        personalPhone: true,
        basePhone: true,
        emergencyPhone: true,
        licensePlate: true,
        insurancePolicy: true,
        insurerPhone: true,
        insurerName: true,
        nextWeightReview: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { password, pin, birthDate, nextWeightReview, ...data } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    // Dispatcher safety rules
    if (req.user?.role === 'DISPATCHER') {
      // Prevent tampering with admins
      if (existingUser.role === 'ADMIN') {
        res.status(403).json({ success: false, error: 'No tienes permiso para modificar este usuario' });
        return;
      }

      // Prevent role escalation to ADMIN
      if ((data as any).role === 'ADMIN') {
        res.status(403).json({ success: false, error: 'No tienes permiso para asignar rol ADMIN' });
        return;
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...data };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (pin) {
      updateData.pin = await bcrypt.hash(pin, 10);
    }

    // Handle date fields
    if (birthDate) {
      updateData.birthDate = new Date(birthDate);
    }
    if (nextWeightReview) {
      updateData.nextWeightReview = new Date(nextWeightReview);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        // Include new courier fields in response
        firstName: true,
        middleName: true,
        lastName: true,
        secondLastName: true,
        gender: true,
        birthDate: true,
        personalPhone: true,
        basePhone: true,
        emergencyPhone: true,
        licensePlate: true,
        insurancePolicy: true,
        insurerPhone: true,
        insurerName: true,
        nextWeightReview: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log for update
    try {
      await prisma.appLog.create({
        data: {
          level: 'INFO',
          message: `Usuario ${id} actualizado`,
          context: safeJson({ action: 'update', entityType: 'user', entityId: id, changes: updateData, actorId: req.user?.userId }),
          userId: req.user?.userId || null,
        },
      });
    } catch (e) {
      console.error('Error creating app log for user update:', e);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const permanent = req.query.permanent === 'true';

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    // Dispatcher safety rules
    if (req.user?.role === 'DISPATCHER') {
      // Cannot act on own account
      if (req.user.userId === id) {
        res.status(403).json({ success: false, error: 'No puedes desactivar tu propio usuario' });
        return;
      }

      // Dispatchers cannot manage administrators
      if (user.role === 'ADMIN') {
        res.status(403).json({ success: false, error: 'No tienes permiso para modificar administradores' });
        return;
      }

      // Dispatchers cannot permanently delete
      if (permanent) {
        res.status(403).json({ success: false, error: 'No tienes permiso para eliminar permanentemente' });
        return;
      }
    }

    if (permanent) {
      // Check for associated deliveries
      if (user._count.deliveries > 0) {
        res.status(400).json({
          success: false,
          error: `No se puede eliminar el usuario porque tiene ${user._count.deliveries} entrega(s) asociada(s). Reasigne las entregas primero.`,
        });
        return;
      }

      // Delete related data first
      await prisma.courierLocation.deleteMany({ where: { courierId: id } });
      await prisma.refreshToken.deleteMany({ where: { userId: id } });

      // Permanently delete user
      await prisma.user.delete({ where: { id } });

      // Log permanent deletion
      try {
        await prisma.appLog.create({
          data: {
            level: 'INFO',
            message: `Usuario ${id} eliminado permanentemente`,
            context: safeJson({ action: 'delete_permanent', entityType: 'user', entityId: id, actorId: req.user?.userId }),
            userId: req.user?.userId || null,
          },
        });
      } catch (e) {
        console.error('Error creating app log for user deletion:', e);
      }

      res.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } else {
      // Soft delete by setting isActive to false
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Log deactivation
      try {
        await prisma.appLog.create({
          data: {
            level: 'INFO',
            message: `Usuario ${id} desactivado`,
            context: safeJson({ action: 'deactivate', entityType: 'user', entityId: id, actorId: req.user?.userId }),
            userId: req.user?.userId || null,
          },
        });
      } catch (e) {
        console.error('Error creating app log for user deactivation:', e);
      }

      res.json({ success: true, message: 'Usuario desactivado exitosamente' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateFcmToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    // Users can only update their own FCM token (except admins)
    if (req.user!.userId !== id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'No tienes permiso para esta acción' });
      return;
    }

    const validation = updateFcmTokenSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { fcmToken } = validation.data;

    await prisma.user.update({
      where: { id },
      data: { fcmToken },
    });

    res.json({ success: true, message: 'FCM token actualizado' });
  } catch (error) {
    console.error('Update FCM token error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getCouriers(req: Request, res: Response): Promise<void> {
  try {
    const couriers = await prisma.user.findMany({
      where: {
        role: 'COURIER',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
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
      orderBy: { fullName: 'asc' },
    });

    res.json({ success: true, data: couriers });
  } catch (error) {
    console.error('Get couriers error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
