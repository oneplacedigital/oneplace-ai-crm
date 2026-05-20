import { Router } from 'express';
import { z } from 'zod';
import { SuperAdminService } from '../services/super-admin.service';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const superAdminRoutes = Router();

superAdminRoutes.use(requireAuth);
superAdminRoutes.use(requireRole('SUPER_ADMIN'));

superAdminRoutes.get('/stats', async (_req, res, next) => {
  try {
    res.json(await SuperAdminService.platformStats());
  } catch (e) {
    next(e);
  }
});

superAdminRoutes.get('/tenants', async (_req, res, next) => {
  try {
    res.json(await SuperAdminService.listTenants());
  } catch (e) {
    next(e);
  }
});

superAdminRoutes.get('/tenants/:id', async (req, res, next) => {
  try {
    res.json(await SuperAdminService.getTenant(req.params.id!));
  } catch (e) {
    next(e);
  }
});

superAdminRoutes.post(
  '/tenants/:id/suspend',
  validate({ body: z.object({ reason: z.string().min(3).max(500) }) }),
  async (req, res, next) => {
    try {
      res.json(await SuperAdminService.suspend(req.params.id!, req.body.reason));
    } catch (e) {
      next(e);
    }
  },
);

superAdminRoutes.post('/tenants/:id/activate', async (req, res, next) => {
  try {
    res.json(await SuperAdminService.activate(req.params.id!));
  } catch (e) {
    next(e);
  }
});

superAdminRoutes.post('/tenants/:id/approve', async (req, res, next) => {
  try {
    res.json(await SuperAdminService.approve(req.params.id!));
  } catch (e) {
    next(e);
  }
});

superAdminRoutes.post(
  '/tenants/:id/reject',
  validate({ body: z.object({ reason: z.string().min(3).max(500) }) }),
  async (req, res, next) => {
    try {
      res.json(await SuperAdminService.reject(req.params.id!, req.body.reason));
    } catch (e) {
      next(e);
    }
  },
);

superAdminRoutes.post(
  '/tenants/:id/plan',
  validate({
    body: z.object({
      plan: z.enum(['TRIAL', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']),
      extendDays: z.number().int().min(0).max(3650).optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      res.json(await SuperAdminService.setPlan(req.params.id!, req.body.plan, req.body.extendDays));
    } catch (e) {
      next(e);
    }
  },
);
