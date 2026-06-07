import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@oneplace/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { env } from '../config/env';
import { Conflict, NotFound } from '../utils/errors';
import { PasswordResetService } from '../services/password-reset.service';

export const usersRoutes = Router();

usersRoutes.use(requireAuth);

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(['TENANT_ADMIN', 'MANAGER', 'COUNSELOR', 'VIEWER']),
  password: z.string().min(8).max(128),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(['TENANT_ADMIN', 'MANAGER', 'COUNSELOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

usersRoutes.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.auth!.tid },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

usersRoutes.post(
  '/',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: createUserSchema }),
  async (req, res, next) => {
    try {
      const existing = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: req.auth!.tid, email: req.body.email.toLowerCase() } },
      });
      if (existing) throw Conflict('A user with this email already exists in your workspace');

      const passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          tenantId: req.auth!.tid,
          email: req.body.email.toLowerCase(),
          name: req.body.name,
          phone: req.body.phone,
          role: req.body.role,
          passwordHash,
        },
        select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
      });
      res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  },
);

usersRoutes.patch(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: updateUserSchema }),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!user) throw NotFound('User not found');
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: req.body,
        select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

const setPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

/** Admin: email a reset link to a teammate + get a shareable link (WhatsApp-able). */
usersRoutes.post(
  '/:id/send-reset',
  requireRole('TENANT_ADMIN'),
  async (req, res, next) => {
    try {
      const result = await PasswordResetService.adminSendReset(
        req.auth!.tid,
        req.params.id!,
        req.auth!.sub,
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

/** Admin: directly set a new password for a teammate. */
usersRoutes.post(
  '/:id/set-password',
  requireRole('TENANT_ADMIN'),
  validate({ body: setPasswordSchema }),
  async (req, res, next) => {
    try {
      await PasswordResetService.adminSetPassword(req.auth!.tid, req.params.id!, req.body.password);
      res.json({ ok: true, message: 'Password updated for this user.' });
    } catch (e) {
      next(e);
    }
  },
);
