/**
 * Integration management — tenant admin saves Meta + WhatsApp credentials.
 * Tokens are encrypted at rest via meta.service / whatsapp.service.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@oneplace/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MetaService } from '../services/meta.service';
import { WhatsAppService } from '../services/whatsapp.service';

export const integrationsRoutes = Router();
integrationsRoutes.use(requireAuth);

/** Status endpoint — returns booleans, NEVER the tokens. */
integrationsRoutes.get('/status', async (req, res, next) => {
  try {
    const t = await prisma.tenant.findUnique({
      where: { id: req.auth!.tid },
      select: {
        metaPixelId: true,
        metaAccessToken: true,
        metaAdAccountId: true,
        whatsappPhoneId: true,
        whatsappBizId: true,
        whatsappToken: true,
      },
    });
    res.json({
      meta: {
        // Meta is "connected" once the access token is saved (lead capture).
        // The Pixel ID is only needed for outbound Conversion API events.
        configured: Boolean(t?.metaAccessToken),
        pixelId: t?.metaPixelId ?? null,
        adAccountId: t?.metaAdAccountId ?? null,
        tokenSet: Boolean(t?.metaAccessToken),
      },
      whatsapp: {
        configured: Boolean(t?.whatsappToken && t?.whatsappPhoneId),
        phoneNumberId: t?.whatsappPhoneId ?? null,
        businessAccountId: t?.whatsappBizId ?? null,
        tokenSet: Boolean(t?.whatsappToken),
      },
    });
  } catch (e) {
    next(e);
  }
});

const metaSchema = z.object({
  metaPixelId: z.string().trim().optional(),
  metaAccessToken: z.string().trim().optional(),
  metaAdAccountId: z.string().trim().optional(),
});
const whatsappSchema = z.object({
  whatsappPhoneId: z.string().trim().optional(),
  whatsappBizId: z.string().trim().optional(),
  whatsappToken: z.string().trim().optional(),
});

integrationsRoutes.put(
  '/meta',
  requireRole('TENANT_ADMIN'),
  validate({ body: metaSchema }),
  async (req, res, next) => {
    try {
      const r = await MetaService.saveTenantCredentials(req.auth!.tid, req.body);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);

integrationsRoutes.post(
  '/meta/test',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  async (req, res, next) => {
    try {
      res.json(await MetaService.testConnection(req.auth!.tid));
    } catch (e) {
      next(e);
    }
  },
);

integrationsRoutes.put(
  '/whatsapp',
  requireRole('TENANT_ADMIN'),
  validate({ body: whatsappSchema }),
  async (req, res, next) => {
    try {
      const r = await WhatsAppService.saveTenantCredentials(req.auth!.tid, req.body);
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);

const sendTemplateSchema = z.object({
  leadId: z.string().cuid().optional(),
  toPhone: z.string().min(7),
  templateName: z.string().min(1),
  languageCode: z.string().optional(),
  bodyVariables: z.array(z.string()).optional(),
});
integrationsRoutes.post(
  '/whatsapp/test-template',
  requireRole('TENANT_ADMIN', 'MANAGER'),
  validate({ body: sendTemplateSchema }),
  async (req, res, next) => {
    try {
      const r = await WhatsAppService.sendTemplate({
        tenantId: req.auth!.tid,
        leadId: req.body.leadId,
        toPhone: req.body.toPhone,
        templateName: req.body.templateName,
        languageCode: req.body.languageCode,
        bodyVariables: req.body.bodyVariables,
      });
      res.json(r);
    } catch (e) {
      next(e);
    }
  },
);
