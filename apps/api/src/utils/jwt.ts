import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  role: Role;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiry(): Date {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const match = expiresIn.match(/^(\d+)([dhms])$/);

  if (!match) {
    // Default to 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let ms: number;
  switch (unit) {
    case 'd':
      ms = value * 24 * 60 * 60 * 1000;
      break;
    case 'h':
      ms = value * 60 * 60 * 1000;
      break;
    case 'm':
      ms = value * 60 * 1000;
      break;
    case 's':
      ms = value * 1000;
      break;
    default:
      ms = 7 * 24 * 60 * 60 * 1000;
  }

  return new Date(Date.now() + ms);
}
