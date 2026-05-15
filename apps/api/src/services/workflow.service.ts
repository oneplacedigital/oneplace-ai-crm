/**
 * Workflow automation engine.
 *
 * Domain events:
 *   - LEAD_CREATED
 *   - LEAD_STATUS_CHANGED
 *   - LEAD_ASSIGNED
 *
 * For each event, fetch matching Workflows (active + trigger match + status filter)
 * and execute their action chain. Each run is persisted as a WorkflowRun.
 *
 * Actions supported (see seed for examples):
 *   - SEND_WHATSAPP_TEMPLATE
 *   - ASSIGN_COUNSELOR (round-robin by least-loaded)
 *   - SET_FOLLOWUP   (params: { hours })
 *   - SET_STATUS     (params: { status })
 *   - SEND_META_EVENT
 *   - NOTIFY_COUNSELOR (creates a SYSTEM activity for the assignee)
 *
 * SAFETY
 * - Failures inside one action don't crash the whole workflow.
 * - Each action result captured into WorkflowRun.result.
 */
import { prisma, Prisma } from '@oneplace/db';
import type { Lead, Workflow } from '@oneplace/db';
import { LeadStatus } from '@oneplace/types';
import { logger } from '../config/logger';
import { WhatsAppService } from './whatsapp.service';
import { MetaService } from './meta.service';

type ActionDef = { type: string; params: Record<string, unknown> };
type EventType = 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED' | 'LEAD_ASSIGNED';

function interpolate(value: string, lead: Lead): string {
  return value
    .replaceAll('{{lead.fullName}}', lead.fullName)
    .replaceAll('{{lead.firstName}}', lead.fullName.split(' ')[0] ?? lead.fullName)
    .replaceAll('{{lead.phone}}', lead.phone)
    .replaceAll('{{lead.city}}', lead.city ?? '');
}

async function pickRoundRobinCounselor(tenantId: string): Promise<string | null> {
  // Least-loaded active counselor
  const rows = await prisma.user.findMany({
    where: { tenantId, role: 'COUNSELOR', isActive: true },
    select: { id: true, _count: { select: { assignedLeads: true } } },
  });
  if (rows.length === 0) return null;
  rows.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads);
  return rows[0]!.id;
}

async function runAction(
  action: ActionDef,
  ctx: { tenantId: string; lead: Lead },
): Promise<{ ok: boolean; detail?: unknown }> {
  try {
    switch (action.type) {
      case 'SEND_WHATSAPP_TEMPLATE': {
        const templateName = String(action.params['templateName'] ?? '');
        const language = String(action.params['language'] ?? 'en');
        const variables = (action.params['variables'] as string[] | undefined)?.map((v) =>
          interpolate(v, ctx.lead),
        );
        const r = await WhatsAppService.sendTemplate({
          tenantId: ctx.tenantId,
          leadId: ctx.lead.id,
          toPhone: ctx.lead.whatsapp ?? ctx.lead.phone,
          templateName,
          languageCode: language,
          bodyVariables: variables,
        });
        return { ok: r.sent ?? false, detail: r };
      }
      case 'ASSIGN_COUNSELOR': {
        const targetId =
          (action.params['userId'] as string | undefined) ??
          (await pickRoundRobinCounselor(ctx.tenantId));
        if (!targetId) return { ok: false, detail: 'no_counselor_available' };
        await prisma.lead.update({
          where: { id: ctx.lead.id },
          data: { assignedToId: targetId },
        });
        return { ok: true, detail: { assignedToId: targetId } };
      }
      case 'SET_FOLLOWUP': {
        const hours = Number(action.params['hours'] ?? 24);
        const at = new Date(Date.now() + hours * 60 * 60 * 1000);
        await prisma.lead.update({
          where: { id: ctx.lead.id },
          data: { nextFollowUpAt: at },
        });
        return { ok: true, detail: { nextFollowUpAt: at } };
      }
      case 'SET_STATUS': {
        const status = String(action.params['status']) as LeadStatus;
        await prisma.lead.update({
          where: { id: ctx.lead.id },
          data: { status },
        });
        return { ok: true, detail: { status } };
      }
      case 'SEND_META_EVENT': {
        const r = await MetaService.sendConversionEvent({
          tenantId: ctx.tenantId,
          leadId: ctx.lead.id,
          status: ctx.lead.status as LeadStatus,
        });
        return { ok: 'sent' in r ? Boolean(r.sent) : false, detail: r };
      }
      case 'NOTIFY_COUNSELOR': {
        if (!ctx.lead.assignedToId) return { ok: false, detail: 'unassigned' };
        const message = interpolate(String(action.params['message'] ?? 'Action needed'), ctx.lead);
        await prisma.leadActivity.create({
          data: {
            tenantId: ctx.tenantId,
            leadId: ctx.lead.id,
            type: 'SYSTEM',
            title: 'Workflow notification',
            body: message,
            userId: ctx.lead.assignedToId,
          },
        });
        return { ok: true };
      }
      default:
        return { ok: false, detail: `unknown_action:${action.type}` };
    }
  } catch (e) {
    return { ok: false, detail: { error: e instanceof Error ? e.message : String(e) } };
  }
}

export const WorkflowEngine = {
  async dispatch(event: EventType, ctx: { tenantId: string; leadId: string; toStatus?: LeadStatus }) {
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: ctx.leadId, tenantId: ctx.tenantId },
      });
      if (!lead) return;

      const where: Prisma.WorkflowWhereInput = {
        tenantId: ctx.tenantId,
        isActive: true,
        trigger: event,
      };
      const workflows = await prisma.workflow.findMany({ where });
      const matched = workflows.filter((w: Workflow) => {
        if (event !== 'LEAD_STATUS_CHANGED') return true;
        const tStatuses = (w.triggerStatuses ?? []) as LeadStatus[];
        if (tStatuses.length === 0) return true;
        return ctx.toStatus ? tStatuses.includes(ctx.toStatus) : false;
      });

      for (const wf of matched) {
        const run = await prisma.workflowRun.create({
          data: {
            tenantId: ctx.tenantId,
            workflowId: wf.id,
            leadId: lead.id,
            status: 'PENDING',
          },
        });
        const actions = (wf.actions as unknown as ActionDef[]) ?? [];
        const results: Array<{ type: string; ok: boolean; detail?: unknown }> = [];
        for (const action of actions) {
          const r = await runAction(action, { tenantId: ctx.tenantId, lead });
          results.push({ type: action.type, ...r });
        }
        const finalStatus = results.every((r) => r.ok) ? 'SUCCESS' : 'FAILED';
        await prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: finalStatus,
            result: results as unknown as Prisma.JsonArray,
            finishedAt: new Date(),
          },
        });
      }
    } catch (e) {
      logger.error({ err: e, event, ctx }, 'Workflow dispatch failed');
    }
  },
};
