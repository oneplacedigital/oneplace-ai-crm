/**
 * Public webhook endpoints for Meta Lead Ads + WhatsApp Cloud API.
 * SECURITY: every route validates HMAC, dedupes by external id, never trusts payload.
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  rawJsonBody,
  verifyMetaSignature,
  handleSubscribeChallenge,
  recordWebhookEvent,
} from '../lib/webhook-security';
import { MetaService } from '../services/meta.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const webhookRoutes = Router();

/** Aggressive rate-limit for webhook burst tolerance (Meta can fan out 1000s/min). */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
webhookRoutes.use(webhookLimiter);

// --- Meta Lead Ads + Conversion API webhook ---------------------------------

webhookRoutes.get('/meta/leads', handleSubscribeChallenge(env.META_VERIFY_TOKEN));

webhookRoutes.post(
  '/meta/leads',
  rawJsonBody,
  verifyMetaSignature(),
  async (req: Request, res: Response) => {
    // Always 200 fast to acknowledge — process asynchronously
    res.status(200).json({ received: true });

    try {
      const body = req.body as { entry?: unknown[]; object?: string };
      if (body.object !== 'page' || !Array.isArray(body.entry)) return;

      for (const entry of body.entry) {
        const externalId = `${(entry as { id?: string }).id}:${(entry as { time?: number }).time}`;
        const fresh = await recordWebhookEvent('META_LEAD_ADS', externalId, entry);
        if (!fresh) {
          logger.info({ externalId }, 'Meta webhook: duplicate, skipped');
          continue;
        }
        await MetaService.ingestLeadAdsEntry(entry as never);
      }
    } catch (e) {
      logger.error({ err: e }, 'Meta lead webhook processing failed (already 200d)');
    }
  },
);

// --- WhatsApp Cloud API webhook --------------------------------------------

webhookRoutes.get('/whatsapp', handleSubscribeChallenge(env.WHATSAPP_VERIFY_TOKEN));

webhookRoutes.post(
  '/whatsapp',
  rawJsonBody,
  verifyMetaSignature(),
  async (req: Request, res: Response) => {
    res.status(200).json({ received: true });
    try {
      const body = req.body as { entry?: Array<{ id: string }> };
      if (!Array.isArray(body.entry)) return;

      const firstMsgId =
        // best-effort externalId — Meta retries with same id
        (body as { entry: Array<{ changes?: Array<{ value?: { messages?: Array<{ id: string }> } }> }> })
          .entry[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? `entry:${body.entry[0]?.id}:${Date.now()}`;

      const fresh = await recordWebhookEvent('WHATSAPP_CLOUD', firstMsgId, body);
      if (!fresh) {
        logger.info({ firstMsgId }, 'WhatsApp webhook: duplicate, skipped');
        return;
      }
      await WhatsAppService.ingestInbound(body as never);
    } catch (e) {
      logger.error({ err: e }, 'WhatsApp webhook processing failed (already 200d)');
    }
  },
);
