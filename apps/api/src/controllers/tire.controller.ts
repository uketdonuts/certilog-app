import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createTireSemaphoreSchema } from '../utils/validation.js';

export async function listTireSemaphores(req: Request, res: Response) {
  try {
    const items = await prisma.tireSemaphore.findMany({ orderBy: { recordedAt: 'desc' } });
    res.json({ success: true, data: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createTireSemaphore(req: Request, res: Response) {
  try {
    const validation = createTireSemaphoreSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.tireSemaphore.create({ data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
