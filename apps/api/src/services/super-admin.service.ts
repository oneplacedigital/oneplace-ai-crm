/**
 * Super Admin service — OnePlace platform owners only.
 * Manage all tenants across the SaaS, suspend/activate, change plans.
 */
import { prisma } from '@oneplace/db';
import type { TenantPlan } from '@oneplace/db';
import { NotFound, Forbidden } from '../utils/errors';

export const SuperAdminService = {
  /** List all tenants on the platform with usage stats. */
  async listTenants() {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            leads: true,
            emailSends: true,
          },
        },
        licenseKey: { select: { code: true, name: true } },
      },
    });
    return tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      email: t.email,
      plan: t.plan,
      isActive: t.isActive,
      isSuspended: t.isSuspended,
      suspendedReason: t.suspendedReason,
      approvalStatus: t.approvalStatus,
      rejectedReason: t.rejectedReason,
      city: t.city,
      createdAt: t.createdAt,
      trialEndsAt: t.trialEndsAt,
      licenseExpiresAt: t.licenseExpiresAt,
      licenseCode: t.licenseKey?.code ?? null,
      licenseName: t.licenseKey?.name ?? null,
      stats: {
        users: t._count.users,
        leads: t._count.leads,
        emailSends: t._count.emailSends,
      },
    }));
  },

  /** Detailed tenant view. */
  async getTenant(id: string) {
    const t = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        licenseKey: true,
        _count: { select: { leads: true, emailSends: true, workflows: true } },
      },
    });
    if (!t) throw NotFound('Tenant not found');
    return t;
  },

  /** Suspend a tenant (locks all logins). */
  async suspend(id: string, reason: string) {
    const t = await prisma.tenant.findUnique({ where: { id } });
    if (!t) throw NotFound('Tenant not found');
    if (t.slug === 'oneplace') throw Forbidden('Cannot suspend the platform owner tenant');
    return prisma.tenant.update({
      where: { id },
      data: { isSuspended: true, isActive: false, suspendedReason: reason },
    });
  },

  /** Re-activate a previously suspended tenant. */
  async activate(id: string) {
    return prisma.tenant.update({
      where: { id },
      data: { isSuspended: false, isActive: true, suspendedReason: null },
    });
  },

  /** Approve a pending tenant signup — grants full login access. */
  async approve(id: string) {
    const t = await prisma.tenant.findUnique({ where: { id } });
    if (!t) throw NotFound('Tenant not found');
    return prisma.tenant.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', isActive: true, rejectedReason: null },
    });
  },

  /** Reject a pending tenant signup with a reason. */
  async reject(id: string, reason: string) {
    const t = await prisma.tenant.findUnique({ where: { id } });
    if (!t) throw NotFound('Tenant not found');
    if (t.slug === 'oneplace') throw Forbidden('Cannot reject the platform owner tenant');
    return prisma.tenant.update({
      where: { id },
      data: { approvalStatus: 'REJECTED', isActive: false, rejectedReason: reason },
    });
  },

  /** Change a tenant's plan manually (e.g. upgrade after payment). */
  async setPlan(id: string, plan: TenantPlan, extendDays?: number) {
    const update: { plan: TenantPlan; trialEndsAt?: Date; licenseExpiresAt?: Date } = { plan };
    if (extendDays) {
      const at = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
      update.trialEndsAt = at;
      update.licenseExpiresAt = at;
    }
    return prisma.tenant.update({ where: { id }, data: update });
  },

  /** Platform-wide stats for super admin dashboard. */
  async platformStats() {
    const [tenants, totalLeads, totalEmails, activeLicenses] = await Promise.all([
      prisma.tenant.groupBy({ by: ['plan'], _count: { _all: true } }),
      prisma.lead.count(),
      prisma.emailSend.count({ where: { status: 'SENT' } }),
      prisma.licenseKey.count({ where: { status: 'ACTIVE' } }),
    ]);
    const totalTenants = tenants.reduce((sum, t) => sum + t._count._all, 0);
    const byPlan: Record<string, number> = {};
    for (const t of tenants) byPlan[t.plan] = t._count._all;
    return {
      totalTenants,
      totalLeads,
      totalEmails,
      activeLicenses,
      byPlan,
    };
  },
};
