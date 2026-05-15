import { prisma } from '@oneplace/db';
import { Prisma } from '@oneplace/db';
import type {
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadListQuery,
  PaginatedResponse,
  LeadStatus,
  ActivityType,
} from '@oneplace/types';
import { BadRequest, Conflict, NotFound } from '../utils/errors';
import { WorkflowEngine } from './workflow.service';
import { MetaService } from './meta.service';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export const LeadService = {
  async list(tenantId: string, q: LeadListQuery): Promise<PaginatedResponse<unknown>> {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, q.pageSize ?? DEFAULT_PAGE_SIZE));
    const where: Prisma.LeadWhereInput = {
      tenantId,
      ...(q.status && { status: q.status }),
      ...(q.source && { source: q.source }),
      ...(q.assignedToId && { assignedToId: q.assignedToId }),
      ...(q.search && {
        OR: [
          { fullName: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
        ],
      }),
    };

    const sortBy = q.sortBy ?? 'createdAt';
    const sortDir = q.sortDir ?? 'desc';

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async get(tenantId: string, id: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, name: true, code: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!lead) throw NotFound('Lead not found');
    return lead;
  },

  async create(tenantId: string, userId: string, input: CreateLeadRequest) {
    const exists = await prisma.lead.findUnique({
      where: { tenantId_phone: { tenantId, phone: input.phone } },
    });
    if (exists) throw Conflict('A lead with this phone already exists', { existingId: exists.id });

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email?.toLowerCase(),
        whatsapp: input.whatsapp,
        city: input.city ?? 'Nashik',
        source: input.source ?? 'MANUAL',
        sourceDetail: input.sourceDetail,
        courseId: input.courseId,
        assignedToId: input.assignedToId,
        notes: input.notes,
        budgetInr: input.budgetInr,
        tags: input.tags ?? [],
      },
    });
    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: lead.id,
        userId,
        type: 'SYSTEM',
        title: 'Lead created',
        body: `Created via source: ${lead.source}`,
      },
    });
    // Fire async — don't await to keep API fast
    void WorkflowEngine.dispatch('LEAD_CREATED', { tenantId, leadId: lead.id });
    // Fire Meta CAPI for new lead
    void MetaService.sendConversionEvent({ tenantId, leadId: lead.id, status: 'NEW' });
    return lead;
  },

  async update(tenantId: string, userId: string, id: string, input: UpdateLeadRequest) {
    const lead = await prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead) throw NotFound('Lead not found');

    const statusChanged = input.status && input.status !== lead.status;
    const assigneeChanged =
      input.assignedToId !== undefined && input.assignedToId !== lead.assignedToId;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email?.toLowerCase() }),
        ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.source !== undefined && { source: input.source }),
        ...(input.sourceDetail !== undefined && { sourceDetail: input.sourceDetail }),
        ...(input.courseId !== undefined && { courseId: input.courseId }),
        ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.budgetInr !== undefined && { budgetInr: input.budgetInr }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.nextFollowUpAt !== undefined && {
          nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
        }),
        ...(input.lostReason !== undefined && { lostReason: input.lostReason }),
        ...(input.status === 'PAYMENT_COMPLETED' && { convertedAt: new Date() }),
      },
    });

    if (statusChanged) {
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: id,
          userId,
          type: 'STATUS_CHANGE',
          title: `Status: ${lead.status} → ${input.status}`,
          metadata: { from: lead.status, to: input.status },
        },
      });
      // Fire workflows + Meta CAPI for the new status
      void WorkflowEngine.dispatch('LEAD_STATUS_CHANGED', {
        tenantId,
        leadId: id,
        toStatus: input.status as LeadStatus,
      });
      void MetaService.sendConversionEvent({
        tenantId,
        leadId: id,
        status: input.status as LeadStatus,
      });
    }
    if (assigneeChanged) {
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: id,
          userId,
          type: 'ASSIGNMENT_CHANGE',
          title: 'Counselor reassigned',
          metadata: { from: lead.assignedToId, to: input.assignedToId },
        },
      });
      void WorkflowEngine.dispatch('LEAD_ASSIGNED', { tenantId, leadId: id });
    }
    return updated;
  },

  async transition(tenantId: string, userId: string, id: string, status: LeadStatus) {
    return this.update(tenantId, userId, id, { status });
  },

  async delete(tenantId: string, id: string) {
    const lead = await prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead) throw NotFound('Lead not found');
    await prisma.lead.delete({ where: { id } });
  },

  async addActivity(
    tenantId: string,
    leadId: string,
    userId: string,
    type: ActivityType,
    title: string,
    body?: string,
  ) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw NotFound('Lead not found');
    return prisma.leadActivity.create({
      data: { tenantId, leadId, userId, type, title, body },
    });
  },

  async pipelineSummary(tenantId: string) {
    const rows = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = r._count._all;
    return counts;
  },

  async counselorStats(tenantId: string) {
    const counselors = await prisma.user.findMany({
      where: { tenantId, role: { in: ['COUNSELOR', 'MANAGER'] }, isActive: true },
      select: { id: true, name: true },
    });
    const out = [];
    for (const c of counselors) {
      const grouped = await prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, assignedToId: c.id },
        _count: { _all: true },
      });
      const byStatus: Record<string, number> = {};
      let total = 0;
      let converted = 0;
      for (const g of grouped) {
        byStatus[g.status] = g._count._all;
        total += g._count._all;
        if (g.status === 'PAYMENT_COMPLETED') converted += g._count._all;
      }
      const followUpsDue = await prisma.lead.count({
        where: {
          tenantId,
          assignedToId: c.id,
          nextFollowUpAt: { lte: new Date() },
          status: { notIn: ['PAYMENT_COMPLETED', 'LOST'] },
        },
      });
      out.push({
        counselorId: c.id,
        counselorName: c.name,
        totalLeads: total,
        byStatus,
        conversionRate: total > 0 ? converted / total : 0,
        followUpsDue,
      });
    }
    return out;
  },
};
