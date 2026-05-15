import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma, WebhookProvider } from '@oneplace/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Forbidden, BadRequest } from '../utils/errors';

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

export const verifyMetaSignature =
  () =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const secret = env.META_APP_SECRET;
    if (!secret) {
      logger.warn('Meta webhook hit but META_APP_SECRET is unset - rejecting');
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

export async function recordWebhookEvent(
  provider: string,
  externalId: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: provider as WebhookProvider,
        externalId,
        payload: payload as never,
      },
    });
    return true;
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === 'P2002') return false;
    throw e;
  }
}
