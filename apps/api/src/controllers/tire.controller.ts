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

export async function getTireSemaphore(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const item = await prisma.tireSemaphore.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateTireSemaphore(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const validation = createTireSemaphoreSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.tireSemaphore.update({ where: { id }, data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteTireSemaphore(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    await prisma.tireSemaphore.delete({ where: { id } });
    res.json({ success: true, message: 'Eliminado exitosamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
