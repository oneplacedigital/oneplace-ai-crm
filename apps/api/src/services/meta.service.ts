/**
 * Meta integration service.
 *
 * RESPONSIBILITIES
 * 1. Lead Ads webhook ingestion (after HMAC + replay checks in middleware).
 *    Pull full lead details from Graph API and create a CRM Lead.
 * 2. Conversion API (CAPI) outbound events on status transitions.
 *    Status → event mapping comes from PRD via META_EVENT_MAP.
 *
 * SECURITY (see SECURITY.md §4–§5)
 * - HMAC verification happens in middleware BEFORE handlers run
 * - Idempotency via WebhookEvent table (UNIQUE provider+externalId)
 * - PII hashed before sending to Meta (SHA-256 normalized)
 * - Tenant access tokens decrypted only inside this module
 */
import { prisma, Prisma } from '@oneplace/db';
import type { LeadStatus, LeadSource } from '@oneplace/types';
import { META_EVENT_MAP } from '@oneplace/types';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { decrypt, encrypt, hashEmail, hashPhone, sha256 } from '../lib/crypto';

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;

interface MetaLeadAdsWebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: 'leadgen';
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      adgroup_id?: string;
      ad_id?: string;
      created_time: number;
    };
  }>;
}

interface MetaLeadDetails {
  id: string;
  created_time: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  field_data: Array<{ name: string; values: string[] }>;
}

/**
 * Resolve which tenant owns a given Meta page_id / form_id.
 * Strategy: tenants store their Meta App tokens, but to map a webhook payload
 * to a tenant we use Tenant.metaAdAccountId or fall back to env-level page→tenant map.
 *
 * In Phase 1 single-tenant deployments, returns the OnePlace tenant.
 */
async function resolveTenantForPage(pageId: string): Promise<string | null> {
  // Heuristic — by ad-account-id stored on tenant, fallback to first tenant
  const t = await prisma.tenant.findFirst({
    where: { OR: [{ metaAdAccountId: pageId }, { slug: 'oneplace' }] },
    orderBy: { createdAt: 'asc' },
  });
  return t?.id ?? null;
}

async function fetchLeadDetails(leadgenId: string, accessToken: string): Promise<MetaLeadDetails> {
  const res = await fetch(`${GRAPH_BASE}/${leadgenId}?access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API fetchLead failed (${res.status}): ${text}`);
  }
  return (await res.json()) as MetaLeadDetails;
}

function mapFieldData(fields: MetaLeadDetails['field_data']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.name.toLowerCase()] = (f.values[0] ?? '').trim();
  }
  return out;
}

