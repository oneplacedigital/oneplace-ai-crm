/**
 * Analytics service — funnel, ROI, daily trend, leaderboard.
 * All queries scoped by tenantId. No cross-tenant aggregation possible.
 */
import { prisma } from '@oneplace/db';
import { Prisma } from '@oneplace/db';

const TIMEZONE_OFFSET_MIN = 330; // IST

function startOfDayIST(d: Date): Date {
  const utc = new Date(d);
  utc.setMinutes(utc.getMinutes() + TIMEZONE_OFFSET_MIN);
  utc.setHours(0, 0, 0, 0);
  utc.setMinutes(utc.getMinutes() - TIMEZONE_OFFSET_MIN);
  return utc;
}

export const AnalyticsService = {
  /** Funnel — count of leads currently in each stage + conversion ratios. */
  async funnel(tenantId: string) {
    const rows = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = r._count._all;
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    const stages = [
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'PROPOSAL_SENT',
      'NEGOTIATION',
      'WON',
    ];
    return {
      total,
      stages: stages.map((s, i) => ({
        status: s,
        count: map[s] ?? 0,
        share: total > 0 ? (map[s] ?? 0) / total : 0,
        stepConversion:
          i === 0 || (map[stages[i - 1]!] ?? 0) === 0
            ? null
            : (map[s] ?? 0) / (map[stages[i - 1]!] ?? 1),
      })),
      lost: map['LOST'] ?? 0,
    };
  },

  /** Source ROI — counts and conversion per source. */
  async sourcePerformance(tenantId: string) {
    const sources = await prisma.lead.groupBy({
      by: ['source'],
      where: { tenantId },
      _count: { _all: true },
    });
    const converted = await prisma.lead.groupBy({
      by: ['source'],
      where: { tenantId, status: 'WON' },
      _count: { _all: true },
    });
    const cMap: Record<string, number> = {};
    for (const c of converted) cMap[c.source] = c._count._all;
    return sources.map((s) => ({
      source: s.source,
      leads: s._count._all,
      conversions: cMap[s.source] ?? 0,
      conversionRate: s._count._all > 0 ? (cMap[s.source] ?? 0) / s._count._all : 0,
    }));
  },

  /** Daily lead-creation trend for last N days. */
  async dailyTrend(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.$queryRaw<{ day: Date; n: bigint }[]>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS day, count(*)::bigint AS n
      FROM leads
      WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), count: Number(r.n) }));
  },

  /** Time-to-convert (median in days) for converted leads. */
  async timeToConvert(tenantId: string) {
    const rows = await prisma.$queryRaw<{ days: number }[]>(Prisma.sql`
      SELECT extract(epoch from ("convertedAt" - "createdAt")) / 86400.0 AS days
      FROM leads
      WHERE "tenantId" = ${tenantId}
        AND "status" = 'WON'
        AND "convertedAt" IS NOT NULL
      ORDER BY days
    `);
    if (rows.length === 0) return { median: null, p90: null, count: 0 };
    const sorted = rows.map((r) => Number(r.days)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? null;
    const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? null;
    return { median, p90, count: sorted.length };
  },

  /** Counselor leaderboard ordered by conversions. */
  async leaderboard(tenantId: string) {
    const counselors = await prisma.user.findMany({
      where: { tenantId, role: { in: ['COUNSELOR', 'MANAGER'] }, isActive: true },
      select: { id: true, name: true },
    });
    const rows = [];
    for (const c of counselors) {
      const total = await prisma.lead.count({ where: { tenantId, assignedToId: c.id } });
      const converted = await prisma.lead.count({
        where: { tenantId, assignedToId: c.id, status: 'WON' },
      });
      rows.push({
        counselorId: c.id,
        counselorName: c.name,
        total,
        converted,
        rate: total > 0 ? converted / total : 0,
      });
    }
    return rows.sort((a, b) => b.converted - a.converted);
  },
};
