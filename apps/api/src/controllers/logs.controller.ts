import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { LogLevel, Prisma } from '@prisma/client';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

const createLogSchema = z.object({
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('ERROR'),
  message: z.string().min(1),
  stack: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  deviceInfo: z.record(z.unknown()).optional(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
});

export async function createLog(req: Request, res: Response): Promise<void> {
  try {
    const validation = createLogSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const data = validation.data;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId || null;

    const log = await prisma.appLog.create({
      data: {
        level: data.level as LogLevel,
        message: data.message,
        stack: data.stack,
        context: toPrismaJson(data.context),
        deviceInfo: toPrismaJson(data.deviceInfo),
        platform: data.platform,
        appVersion: data.appVersion,
        userId,
      },
    });

    // Log to console as well for debugging
    console.log(`[APP_LOG][${data.level}] ${data.message}`, {
      userId,
      platform: data.platform,
      context: data.context,
    });

    res.status(201).json({ success: true, data: { id: log.id } });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({ success: false, error: 'Error guardando log' });
  }
}

export async function getLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { level, userId, limit = '100', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (userId) where.userId = userId;

    const logs = await prisma.appLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.appLog.count({ where });

    res.json({
      success: true,
      data: {
        logs,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo logs' });
  }
}
