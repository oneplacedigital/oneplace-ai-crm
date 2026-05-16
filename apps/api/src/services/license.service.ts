/**
 * License key service.
 * - Super Admin can create license keys (coupons) for tenants
 * - Students redeem a code at /register to unlock features + set plan
 * - Single-use or multi-use coupons supported
 */
import crypto from 'crypto';
import { prisma } from '@oneplace/db';
import type { TenantPlan, LicenseStatus } from '@oneplace/db';
import { BadRequest, NotFound, Conflict } from '../utils/errors';

const LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateLicenseCode(prefix = 'ONEPLACE'): string {
  const buf = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += LICENSE_ALPHABET[buf[i]! % LICENSE_ALPHABET.length];
  }
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

export const LicenseService = {
  /** Super admin: create a new license key (single-use or multi-use). */
  async create(input: {
    name?: string;
    plan?: TenantPlan;
    validForDays?: number;
    maxRedemptions?: number;
    customCode?: string;
    expiresAt?: Date;
  }) {
    const code = input.customCode || generateLicenseCode();
    const existing = await prisma.licenseKey.findUnique({ where: { code } });
    if (existing) throw Conflict('License code already exists');

    return prisma.licenseKey.create({
      data: {
        code,
        name: input.name,
        plan: (input.plan ?? 'TRIAL') as TenantPlan,
        validForDays: input.validForDays ?? 30,
        maxRedemptions: input.maxRedemptions ?? 1,
        expiresAt: input.expiresAt,
      },
    });
  },

  /** Validate a license code without redeeming. Used on register page. */
  async validate(code: string) {
    const license = await prisma.licenseKey.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!license) throw NotFound('Invalid license code');
    if (license.status === 'REVOKED') throw BadRequest('This license has been revoked');
    if (license.status === 'EXPIRED') throw BadRequest('This license has expired');
    if (license.expiresAt && license.expiresAt < new Date()) {
      throw BadRequest('This license has expired');
    }
    if (license.redeemedCount >= license.maxRedemptions) {
      throw BadRequest('This license has reached its redemption limit');
    }
    return {
      valid: true,
      plan: license.plan,
      validForDays: license.validForDays,
      name: license.name,
    };
  },

  /** Redeem a license code during tenant creation. Returns license + computed expiry. */
  async redeem(code: string, tenantId: string) {
    const license = await prisma.licenseKey.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!license) throw NotFound('Invalid license code');
    if (license.status === 'REVOKED' || license.status === 'EXPIRED') {
      throw BadRequest('This license cannot be redeemed');
    }
    if (license.expiresAt && license.expiresAt < new Date()) {
      throw BadRequest('This license has expired');
    }
    if (license.redeemedCount >= license.maxRedemptions) {
      throw BadRequest('This license has reached its redemption limit');
    }

    const newCount = license.redeemedCount + 1;
    const isFullyRedeemed = newCount >= license.maxRedemptions;
    const licenseExpiresAt = new Date(Date.now() + license.validForDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.licenseKey.update({
        where: { id: license.id },
        data: {
          redeemedCount: newCount,
          status: (isFullyRedeemed ? 'REDEEMED' : 'ACTIVE') as LicenseStatus,
        },
      }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: {
          licenseKeyId: license.id,
          plan: license.plan,
          licenseExpiresAt,
          trialEndsAt: licenseExpiresAt,
        },
      }),
    ]);

    return { license, licenseExpiresAt };
  },

  async list() {
    return prisma.licenseKey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { redeemedTenants: true } },
      },
    });
  },

  async revoke(id: string) {
    const license = await prisma.licenseKey.findUnique({ where: { id } });
    if (!license) throw NotFound('License not found');
    return prisma.licenseKey.update({
      where: { id },
      data: { status: 'REVOKED' as LicenseStatus },
    });
  },
};
