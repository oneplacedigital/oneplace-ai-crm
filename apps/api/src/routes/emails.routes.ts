import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@oneplace/db';
import { EmailService } from '../services/email.service';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { NotFound, Conflict } from '../utils/errors';

export const emailsRoutes = Router();

// Public: unsubscribe link target (no auth)
emailsRoutes.get('/unsubscribe/:leadId', async (req, res) => {
  await EmailService.unsubscribe(req.params.leadId!);
  res.send(`<!doctype html><html><head><title>Unsubscribed</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#13273B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.box{text-align:center;padding:2rem;max-width:480px}h1{color:#DB0000}</style>
</head><body><div class="box"><h1>You're unsubscribed</h1>
<p>You'll no longer receive emails from this sender. If this was a mistake, contact us at oneplacedigitalacademy@gmail.com.</p></div></body></html>`);
});

emailsRoutes.use(requireAuth);

// --- Templates ----------------------------------------------------------

emailsRoutes.get('/templates', async (req, res, next) => {
  try {
    const items = await prisma.emailTemplate.findMany({
      where: { tenantId: req.auth!.tid },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

const templateSchema = z.object({
  name: z.string().min(2).max(100),
  subject: z.string().min(2).max(200),
  bodyHtml: z.string().min(10).max(50000),
  bodyText: z.string().max(50000).optional(),
  isActive: z.boolean().optional(),
});

emailsRoutes.post(
  '/templates',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: templateSchema }),
  async (req, res, next) => {
    try {
      const existing = await prisma.emailTemplate.findUnique({
        where: { tenantId_name: { tenantId: req.auth!.tid, name: req.body.name } },
      });
      if (existing) throw Conflict('A template with this name already exists');
      const t = await prisma.emailTemplate.create({
        data: { ...req.body, tenantId: req.auth!.tid },
      });
      res.status(201).json(t);
    } catch (e) {
      next(e);
    }
  },
);

emailsRoutes.patch(
  '/templates/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: templateSchema.partial() }),
  async (req, res, next) => {
    try {
      const t = await prisma.emailTemplate.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!t) throw NotFound('Template not found');
      const updated = await prisma.emailTemplate.update({
        where: { id: t.id },
        data: req.body,
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

emailsRoutes.delete(
  '/templates/:id',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      const t = await prisma.emailTemplate.findFirst({
        where: { id: req.params.id, tenantId: req.auth!.tid },
      });
      if (!t) throw NotFound('Template not found');
      await prisma.emailTemplate.delete({ where: { id: t.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

// --- Send (test or by template to lead) ---------------------------------

emailsRoutes.post(
  '/send-template',
  requireRole('TENANT_ADMIN', 'MANAGER', 'COUNSELOR'),
  validate({
    body: z.object({
      templateId: z.string().cuid().optional(),
      templateName: z.string().optional(),
      leadId: z.string().cuid(),
    }),
  }),
  async (req, res, next) => {
    try {
      const result = await EmailService.sendTemplate({
        tenantId: req.auth!.tid,
        templateId: req.body.templateId,
        templateName: req.body.templateName,
        leadId: req.body.leadId,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

emailsRoutes.post(
  '/send-test',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({
    body: z.object({
      toEmail: z.string().email(),
      subject: z.string().min(1).max(200),
      bodyHtml: z.string().min(10),
    }),
  }),
  async (req, res, next) => {
    try {
      const r = await EmailService.send({
        tenantId: req.auth!.tid,
        toEmail: req.body.toEmail,
        subject: req.body.subject,
        bodyHtml: req.body.bodyHtml,
      });
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);

// --- Sends history -------------------------------------------------------

emailsRoutes.get('/sends', async (req, res, next) => {
  try {
    const items = await prisma.emailSend.findMany({
      where: { tenantId: req.auth!.tid },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        lead: { select: { id: true, fullName: true } },
        template: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});
