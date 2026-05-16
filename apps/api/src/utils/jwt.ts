import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UserRole } from '@oneplace/types';

export interface AccessTokenPayload {
  sub: string;        // userId
  tid: string;        // tenantId
  role: UserRole;
  email: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

export const signRefreshToken = (userId: string): { token: string; tokenHash: string } => {
  const token = crypto.randomBytes(48).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  // We sign a JWT wrapper too so we can carry expiry server-side
  const wrapped = jwt.sign({ sub: userId, t: tokenHash }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
  return { token: wrapped, tokenHash };
};

export const verifyRefreshToken = (token: string): { sub: string; t: string } =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; t: string };

export const refreshTokenExpiryDate = (): Date => {
  const ms = parseDuration(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
};

function parseDuration(s: string): number {
  const m = /^(\d+)([smhd])$/.exec(s);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}
