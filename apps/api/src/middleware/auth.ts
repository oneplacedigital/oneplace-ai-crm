import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { Unauthorized, Forbidden } from '../utils/errors';
import { UserRole } from '@oneplace/types';


export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(Unauthorized('Missing Bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(Unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(Unauthorized());
    // SUPER_ADMIN is the platform owner and passes every role gate.
    if (req.auth.role === 'SUPER_ADMIN') return next();
    if (!allowed.includes(req.auth.role as UserRole)) return next(Forbidden());
    return next();
  };
}
