import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createRepairSchema } from '../utils/validation.js';

export async function listRepairs(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.repair.findMany({
        include: { vehicle: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.repair.count(),
    ]);

    res.json({
      success: true,
      data: {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createRepair(req: Request, res: Response) {
  try {
    // Map performedAt to date if provided
    const body = { ...req.body };
    if (body.performedAt) {
      body.date = body.performedAt;
      delete body.performedAt;
    }

    const validation = createRepairSchema.safeParse(body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.repair.create({
      data: payload,
      include: { vehicle: true },
    });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateRepair(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { vehicleId, description, cost, performedAt } = req.body;

    const item = await prisma.repair.update({
      where: { id },
      data: {
        ...(vehicleId && { vehicleId }),
        ...(description !== undefined && { description }),
        ...(cost !== undefined && { cost }),
        ...(performedAt && { date: new Date(performedAt) }),
      },
      include: { vehicle: true },
    });

    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteRepair(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.repair.delete({ where: { id } });
    res.json({ success: true, message: 'Reparación eliminada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
