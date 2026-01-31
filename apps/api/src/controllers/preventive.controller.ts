import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createPreventiveSchema, updatePreventiveSchema } from '../utils/validation.js';

export async function listPreventives(req: Request, res: Response) {
  try {
    const items = await prisma.preventiveMaintenance.findMany({ orderBy: { scheduledAt: 'desc' } });
    res.json({ success: true, data: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createPreventive(req: Request, res: Response) {
  try {
    const validation = createPreventiveSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.preventiveMaintenance.create({ data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updatePreventive(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const validation = updatePreventiveSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.preventiveMaintenance.update({ where: { id }, data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
