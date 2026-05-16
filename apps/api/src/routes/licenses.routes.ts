import { Router } from 'express';
import { z } from 'zod';
import { LicenseService } from '../services/license.service';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const licensesRoutes = Router();

// Public: validate a license code at signup (no auth required)
licensesRoutes.post(
  '/validate',
  validate({
    body: z.object({ code: z.string().min(4).max(80) }),
  }),
  async (req, res, next) => {
    try {
      const result = await LicenseService.validate(req.body.code);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

// SUPER_ADMIN only: create, list, revoke
licensesRoutes.use(requireAuth);
licensesRoutes.use(requireRole('SUPER_ADMIN'));

licensesRoutes.get('/', async (_req, res, next) => {
  try {
    res.json(await LicenseService.list());
  } catch (e) {
    next(e);
  }
});

licensesRoutes.post(
  '/',
  validate({
    body: z.object({
      name: z.string().optional(),
      plan: z.enum(['TRIAL', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']).optional(),
      validForDays: z.number().int().min(1).max(3650).optional(),
      maxRedemptions: z.number().int().min(1).max(10000).optional(),
      customCode: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const license = await LicenseService.create({
        ...req.body,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      });
      res.status(201).json(license);
    } catch (e) {
      next(e);
    }
  },
);

licensesRoutes.post('/:id/revoke', async (req, res, next) => {
  try {
    res.json(await LicenseService.revoke(req.params.id!));
  } catch (e) {
    next(e);
  }
});
