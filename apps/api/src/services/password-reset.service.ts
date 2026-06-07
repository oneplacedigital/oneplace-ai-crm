/**
 * Password reset — self-service + admin-triggered.
 *
 * SECURITY
 * - Tokens are 32 random bytes (base64url); only the SHA-256 hash is stored.
 * - Tokens expire in 60 minutes and are single-use.
 * - Requesting a reset never reveals whether an email exists (anti-enumeration).
 * - All refresh tokens are revoked on every successful password change.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@oneplace/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { BadRequest, NotFound } from '../utils/errors';
import { EmailService } from './email.service';

const TOKEN_TTL_MINUTES = 60;

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

function webBaseUrl(): string {
  const origin = (env.CORS_ORIGIN || '').split(',')[0]?.trim();
  if (origin && origin.startsWith('http')) return origin.replace(/\/$/, '');
  return 'https://pipely-saas.vercel.app';
}

function resetEmailHtml(name: string, url: string): string {
  return [
    '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">',
    '<h2 style="color:#1E1B4B;margin:0 0 8px">Reset your Pipora password</h2>',
    `<p style="color:#475569;font-size:15px;line-height:1.6">Hi ${name},</p>`,
    '<p style="color:#475569;font-size:15px;line-height:1.6">We received a request to reset your password. Click the button below to choose a new one. This link is valid for 60 minutes and can be used once.</p>',
    `<p style="margin:28px 0"><a href="${url}" style="background:#6366F1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">Reset password</a></p>`,
    `<p style="color:#94A3B8;font-size:13px;line-height:1.6">If the button does not work, copy this link into your browser:<br/><a href="${url}" style="color:#6366F1;word-break:break-all">${url}</a></p>`,
    '<p style="color:#94A3B8;font-size:13px">If you did not request this, you can safely ignore this email — your password will not change.</p>',
    '</div>',
  ].join('');
}

async function issueToken(userId: string, createdById?: string): Promise<string> {
  // single active token per user — kill older unused ones
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  const raw = crypto.randomBytes(32).toString('base64url');
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      createdById: createdById ?? null,
    },
  });
  return raw;
}

export const PasswordResetService = {
  /** Self-service: user typed their email on /forgot-password. Always resolves (no enumeration). */
  async requestReset(email: string): Promise<void> {
    const users = await prisma.user.findMany({
      where: { email: email.toLowerCase(), isActive: true },
      select: { id: true, name: true, email: true, tenantId: true },
    });
    for (const user of users) {
      try {
        const raw = await issueToken(user.id);
        const url = `${webBaseUrl()}/reset-password?token=${raw}`;
        await EmailService.send({
          tenantId: user.tenantId,
          toEmail: user.email,
          subject: 'Reset your Pipora password',
          bodyHtml: resetEmailHtml(user.name, url),
        });
      } catch (err) {
        logger.error({ err, userId: user.id }, 'Failed to send reset email');
      }
    }
  },

  /** Complete a reset using a raw token from the email link. */
  async resetWithToken(rawToken: string, newPassword: string): Promise<void> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw BadRequest('This reset link is invalid or has expired. Please request a new one.');
    }
    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);
  },

  /** Admin: send a reset email to a user in the admin's workspace + return a shareable link. */
  async adminSendReset(
    tenantId: string,
    userId: string,
    adminId: string,
  ): Promise<{ resetUrl: string; emailed: boolean }> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, name: true, email: true, tenantId: true },
    });
    if (!user) throw NotFound('User not found in your workspace');

    const raw = await issueToken(user.id, adminId);
    const resetUrl = `${webBaseUrl()}/reset-password?token=${raw}`;

    let emailed = false;
    try {
      const result = await EmailService.send({
        tenantId: user.tenantId,
        toEmail: user.email,
        subject: 'Reset your Pipora password',
        bodyHtml: resetEmailHtml(user.name, resetUrl),
      });
      emailed = Boolean((result as { sent?: boolean })?.sent);
    } catch (err) {
      logger.error({ err, userId }, 'Admin reset email failed — returning link only');
    }
    return { resetUrl, emailed };
  },

  /** Admin: directly set a new password for a user in the admin's workspace. */
  async adminSetPassword(tenantId: string, userId: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) throw NotFound('User not found in your workspace');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
  },
};
