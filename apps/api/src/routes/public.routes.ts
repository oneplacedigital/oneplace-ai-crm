/**
 * Public endpoints — no auth, CORS open to any origin so customer websites
 * can submit lead capture forms directly.
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma, Prisma } from '@oneplace/db';
import { WorkflowEngine } from '../services/workflow.service';
import { logger } from '../config/logger';
import { validate } from '../middleware/validate';

export const publicRoutes = Router();

/** Per-IP throttle — guards against spammy bot submissions. */
const publicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many submissions, please slow down.' },
});

const leadCaptureSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  sourceDetail: z.string().trim().max(500).optional().or(z.literal('')),
  utm_source: z.string().trim().max(120).optional().or(z.literal('')),
  utm_medium: z.string().trim().max(120).optional().or(z.literal('')),
  utm_campaign: z.string().trim().max(120).optional().or(z.literal('')),
  // honeypot — bots tend to fill every visible-looking field
  _hp: z.string().optional(),
});

publicRoutes.get('/leads/:tenantSlug', (_req, res) => {
  // Helpful response if someone visits the URL in a browser
  res.json({ ok: true, message: 'Pipely public lead capture endpoint. POST to submit a lead.' });
});

publicRoutes.post(
  '/leads/:tenantSlug',
  publicLimiter,
  validate({ body: leadCaptureSchema }),
  async (req: Request, res: Response) => {
    const slug = (req.params.tenantSlug ?? '').toLowerCase();
    if (!slug) return res.status(400).json({ error: 'BAD_REQUEST' });

    // Honeypot — silently succeed against bots so they don't retry
    if (req.body._hp) return res.status(200).json({ success: true });

    try {
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      if (!tenant) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Form not found' });
      }
      if (!tenant.isActive || tenant.isSuspended || tenant.approvalStatus !== 'APPROVED') {
        return res
          .status(403)
          .json({ error: 'INACTIVE', message: 'This form is not accepting submissions' });
      }

      // 60-second dedupe by phone — protects against double-clicks
      const recent = await prisma.lead.findFirst({
        where: {
          tenantId: tenant.id,
          phone: req.body.phone,
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (recent) {
        return res.status(200).json({ success: true, leadId: recent.id, deduped: true });
      }

      const utm: Record<string, string> = {};
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
        if (req.body[k]) utm[k] = String(req.body[k]);
      }

      const notesParts: string[] = [];
      if (req.body.message) notesParts.push(String(req.body.message));
      if (Object.keys(utm).length) notesParts.push('UTM: ' + JSON.stringify(utm));

      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          fullName: req.body.fullName,
          phone: req.body.phone,
          email: req.body.email ? String(req.body.email).toLowerCase() : null,
          whatsapp: req.body.phone,
          city: req.body.city ? String(req.body.city) : null,
          source: 'WEBSITE_FORM',
          sourceDetail: req.body.sourceDetail ? String(req.body.sourceDetail) : null,
          notes: notesParts.length ? notesParts.join('\n\n') : null,
        },
      });

      await prisma.leadActivity.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          type: 'SYSTEM',
          title: 'Lead captured from website form',
          metadata: {
            sourceDetail: req.body.sourceDetail ?? null,
            utm,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
          } as Prisma.JsonObject,
        },
      });

      // Fire any LEAD_CREATED workflows the tenant has configured
      void WorkflowEngine.dispatch('LEAD_CREATED', {
        tenantId: tenant.id,
        leadId: lead.id,
      });

      return res.status(201).json({ success: true, leadId: lead.id });
    } catch (e) {
      logger.error({ err: e, slug }, 'Public lead capture failed');
      return res.status(500).json({ error: 'SERVER_ERROR' });
    }
  },
);
