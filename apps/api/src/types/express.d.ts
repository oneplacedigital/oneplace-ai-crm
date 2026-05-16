/**
 * Global Express type augmentation.
 * Picked up by tsc automatically (any .d.ts in the project).
 * Mirrors the AccessTokenPayload from utils/jwt to keep req.auth typed across all route files.
 */
import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string;
        tid: string;
        role: string;
        email: string;
      };
      rawBody?: Buffer;
      webhook?: { provider: string; externalId: string };
    }
  }
}

export {};
