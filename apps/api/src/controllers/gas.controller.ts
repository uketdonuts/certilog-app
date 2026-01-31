import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createGasReportSchema } from '../utils/validation.js';

export async function listGasReports(req: Request, res: Response) {
  try {
    const reports = await prisma.gasReport.findMany({ orderBy: { date: 'desc' } });
    res.json({ success: true, data: reports });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getGasReport(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const item = await prisma.gasReport.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: 'Reporte no encontrado' });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createGasReport(req: Request, res: Response) {
  try {
    const validation = createGasReportSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const report = await prisma.gasReport.create({ data: payload });
    res.json({ success: true, data: report });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteGasReport(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    await prisma.gasReport.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export default {};
