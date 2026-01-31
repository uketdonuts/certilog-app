import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createVehicleSchema, updateVehicleSchema } from '../utils/validation.js';

export async function listVehicles(req: Request, res: Response) {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: vehicles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getVehicle(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
    res.json({ success: true, data: vehicle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createVehicle(req: Request, res: Response) {
  try {
    const validation = createVehicleSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const vehicle = await prisma.vehicle.create({ data: payload });
    res.json({ success: true, data: vehicle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateVehicle(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const validation = updateVehicleSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const vehicle = await prisma.vehicle.update({ where: { id }, data: payload });
    res.json({ success: true, data: vehicle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteVehicle(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    // Delete dependent records in a single transaction to avoid FK constraint errors
    const tx = async () => {
      const deletedGas = await prisma.gasReport.deleteMany({ where: { vehicleId: id } });
      const deletedFleet = await prisma.fleetMaintenanceReport.deleteMany({ where: { vehicleId: id } });
      const deletedPreventive = await prisma.preventiveMaintenance.deleteMany({ where: { vehicleId: id } });
      const deletedRepairs = await prisma.repair.deleteMany({ where: { vehicleId: id } });
      const deletedTires = await prisma.tireSemaphore.deleteMany({ where: { vehicleId: id } });
      const deletedVehicle = await prisma.vehicle.delete({ where: { id } });
      return { deletedGas, deletedFleet, deletedPreventive, deletedRepairs, deletedTires, deletedVehicle };
    };

    const result = await prisma.$transaction(tx);
    console.info('vehicle delete transaction result', result);
    const deleted = result.deletedVehicle;
    if (!deleted) return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
