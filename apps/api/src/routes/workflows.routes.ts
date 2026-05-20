import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@oneplace/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { NotFound } from '../utils/errors';

export const workflowsRoutes = Router();
workflowsRoutes.use(requireAuth);

const actionSchema = z.object({
  type: z.enum([
    'SEND_WHATSAPP_TEMPLATE',
    'ASSIGN_COUNSELOR',
    'SET_FOLLOWUP',
    'SET_STATUS',
    'SEND_META_EVENT',
    'NOTIFY_COUNSELOR',
  ]),
  params: z.record(z.any()).default({}),
});

const createSchema = z.object({
  name: z.string().min(2).max(120),
  isActive: z.boolean().default(true),
  trigger: z.enum(['LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_NO_RESPONSE_24H', 'LEAD_ASSIGNED']),
  triggerStatuses: z
    .array(
      z.enum([
        'NEW',
        'CONTACTED',
        'QUALIFIED',
        'PROPOSAL_SENT',
        'NEGOTIATION',
        'WON',
        'LOST',
      ]),
    )
    .default([]),
  actions: z.array(actionSchema).min(1),
});
const updateSchema = createSchema.partial();

workflowsRoutes.get('/', async (req, res, next) => {
  try {
    const items = await prisma.workflow.findMany({
      where: { tenantId: req.auth!.tid },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

workflowsRoutes.post(
  '/',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: createSchema }),
  async (req, res, next) => {
    try {
      const wf = await prisma.workflow.create({
        data: {
          tenantId: req.auth!.tid,
          name: req.body.name,
          isActive: req.body.isActive,
          trigger: req.body.trigger,
          triggerStatuses: req.body.triggerStatuses,
          actions: req.body.actions,
        },
      });
      res.status(201).json(wf);
    } catch (e) {
      next(e);
    }
  },
);

workflowsRoutes.patch(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: updateSchema }),
  async (req, res, next) => {
    try {
      const existing = await prisma.workflow.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!existing) throw NotFound('Workflow not found');
      const updated = await prisma.workflow.update({
        where: { id: existing.id },
        data: req.body,
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

workflowsRoutes.delete(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const existing = await prisma.workflow.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!existing) throw NotFound('Workflow not found');
      await prisma.workflow.delete({ where: { id: existing.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

workflowsRoutes.get('/:id/runs', async (req, res, next) => {
  try {
    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: req.params.id, tenantId: req.auth!.tid },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    res.json(runs);
  } catch (e) {
    next(e);
  }
});
