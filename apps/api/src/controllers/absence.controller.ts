import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { createAttendanceSchema, updateAttendanceSchema } from '../utils/validation.js';

export async function listAttendance(req: Request, res: Response) {
  try {
    const items = await prisma.attendanceRecord.findMany({
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
        reporter: { select: { id: true, fullName: true } },
      },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getAttendance(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const item = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
        reporter: { select: { id: true, fullName: true } },
      },
    });
    if (!item) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function createAttendance(req: Request, res: Response) {
  try {
    const validation = createAttendanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.attendanceRecord.create({ data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateAttendance(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const validation = updateAttendanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }
    const payload = validation.data;
    const item = await prisma.attendanceRecord.update({ where: { id }, data: payload });
    res.json({ success: true, data: item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteAttendance(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    await prisma.attendanceRecord.delete({ where: { id } });
    res.json({ success: true, message: 'Registro eliminado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

// Aliases for backward compatibility with old route names
export const listAbsences = listAttendance;
export const getAbsence = getAttendance;
export const createAbsence = createAttendance;
export const updateAbsence = updateAttendance;
export const deleteAbsence = deleteAttendance;

export default {};
