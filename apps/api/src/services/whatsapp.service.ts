/**
 * WhatsApp Cloud API service.
 *
 * RESPONSIBILITIES
 * 1. Send template messages (outside 24h customer service window)
 * 2. Send free-form messages (inside 24h window)
 * 3. Handle inbound webhooks → append as LeadActivity
 *
 * SECURITY (see SECURITY.md §6)
 * - HMAC verification at middleware boundary
 * - Idempotency on message.id
 * - Phone numbers normalized to E.164
 * - Per-tenant token decrypted only at send time
 */
import { prisma, Prisma } from '@oneplace/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { decrypt, encrypt } from '../lib/crypto';

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;

/** Normalize phone to E.164-ish (digits with leading +). */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return phone;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

interface WhatsAppInboundPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
        statuses?: Array<{ id: string; status: string; recipient_id: string }>;
      };
      field: string;
    }>;
  }>;
}

export const WhatsAppService = {
  /** Decrypt + send template message. */
  async sendTemplate(opts: {
    tenantId: string;
    leadId?: string;
    toPhone: string;
    templateName: string;
    languageCode?: string;
    bodyVariables?: string[];
  }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: opts.tenantId } });
    if (!tenant?.whatsappPhoneId || !tenant?.whatsappToken) {
      return { sent: false, skipped: 'tenant_not_configured' };
    }
    const token = decrypt(tenant.whatsappToken);
    const url = `${GRAPH_BASE}/${tenant.whatsappPhoneId}/messages`;
    const components = opts.bodyVariables?.length
      ? [
          {
            type: 'body',
            parameters: opts.bodyVariables.map((v) => ({ type: 'text', text: v })),
          },
        ]
      : undefined;
    const body = {
      messaging_product: 'whatsapp',
      to: toE164(opts.toPhone).replace('+', ''),
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: opts.languageCode ?? 'en' },
        ...(components && { components }),
      },
    };

    let success = false;
    let resp: unknown;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      resp = await res.json().catch(() => null);
      success = res.ok;
      if (!res.ok) logger.warn({ status: res.status, body: resp }, 'WhatsApp template send failed');
    } catch (e) {
      logger.error({ err: e }, 'WhatsApp template send threw');
    }

    if (opts.leadId) {
      await prisma.leadActivity.create({
        data: {
          tenantId: opts.tenantId,
          leadId: opts.leadId,
          type: success ? 'WHATSAPP_SENT' : 'SYSTEM',
          title: success
            ? `WhatsApp template "${opts.templateName}" sent`
            : `WhatsApp template "${opts.templateName}" FAILED`,
          metadata: { template: opts.templateName, vars: opts.bodyVariables, response: resp ?? null } as Prisma.JsonObject,
        },
      });
    }
    return { sent: success, response: resp };
  },

  /** Send free-form text. Caller must ensure 24h window — Meta will reject if outside. */
  async sendText(opts: { tenantId: string; leadId?: string; toPhone: string; text: string }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: opts.tenantId } });
    if (!tenant?.whatsappPhoneId || !tenant?.whatsappToken) {
      return { sent: false, skipped: 'tenant_not_configured' };
    }
    const token = decrypt(tenant.whatsappToken);
    const url = `${GRAPH_BASE}/${tenant.whatsappPhoneId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to: toE164(opts.toPhone).replace('+', ''),
      type: 'text',
      text: { body: opts.text },
    };
    let success = false;
    let resp: unknown;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      resp = await res.json().catch(() => null);
      success = res.ok;
    } catch (e) {
      logger.error({ err: e }, 'WhatsApp text send threw');
    }
    if (opts.leadId) {
      await prisma.leadActivity.create({
        data: {
          tenantId: opts.tenantId,
          leadId: opts.leadId,
          type: success ? 'WHATSAPP_SENT' : 'SYSTEM',
          title: success ? 'WhatsApp message sent' : 'WhatsApp message FAILED',
          body: opts.text.slice(0, 1000),
          metadata: { response: resp ?? null } as Prisma.JsonObject,
        },
      });
    }
    return { sent: success, response: resp };
  },

  /**
   * Process an inbound webhook payload.
   * Already passed HMAC + replay middleware. Map message → lead activity.
   */
  async ingestInbound(payload: WhatsAppInboundPayload) {
    const out = [];
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const phoneNumberId = change.value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const tenant = await prisma.tenant.findFirst({
          where: { whatsappPhoneId: phoneNumberId },
        });
        if (!tenant) {
          logger.warn({ phoneNumberId }, 'WhatsApp inbound — no tenant for phone-number-id');
          continue;
        }

        for (const msg of change.value?.messages ?? []) {
          const fromE164 = `+${msg.from.replace(/\D/g, '')}`;
          let lead = await prisma.lead.findFirst({
            where: { tenantId: tenant.id, OR: [{ phone: fromE164 }, { whatsapp: fromE164 }] },
          });
          if (!lead) {
            // Auto-create lead from inbound WhatsApp
            const contactName = change.value?.contacts?.[0]?.profile?.name ?? 'WhatsApp Lead';
            lead = await prisma.lead.create({
              data: {
                tenantId: tenant.id,
                fullName: contactName,
                phone: fromE164,
                whatsapp: fromE164,
                source: 'WHATSAPP',
                sourceDetail: 'Inbound WhatsApp message',
              },
            });
          }

          await prisma.leadActivity.create({
            data: {
              tenantId: tenant.id,
              leadId: lead.id,
              type: 'WHATSAPP_RECEIVED',
              title: 'Inbound WhatsApp message',
              body: msg.text?.body?.slice(0, 4000) ?? `[${msg.type}]`,
              metadata: { messageId: msg.id, timestamp: msg.timestamp } as Prisma.JsonObject,
            },
          });

          await prisma.lead.update({
            where: { id: lead.id },
            data: { lastContactedAt: new Date() },
          });
          out.push({ leadId: lead.id, messageId: msg.id });
        }
      }
    }
    return out;
  },

  /** Save (encrypted) WhatsApp credentials on the tenant. */
  async saveTenantCredentials(tenantId: string, c: {
    whatsappPhoneId?: string;
    whatsappBizId?: string;
    whatsappToken?: string;
  }) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneId: c.whatsappPhoneId ?? undefined,
        whatsappBizId: c.whatsappBizId ?? undefined,
        whatsappToken: c.whatsappToken ? encrypt(c.whatsappToken) : undefined,
      },
      select: { id: true, whatsappPhoneId: true, whatsappBizId: true },
    });
  },
};
