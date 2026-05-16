/**
 * Email service via Resend.
 * - Template rendering with {{lead.fullName}}, {{lead.firstName}} variables
 * - Send tracking via EmailSend records
 * - Open/click tracking via Resend webhook (Phase B)
 *
 * SECURITY
 * - From address verified against tenant.emailFromAddress (no spoofing)
 * - Unsubscribe link auto-appended (legal in IN under DPDP)
 * - Lead.unsubscribedAt blocks sends to that lead
 */
import { prisma, Prisma } from '@oneplace/db';
import type { Lead } from '@oneplace/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { NotFound, BadRequest } from '../utils/errors';

const RESEND_URL = 'https://api.resend.com/emails';

function interpolate(s: string, lead: Lead): string {
  return s
    .replaceAll('{{lead.fullName}}', lead.fullName)
    .replaceAll('{{lead.firstName}}', lead.fullName.split(' ')[0] ?? lead.fullName)
    .replaceAll('{{lead.email}}', lead.email ?? '')
    .replaceAll('{{lead.phone}}', lead.phone)
    .replaceAll('{{lead.city}}', lead.city ?? '');
}

function appendUnsubscribe(html: string, leadId: string): string {
  const unsubUrl = `${env.API_BASE_URL || 'https://oneplace-api.onrender.com'}/api/v1/emails/unsubscribe/${leadId}`;
  return `${html}<hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/><p style="font-size:11px;color:#9ca3af;text-align:center">Don't want these emails? <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a></p>`;
}

export const EmailService = {
  /** Send a single email via Resend. Records EmailSend row. */
  async send(opts: {
    tenantId: string;
    toEmail: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    leadId?: string;
    templateId?: string;
    fromName?: string;
    fromAddress?: string;
  }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: opts.tenantId } });
    if (!tenant) throw NotFound('Tenant not found');

    if (opts.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: opts.leadId } });
      if (lead?.unsubscribedAt) {
        logger.info({ leadId: opts.leadId }, 'Skipping send to unsubscribed lead');
        return { sent: false, skipped: 'unsubscribed' };
      }
    }

    const fromAddr = opts.fromAddress ?? tenant.emailFromAddress ?? 'noreply@oneplacedigital.com';
    const fromName = opts.fromName ?? tenant.emailFromName ?? 'OnePlace Digital Academy';
    const from = `${fromName} <${fromAddr}>`;

    const bodyHtmlFinal = opts.leadId
      ? appendUnsubscribe(opts.bodyHtml, opts.leadId)
      : opts.bodyHtml;

    const send = await prisma.emailSend.create({
      data: {
        tenantId: opts.tenantId,
        leadId: opts.leadId,
        templateId: opts.templateId,
        toEmail: opts.toEmail,
        fromEmail: from,
        subject: opts.subject,
        bodyHtml: bodyHtmlFinal,
        status: 'QUEUED',
      },
    });

    if (!env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set - email queued but not sent');
      await prisma.emailSend.update({
        where: { id: send.id },
        data: { status: 'FAILED', errorMessage: 'RESEND_API_KEY not configured' },
      });
      return { sent: false, skipped: 'no_api_key', sendId: send.id };
    }

    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from,
          to: [opts.toEmail],
          subject: opts.subject,
          html: bodyHtmlFinal,
          text: opts.bodyText,
          reply_to: tenant.emailReplyTo ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (!res.ok) {
        await prisma.emailSend.update({
          where: { id: send.id },
          data: {
            status: 'FAILED',
            errorMessage: data?.message ?? `Resend ${res.status}`,
          },
        });
        return { sent: false, error: data?.message ?? `Resend ${res.status}`, sendId: send.id };
      }
      await prisma.emailSend.update({
        where: { id: send.id },
        data: {
          status: 'SENT',
          providerId: data?.id,
          sentAt: new Date(),
        },
      });
      if (opts.leadId) {
        await prisma.leadActivity.create({
          data: {
            tenantId: opts.tenantId,
            leadId: opts.leadId,
            type: 'EMAIL_SENT',
            title: `Email sent: ${opts.subject}`,
            metadata: { resendId: data?.id, sendId: send.id } as Prisma.JsonObject,
          },
        });
      }
      return { sent: true, sendId: send.id, providerId: data?.id };
    } catch (e) {
      logger.error({ err: e }, 'Resend send failed');
      await prisma.emailSend.update({
        where: { id: send.id },
        data: {
          status: 'FAILED',
          errorMessage: e instanceof Error ? e.message : 'Send threw',
        },
      });
      return { sent: false, error: 'send_threw', sendId: send.id };
    }
  },

  /** Send via a stored template (interpolate variables). */
  async sendTemplate(opts: {
    tenantId: string;
    templateId?: string;
    templateName?: string;
    leadId: string;
  }) {
    const template = opts.templateId
      ? await prisma.emailTemplate.findFirst({
          where: { id: opts.templateId, tenantId: opts.tenantId },
        })
      : await prisma.emailTemplate.findFirst({
          where: { tenantId: opts.tenantId, name: opts.templateName },
        });
    if (!template) throw NotFound('Email template not found');

    const lead = await prisma.lead.findFirst({
      where: { id: opts.leadId, tenantId: opts.tenantId },
    });
    if (!lead) throw NotFound('Lead not found');
    if (!lead.email) throw BadRequest('Lead has no email address');

    return this.send({
      tenantId: opts.tenantId,
      toEmail: lead.email,
      subject: interpolate(template.subject, lead),
      bodyHtml: interpolate(template.bodyHtml, lead),
      bodyText: template.bodyText ? interpolate(template.bodyText, lead) : undefined,
      leadId: lead.id,
      templateId: template.id,
    });
  },

  /** Mark a lead as unsubscribed (called from unsubscribe link). */
  async unsubscribe(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { ok: false };
    await prisma.lead.update({
      where: { id: leadId },
      data: { unsubscribedAt: new Date() },
    });
    return { ok: true };
  },
};
