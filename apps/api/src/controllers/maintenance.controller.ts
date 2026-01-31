import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createFleetMaintenanceSchema, updateFleetMaintenanceSchema } from '../utils/validation.js';

export async function listFleetMaintenance(req: Request, res: Response) {
  try {
    const items = await prisma.fleetMaintenanceReport.findMany({ orderBy: { date: 'desc' } });
    res.json({ success: true, data: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getFleetMaintenance(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const item = await prisma.fleetMaintenanceReport.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createFleetMaintenance(req: Request, res: Response) {
  try {
    const validation = createFleetMaintenanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.fleetMaintenanceReport.create({ data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateFleetMaintenance(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const validation = updateFleetMaintenanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.fleetMaintenanceReport.update({ where: { id }, data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
