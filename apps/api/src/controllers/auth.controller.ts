import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { loginSchema, loginPinSchema, registerSchema } from '../utils/validation.js';
import { AuthRequest } from '../middleware/auth.js';
import { Role } from '@prisma/client';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { username, email, password } = validation.data;

    // Allow the `username` field to contain an email address (dashboard sends email in `username`).
    const emailSearch = email || (username && username.includes('@') ? username : undefined);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username || undefined },
          { email: emailSearch || undefined },
        ],
        isActive: true,
      },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken();

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function loginWithPin(req: Request, res: Response): Promise<void> {
  try {
    const validation = loginPinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const { pin } = validation.data;

    // Find user with matching PIN
    const users = await prisma.user.findMany({
      where: {
        pin: { not: null },
        isActive: true,
      },
    });

    let matchedUser = null;
    for (const user of users) {
      if (user.pin && await bcrypt.compare(pin, user.pin)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({ success: false, error: 'PIN inválido' });
      return;
    }

    const accessToken = generateAccessToken({ userId: matchedUser.id, role: matchedUser.role });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: matchedUser.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: matchedUser.id,
          fullName: matchedUser.fullName,
          phone: matchedUser.phone,
          role: matchedUser.role,
          isActive: matchedUser.isActive,
        },
      },
    });
  } catch (error) {
    console.error('Login with PIN error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Admins and dispatchers can register new users
    if (req.user?.role !== Role.ADMIN && req.user?.role !== Role.DISPATCHER) {
      res.status(403).json({ success: false, error: 'Solo administradores o dispatchers pueden registrar usuarios' });
      return;
    }

    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error.errors[0].message });
      return;
    }

    const {
      email, username, password, pin, fullName, phone, role,
      // Courier/Helper specific fields
      firstName, middleName, lastName, secondLastName,
      gender, birthDate, personalPhone, basePhone, emergencyPhone,
      licensePlate, insurancePolicy, insurerPhone, insurerName, nextWeightReview,
    } = validation.data;

    // Dispatchers cannot create ADMIN users
    if (req.user?.role === Role.DISPATCHER && role === Role.ADMIN) {
      res.status(403).json({ success: false, error: 'No tienes permiso para crear usuarios ADMIN' });
      return;
    }

    // Check if email or username already exists
    if (email || username) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email || undefined },
            { username: username || undefined },
          ],
        },
      });

      if (existing) {
        res.status(400).json({ success: false, error: 'El email o username ya está registrado' });
        return;
      }
    }

    // Hash password and/or PIN
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        pin: pinHash,
        fullName,
        phone,
        role,
        // Courier/Helper specific fields
        firstName,
        middleName,
        lastName,
        secondLastName,
        gender,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        personalPhone,
        basePhone,
        emergencyPhone,
        licensePlate,
        insurancePolicy,
        insurerPhone,
        insurerName,
        nextWeightReview: nextWeightReview ? new Date(nextWeightReview) : undefined,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Refresh token requerido' });
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(401).json({ success: false, error: 'Refresh token inválido o expirado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Usuario no encontrado o inactivo' });
      return;
    }

    // Delete old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await prisma.refreshToken.deleteMany({
        where: { token },
      });
    }

    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
