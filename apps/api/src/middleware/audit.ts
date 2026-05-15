/**
 * Audit log middleware.
 * Wrap any mutating route to record (tenantId, userId, entity, action, ip, ua) into AuditLog.
 * Append-only; failures are non-fatal (logged, not thrown) — auditing must never block work.
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oneplace/db';
import { logger } from '../config/logger';

export function audit(entity: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      // Best-effort logging
      void prisma.auditLog
        .create({
          data: {
            tenantId: req.auth?.tid ?? 'unknown',
            userId: req.auth?.sub,
            entity,
            entityId: (req.params['id'] as string) ?? 'n/a',
            action,
            diff: (req.body ? { keys: Object.keys(req.body) } : undefined) as never,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']?.toString(),
          },
        })
        .catch((e) => logger.warn({ err: e }, 'audit log write failed'));
    });
    next();
  };
}