export const MetaService = {
  /**
   * Process a Meta Lead Ads webhook entry. Idempotent at the (provider, externalId) level.
   * Returns { created, leadId } or { skipped: reason }.
   */
  async ingestLeadAdsEntry(entry: MetaLeadAdsWebhookEntry) {
    const results = [];
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') continue;
      const v = change.value;
      const tenantId = await resolveTenantForPage(v.page_id);
      if (!tenantId) {
        logger.warn({ pageId: v.page_id }, 'No tenant resolved for Meta page — skipping lead');
        continue;
      }
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) continue;

      if (!tenant.metaAccessToken) {
        logger.warn({ tenantId }, 'Tenant has no Meta access token configured');
        continue;
      }
      const accessToken = decrypt(tenant.metaAccessToken);

      let details: MetaLeadDetails;
      try {
        details = await fetchLeadDetails(v.leadgen_id, accessToken);
      } catch (e) {
        logger.error({ err: e, leadgenId: v.leadgen_id }, 'Meta lead fetch failed');
        continue;
      }

      const fields = mapFieldData(details.field_data);
      const fullName =
        fields['full_name'] || fields['name'] || `${fields['first_name'] ?? ''} ${fields['last_name'] ?? ''}`.trim();
      const phone = fields['phone_number'] || fields['phone'] || '';
      const email = fields['email'] || undefined;
      const city = fields['city'] || 'Nashik';

      if (!phone || !fullName) {
        logger.warn({ leadgenId: v.leadgen_id }, 'Meta lead missing required fields');
        continue;
      }

      // Dedupe by tenant + phone OR metaLeadId
      const existing = await prisma.lead.findFirst({
        where: { tenantId, OR: [{ phone }, { metaLeadId: details.id }] },
      });
      if (existing) {
        results.push({ leadId: existing.id, skipped: 'duplicate' });
        continue;
      }

      const lead = await prisma.lead.create({
        data: {
          tenantId,
          fullName,
          phone,
          email: email?.toLowerCase(),
          whatsapp: phone,
          city,
          source: 'META_ADS' as LeadSource,
          sourceDetail: `Form ${v.form_id}`,
          metaLeadId: details.id,
          metaCampaignId: details.campaign_id ?? null,
          metaAdsetId: details.adset_id ?? null,
          metaAdId: details.ad_id ?? v.ad_id ?? null,
        },
      });
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: lead.id,
          type: 'SYSTEM',
          title: 'Lead captured from Meta Lead Ads',
          metadata: { metaLeadId: details.id, formId: v.form_id },
        },
      });
      results.push({ leadId: lead.id, created: true });
    }
    return results;
  },

  /**
   * Fire Meta Conversion API event for a status transition.
   * No-op when META_EVENT_MAP yields null, or tenant has no access token.
   */
  async sendConversionEvent(opts: {
    tenantId: string;
    leadId: string;
    status: LeadStatus;
    clientIp?: string;
    userAgent?: string;
  }) {
    const eventName = META_EVENT_MAP[opts.status];
    if (!eventName) return { skipped: 'no_mapping' };

    const tenant = await prisma.tenant.findUnique({ where: { id: opts.tenantId } });
    if (!tenant?.metaPixelId || !tenant?.metaAccessToken) {
      return { skipped: 'tenant_not_configured' };
    }
    const lead = await prisma.lead.findUnique({ where: { id: opts.leadId } });
    if (!lead) return { skipped: 'lead_not_found' };

    const accessToken = decrypt(tenant.metaAccessToken);

    const userData: Record<string, unknown> = {};
    if (lead.email) userData['em'] = [hashEmail(lead.email)];
    if (lead.phone) userData['ph'] = [hashPhone(lead.phone)];
    if (lead.fbclid) userData['fbc'] = lead.fbclid;
    if (opts.clientIp) userData['client_ip_address'] = opts.clientIp;
    if (opts.userAgent) userData['client_user_agent'] = opts.userAgent;

    // Stable event_id per lead+status — Meta dedupes
    const eventId = sha256(`${lead.id}:${opts.status}`);
    const eventTimeSec = Math.floor(Date.now() / 1000);

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: eventTimeSec,
          event_id: eventId,
          action_source: 'system_generated',
          user_data: userData,
          custom_data: {
            lead_id: lead.id,
            currency: 'INR',
            ...(lead.budgetInr && { value: lead.budgetInr }),
          },
        },
      ],
      ...(env.META_TEST_EVENT_CODE && { test_event_code: env.META_TEST_EVENT_CODE }),
    };

    const url = `${GRAPH_BASE}/${tenant.metaPixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    let success = false;
    let respBody: unknown;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      respBody = await res.json().catch(() => null);
      success = res.ok;
      if (!res.ok) logger.warn({ status: res.status, body: respBody }, 'Meta CAPI send failed');
    } catch (e) {
      logger.error({ err: e }, 'Meta CAPI send threw');
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metaEventLastSent: new Date(),
        metaEventLastStatus: success ? 'OK' : 'FAILED',
      },
    });
    await prisma.leadActivity.create({
      data: {
        tenantId: opts.tenantId,
        leadId: lead.id,
        type: 'META_EVENT_SENT',
        title: `Meta CAPI: ${eventName} → ${success ? 'sent' : 'failed'}`,
        metadata: { eventName, eventId, success, response: respBody ?? null } as Prisma.JsonObject,
      },
    });

    return { sent: success, eventName, eventId };
  },

  /** Save (encrypted) Meta credentials onto the tenant. */
  async saveTenantCredentials(tenantId: string, c: {
    metaPixelId?: string;
    metaAccessToken?: string;
    metaAdAccountId?: string;
  }) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metaPixelId: c.metaPixelId ?? undefined,
        metaAccessToken: c.metaAccessToken ? encrypt(c.metaAccessToken) : undefined,
        metaAdAccountId: c.metaAdAccountId ?? undefined,
      },
      select: { id: true, metaPixelId: true, metaAdAccountId: true },
    });
  },
};
