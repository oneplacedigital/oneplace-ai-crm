import { Router } from 'express';
import { LeadService } from '../services/lead.service';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { audit } from '../middleware/audit';
import {
  createLeadSchema,
  updateLeadSchema,
  listLeadsSchema,
  idParamSchema,
  transitionSchema,
  addActivitySchema,
} from '../validators/lead.validators';

export const leadsRoutes = Router();

leadsRoutes.use(requireAuth);

leadsRoutes.get('/', validate({ query: listLeadsSchema }), async (req, res, next) => {
  try {
    const result = await LeadService.list(req.auth!.tid, req.query as never);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

leadsRoutes.post(
  '/',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ body: createLeadSchema }),
  audit('lead', 'create'),
  async (req, res, next) => {
    try {
      const lead = await LeadService.create(req.auth!.tid, req.auth!.sub, req.body);
      res.status(201).json(lead);
    } catch (e) {
      next(e);
    }
  },
);

leadsRoutes.get('/pipeline-summary', async (req, res, next) => {
  try {
    res.json(await LeadService.pipelineSummary(req.auth!.tid));
  } catch (e) {
    next(e);
  }
});

leadsRoutes.get('/counselor-stats', async (req, res, next) => {
  try {
    res.json(await LeadService.counselorStats(req.auth!.tid));
  } catch (e) {
    next(e);
  }
});

leadsRoutes.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const lead = await LeadService.get(req.auth!.tid, req.params.id!);
    res.json(lead);
  } catch (e) {
    next(e);
  }
});

leadsRoutes.patch(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ params: idParamSchema, body: updateLeadSchema }),
  audit('lead', 'update'),
  async (req, res, next) => {
    try {
      const lead = await LeadService.update(
        req.auth!.tid,
        req.auth!.sub,
        req.params.id!,
        req.body,
      );
      res.json(lead);
    } catch (e) {
      next(e);
    }
  },
);

leadsRoutes.post(
  '/:id/transition',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ params: idParamSchema, body: transitionSchema }),
  audit('lead', 'status_change'),
  async (req, res, next) => {
    try {
      const lead = await LeadService.transition(
        req.auth!.tid,
        req.auth!.sub,
        req.params.id!,
        req.body.status,
      );
      res.json(lead);
    } catch (e) {
      next(e);
    }
  },
);

leadsRoutes.post(
  '/:id/activities',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({ params: idParamSchema, body: addActivitySchema }),
  async (req, res, next) => {
    try {
      const activity = await LeadService.addActivity(
        req.auth!.tid,
        req.params.id!,
        req.auth!.sub,
        req.body.type,
        req.body.title,
        req.body.body,
      );
      res.status(201).json(activity);
    } catch (e) {
      next(e);
    }
  },
);

leadsRoutes.delete(
  '/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ params: idParamSchema }),
  audit('lead', 'delete'),
  async (req, res, next) => {
    try {
      await LeadService.delete(req.auth!.tid, req.params.id!);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);
