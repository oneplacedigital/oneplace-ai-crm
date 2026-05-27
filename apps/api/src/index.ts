import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { logger } from './config/logger';
import { apiRouter } from './routes';
import { webhookRoutes } from './routes/webhooks.routes';
import { publicRoutes } from './routes/public.routes';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Strict helmet baseline; CSP is loose because we don't render HTML from this service.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(compression());
app.use(cookieParser());
app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }),
);

/**
 * Webhook routes MUST be mounted BEFORE express.json() so the raw-body
 * middleware can compute HMAC over the exact bytes received.
 */
app.use('/webhooks', webhookRoutes);

// Everything else: regular JSON
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * PUBLIC endpoints (lead capture from customer websites).
 * Mounted BEFORE the global CORS + rate limit so any origin can submit
 * and the per-IP throttle inside publicRoutes is the only gate.
 */
app.use('/api/v1/public', cors({ origin: '*' }), publicRoutes);

// Global CORS for authenticated dashboard traffic
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  }),
);

// Global rate-limit for the API
app.use(
  '/api/v1',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Tighter login bruteforce limit
app.use(
  '/api/v1/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Too many login attempts — try again later.' },
  }),
);
app.use(
  '/api/v1/auth/register-tenant',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }),
);

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT ?? env.API_PORT;
const server = app.listen(PORT, () => {
  logger.info(`🚀 ONEPLACE AI CRM API listening on :${PORT} (${env.NODE_ENV})`);
  logger.info(`   Webhooks: /webhooks/meta/leads, /webhooks/whatsapp`);
});

const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
