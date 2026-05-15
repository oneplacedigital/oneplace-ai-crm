import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@oneplace/db';
import type { AuthUser, LoginRequest, LoginResponse, RegisterTenantRequest } from '@oneplace/types';
import { UserRole } from '@oneplace/types';
import { env } from '../config/env';
import { BadRequest, Conflict, Unauthorized } from '../utils/errors';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiryDate,
} from '../utils/jwt';

const toAuthUser = (u: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenant: { slug: string; name: string; brandColor: string | null };
}): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role as UserRole,
  tenantId: u.tenantId,
  tenantSlug: u.tenant.slug,
  tenantName: u.tenant.name,
  brandColor: u.tenant.brandColor ?? undefined,
});

export const AuthService = {
  async login(input: LoginRequest, meta: { userAgent?: string; ip?: string }): Promise<LoginResponse> {
    const user = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase() },
      include: { tenant: true },
    });
    if (!user || !user.isActive) throw Unauthorized('Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw Unauthorized('Invalid credentials');
    if (!user.tenant.isActive) throw Unauthorized('Tenant is disabled');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = signAccessToken({
      sub: user.id,
      tid: user.tenantId,
      role: user.role as UserRole,
      email: user.email,
    });
    const { token: refreshToken, tokenHash } = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: refreshTokenExpiryDate(),
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
      },
    });

    return { user: toAuthUser(user), accessToken, refreshToken };
  },

  async registerTenant(input: RegisterTenantRequest): Promise<LoginResponse> {
    const slug = input.tenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await prisma.tenant.findFirst({
      where: { OR: [{ slug }, { email: input.adminEmail.toLowerCase() }] },
    });
    if (existing) throw Conflict('Tenant slug or admin email already in use');

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    const tenant = await prisma.tenant.create({
      data: {
        slug,
        name: input.tenantName,
        email: input.adminEmail.toLowerCase(),
        phone: input.adminPhone,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        users: {
          create: {
            email: input.adminEmail.toLowerCase(),
            name: input.adminName,
            phone: input.adminPhone,
            passwordHash,
            role: 'TENANT_ADMIN',
          },
        },
      },
      include: { users: true },
    });
    const admin = tenant.users[0]!;
    return this.login({ email: admin.email, password: input.password }, {});
  },

  async refresh(refreshToken: string, meta: { userAgent?: string; ip?: string }): Promise<LoginResponse> {
    let payload: { sub: string; t: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw Unauthorized('Invalid refresh token');
    }
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: payload.t } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Unauthorized('Refresh token revoked or expired');
    }
    // Rotate
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });
    if (!user || !user.isActive) throw Unauthorized('User disabled');
    const accessToken = signAccessToken({
      sub: user.id,
      tid: user.tenantId,
      role: user.role as UserRole,
      email: user.email,
    });
    const { token: newRefresh, tokenHash } = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: refreshTokenExpiryDate(),
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
      },
    });
    return { user: toAuthUser(user), accessToken, refreshToken: newRefresh };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: payload.t, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // ignore — token already invalid
    }
  },

  async me(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw Unauthorized();
    return toAuthUser(user);
  },
};

/** Random invitation password helper (used by tenant admin creating counselors) */
export const generateTempPassword = () => crypto.randomBytes(8).toString('base64url');
