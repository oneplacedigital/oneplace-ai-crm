/**
 * Workflow automation engine — orchestrates email, WhatsApp, Meta CAPI, etc.
 */
import { prisma, Prisma } from '@oneplace/db';
import type { Lead, Workflow } from '@oneplace/db';
import { LeadStatus } from '@oneplace/types';
import { logger } from '../config/logger';
import { WhatsAppService } from './whatsapp.service';
import { MetaService } from './meta.service';
import { EmailService } from './email.service';

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

      case 'SEND_EMAIL': {
        if (!ctx.lead.email) return { ok: false, detail: 'lead_has_no_email' };
        const templateId = action.params['templateId'] as string | undefined;
        const templateName = action.params['templateName'] as string | undefined;
        if (templateId || templateName) {
          const r = await EmailService.sendTemplate({
            tenantId: ctx.tenantId,
            templateId,
            templateName,
            leadId: ctx.lead.id,
          });
          return { ok: r.sent ?? false, detail: r };
        }
        // Inline email body
        const subject = interpolate(String(action.params['subject'] ?? 'Hello'), ctx.lead);
        const bodyHtml = interpolate(String(action.params['bodyHtml'] ?? ''), ctx.lead);
        const r = await EmailService.send({
          tenantId: ctx.tenantId,
          toEmail: ctx.lead.email,
          subject,
          bodyHtml,
          leadId: ctx.lead.id,
        });
        return { ok: r.sent ?? false, detail: r };
      }

      case 'START_EMAIL_SEQUENCE': {
        const sequenceId = action.params['sequenceId'] as string | undefined;
        const sequenceName = action.params['sequenceName'] as string | undefined;
        if (!sequenceId && !sequenceName) return { ok: false, detail: 'no_sequence_specified' };
        const seq = sequenceId
          ? await prisma.emailSequence.findFirst({
              where: { id: sequenceId, tenantId: ctx.tenantId },
            })
          : await prisma.emailSequence.findFirst({
              where: { name: sequenceName, tenantId: ctx.tenantId },
            });
        if (!seq) return { ok: false, detail: 'sequence_not_found' };
        try {
          await prisma.emailSequenceEnrollment.create({
            data: { sequenceId: seq.id, leadId: ctx.lead.id },
          });
        } catch {
          return { ok: false, detail: 'already_enrolled' };
        }
        return { ok: true, detail: { sequenceId: seq.id } };
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
      case 'NOTIFY_ADMIN': {
        const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenantId } });
        const toEmail = String(action.params['toEmail'] ?? '').trim() || tenant?.email;
        if (!toEmail) return { ok: false, detail: 'no_admin_email' };
        const lead = ctx.lead;
        const subject = interpolate(
          String(action.params['subject'] ?? 'New lead: {{lead.fullName}}'),
          lead,
        );
        const leadUrl = `https://pipely-saas.vercel.app/leads/${lead.id}`;
        const bodyHtml =
          `<p>A lead needs your attention in your CRM.</p>` +
          `<table cellpadding="6" style="border-collapse:collapse;font-size:14px">` +
          `<tr><td><strong>Name</strong></td><td>${lead.fullName}</td></tr>` +
          `<tr><td><strong>Phone</strong></td><td>${lead.phone}</td></tr>` +
          `<tr><td><strong>Email</strong></td><td>${lead.email ?? '-'}</td></tr>` +
          `<tr><td><strong>City</strong></td><td>${lead.city ?? '-'}</td></tr>` +
          `<tr><td><strong>Source</strong></td><td>${lead.source}</td></tr>` +
          `<tr><td><strong>Status</strong></td><td>${lead.status}</td></tr>` +
          `</table>` +
          `<p><a href="${leadUrl}">Open this lead in the CRM</a></p>`;
        const r = await EmailService.send({
          tenantId: ctx.tenantId,
          toEmail,
          subject,
          bodyHtml,
        });
        await prisma.leadActivity.create({
          data: {
            tenantId: ctx.tenantId,
            leadId: lead.id,
            type: 'SYSTEM',
            title: `Admin notified of lead (${toEmail})`,
          },
        });
        return { ok: r.sent ?? false, detail: r };
      }

      default:
        return { ok: false, detail: `unknown_action:${action.type}` };
    }
  } catch (e) {
    return { ok: false, detail: { error: e instanceof Error ? e.message : String(e) } };
  }
}

type ConditionRule = { field: string; operator: string; value: string };

function evaluateRule(rule: ConditionRule, lead: Lead): boolean {
  const raw = (lead as unknown as Record<string, unknown>)[rule.field];
  const fieldStr = raw == null ? '' : String(raw);
  const val = String(rule.value ?? '');
  switch (rule.operator) {
    case 'equals':
      return fieldStr.toLowerCase() === val.toLowerCase();
    case 'not_equals':
      return fieldStr.toLowerCase() !== val.toLowerCase();
    case 'contains':
      return fieldStr.toLowerCase().includes(val.toLowerCase());
    case 'greater_than':
      return Number(raw) > Number(val);
    case 'less_than':
      return Number(raw) < Number(val);
    case 'is_empty':
      return fieldStr.trim() === '';
    case 'is_not_empty':
      return fieldStr.trim() !== '';
    default:
      return true;
  }
}

/** Zoho-style criteria — the workflow runs only when the lead matches. */
function evaluateConditions(params: Record<string, unknown>, lead: Lead): boolean {
  const rules = (params['rules'] as ConditionRule[] | undefined) ?? [];
  if (rules.length === 0) return true;
  const match = String(params['match'] ?? 'ALL').toUpperCase();
  const checks = rules.map((r) => evaluateRule(r, lead));
  return match === 'ANY' ? checks.some(Boolean) : checks.every(Boolean);
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
        const allActions = (wf.actions as unknown as ActionDef[]) ?? [];
        const condAction = allActions.find((a) => a.type === 'CONDITIONS');
        if (condAction && !evaluateConditions(condAction.params, lead)) {
          continue; // lead does not match this workflow's conditions
        }
        const run = await prisma.workflowRun.create({
          data: {
            tenantId: ctx.tenantId,
            workflowId: wf.id,
            leadId: lead.id,
            status: 'PENDING',
          },
        });
        const actions = allActions.filter((a) => a.type !== 'CONDITIONS');
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
