import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AIService } from '../services/ai.service';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

export const aiRoutes = Router();

aiRoutes.use(requireAuth);

// Per-user AI rate limit
aiRoutes.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    keyGenerator: (req) => req.auth?.sub ?? req.ip ?? 'anon',
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

const idSchema = z.object({ leadId: z.string().cuid() });
const askSchema = z.object({ leadId: z.string().cuid(), question: z.string().min(2).max(500) });

aiRoutes.post(
  '/score',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ body: idSchema }),
  async (req, res, next) => {
    try {
      const r = await AIService.scoreLead(req.auth!.tid, req.body.leadId);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);

aiRoutes.post(
  '/suggest-followup',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ body: idSchema }),
  async (req, res, next) => {
    try {
      const r = await AIService.suggestFollowUp(req.auth!.tid, req.body.leadId);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);

aiRoutes.post(
  '/ask',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ body: askSchema }),
  async (req, res, next) => {
    try {
      const r = await AIService.ask(req.auth!.tid, req.body.leadId, req.body.question);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);

aiRoutes.post(
  '/summarize',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ body: idSchema }),
  async (req, res, next) => {
    try {
      const r = await AIService.summarize(req.auth!.tid, req.body.leadId);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);
