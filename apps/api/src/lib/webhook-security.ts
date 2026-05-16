/**
 * Webhook security middleware — HMAC verification + replay protection.
 * Follows the SECURITY.md playbook (§4).
 *
 * Usage:
 *   webhookRoutes.post(
 *     '/meta/leads',
 *     express.raw({ type: 'application/json' }),
 *     verifyMetaSignature(),
 *     async (req, res) => { ... }
 *   );
 */
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oneplace/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Forbidden, BadRequest } from '../utils/errors';

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
    webhook?: { provider: string; externalId: string };
  }
}

/**
 * Capture raw bytes BEFORE JSON parsing so HMAC stays valid.
 * Mount this as the body parser for webhook routes.
 */
export const rawJsonBody = (req: Request, _res: Response, next: NextFunction) => {
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    try {
      req.body = req.rawBody.length ? JSON.parse(req.rawBody.toString('utf8')) : {};
    } catch {
      req.body = {};
    }
    next();
  });
  req.on('error', next);
};

/**
 * Verify `X-Hub-Signature-256: sha256=<hex>` against HMAC-SHA256(rawBody, META_APP_SECRET).
 * Uses crypto.timingSafeEqual.
 */
export const verifyMetaSignature =
  () =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const secret = env.META_APP_SECRET;
    if (!secret) {
      logger.warn('Meta webhook hit but META_APP_SECRET is unset — rejecting');
      return next(Forbidden('Webhook signature secret not configured'));
    }
    if (!req.rawBody) return next(BadRequest('Raw body missing'));

    const header = (req.headers['x-hub-signature-256'] || '').toString();
    if (!header.startsWith('sha256=')) return next(Forbidden('Missing signature'));

    const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    const given = header.slice('sha256='.length);

    try {
      const ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(given, 'hex'));
      if (!ok) return next(Forbidden('Bad signature'));
    } catch {
      return next(Forbidden('Bad signature'));
    }
    return next();
  };

/**
 * Handle Meta/WhatsApp GET subscription handshake.
 * Returns hub.challenge if hub.verify_token matches.
 */
export const handleSubscribeChallenge = (verifyToken: string) =>
  (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === verifyToken && typeof challenge === 'string') {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Forbidden');
  };

/**
 * Idempotency / replay protection.
 * Persists (provider, externalId). UNIQUE index prevents duplicate processing.
 * Returns true if this is a NEW event (process it). False if already seen.
 */
export async function recordWebhookEvent(
  provider: string,
  externalId: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider,
        externalId,
        payload: payload as never,
      },
    });
    return true;
  } catch (e: unknown) {
    // P2002 = unique constraint — already processed
    const code = (e as { code?: string }).code;
    if (code === 'P2002') return false;
    throw e;
  }
}
