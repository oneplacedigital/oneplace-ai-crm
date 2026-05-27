'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiGet, apiPost, api } from '@/lib/api';
import { Plug, ShieldCheck, AlertTriangle, Code, Copy } from 'lucide-react';

interface Status {
  meta: { configured: boolean; pixelId: string | null; adAccountId: string | null; tokenSet: boolean };
  whatsapp: { configured: boolean; phoneNumberId: string | null; businessAccountId: string | null; tokenSet: boolean };
}

interface Me {
  tenantSlug: string;
  tenantName: string;
}

export default function IntegrationsPage() {
  const { data, mutate } = useSWR<Status>('/integrations/status', apiGet);
  const { data: me } = useSWR<Me>('/auth/me', apiGet);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500">Integrations</h1>
        <p className="text-sm text-slate-500">
          Connect Meta Ads + WhatsApp Cloud API. Tokens are encrypted at rest (AES-256-GCM).
        </p>
      </div>

      <WebsiteFormCard slug={me?.tenantSlug ?? ''} />
      <MetaCard status={data?.meta} onSaved={() => mutate()} />
      <WhatsAppCard status={data?.whatsapp} onSaved={() => mutate()} />
    </div>
  );
}

const PUBLIC_API_BASE = 'https://oneplace-api.onrender.com';

function buildSnippet(slug: string): string {
  return [
    '<form id="pipely-lead" style="max-width:380px;font-family:system-ui;display:flex;flex-direction:column;gap:10px">',
    '  <input name="fullName" placeholder="Your name" required style="padding:10px;border:1px solid #ccc;border-radius:6px"/>',
    '  <input name="phone" placeholder="Phone (+91...)" required style="padding:10px;border:1px solid #ccc;border-radius:6px"/>',
    '  <input name="email" type="email" placeholder="Email (optional)" style="padding:10px;border:1px solid #ccc;border-radius:6px"/>',
    '  <textarea name="message" placeholder="How can we help?" style="padding:10px;border:1px solid #ccc;border-radius:6px;min-height:80px"></textarea>',
    '  <input type="text" name="_hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"/>',
    '  <button type="submit" style="background:#DB0000;color:#fff;padding:12px;border:none;border-radius:6px;font-weight:bold;cursor:pointer">Send enquiry</button>',
    '  <div id="pipely-status" style="font-size:13px;color:#555"></div>',
    '</form>',
    '<script>',
    '(function(){',
    "  var f=document.getElementById('pipely-lead'),s=document.getElementById('pipely-status');",
    "  f.addEventListener('submit',async function(e){",
    "    e.preventDefault();s.textContent='Sending...';",
    '    var d=Object.fromEntries(new FormData(f).entries());d.sourceDetail=location.href;',
    `    try{var r=await fetch('${PUBLIC_API_BASE}/api/v1/public/leads/${slug || 'YOUR_SLUG'}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});`,
    "      if(r.ok){s.textContent='Thanks - we will be in touch.';f.reset();}",
    "      else{var j=await r.json().catch(function(){return{};});s.textContent='Error: '+(j.message||r.status);}",
    "    }catch(err){s.textContent='Could not send. Please try again.';}",
    '  });',
    '})();',
    '</script>',
  ].join('\n');
}

function WebsiteFormCard({ slug }: { slug: string }) {
  const snippet = buildSnippet(slug);
  const endpoint = `${PUBLIC_API_BASE}/api/v1/public/leads/${slug || 'YOUR_SLUG'}`;
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3">
        <Code className="text-brand" />
        <div>
          <h2 className="text-lg font-bold text-navy-500">Website / Form Capture</h2>
          <p className="text-xs text-slate-500">
            Drop this snippet onto any website (Shopify, WordPress, custom HTML, landing pages).
            Submissions land in Leads in real time and fire your workflows.
          </p>
        </div>
        <div className="ml-auto">
          <span className="badge bg-emerald-100 text-emerald-700">
            <ShieldCheck size={12} /> Live
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Your public endpoint</label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-slate-100 px-3 py-2 text-xs font-mono">
              {endpoint}
            </code>
            <button
              type="button"
              onClick={() => copy(endpoint)}
              className="btn-secondary inline-flex items-center gap-1 text-xs"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            POST JSON to this URL from any tool to create a lead. No auth required.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500">
              Drop-in HTML form (copy &amp; paste)
            </label>
            <button
              type="button"
              onClick={() => copy(snippet)}
              className="btn-secondary inline-flex items-center gap-1 text-xs"
            >
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy snippet'}
            </button>
          </div>
          <textarea
            readOnly
            value={snippet}
            className="input mt-1 min-h-[260px] font-mono text-[11px] leading-snug"
            onClick={(e) => e.currentTarget.select()}
          />
          <p className="mt-1 text-xs text-slate-500">
            Paste this into any HTML page. Style with your own CSS later. The hidden{' '}
            <code>_hp</code> field is a bot honeypot &mdash; leave it.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <strong className="text-navy-500">Accepted fields:</strong>{' '}
          <code>fullName</code>* &middot; <code>phone</code>* &middot; <code>email</code> &middot;{' '}
          <code>city</code> &middot; <code>message</code> &middot; <code>sourceDetail</code>{' '}
          &middot; <code>utm_source</code> / <code>utm_medium</code> / <code>utm_campaign</code>.
          Same-phone submits within 60s are deduped.
        </div>
      </div>
    </section>
  );
}

function MetaCard({ status, onSaved }: { status?: Status['meta']; onSaved: () => void }) {
  const [pixelId, setPixelId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api('/integrations/meta', {
        method: 'PUT',
        body: JSON.stringify({
          ...(pixelId && { metaPixelId: pixelId }),
          ...(accessToken && { metaAccessToken: accessToken }),
          ...(adAccountId && { metaAdAccountId: adAccountId }),
        }),
      });
      setMsg('Saved.');
      setAccessToken('');
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await apiPost<{ tokenValid: boolean; leadCreated: boolean; message: string }>(
        '/integrations/meta/test',
        {},
      );
      setTestResult({ ok: r.tokenValid, text: r.message });
      if (r.leadCreated) onSaved();
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3">
        <Plug className="text-brand" />
        <div>
          <h2 className="text-lg font-bold text-navy-500">Meta Lead Ads + Conversion API</h2>
          <p className="text-xs text-slate-500">
            Captures Lead Ads webhooks and sends Purchase events back to your Pixel.
          </p>
        </div>
        <div className="ml-auto">
          {status?.configured ? (
            <span className="badge bg-emerald-100 text-emerald-700">
              <ShieldCheck size={12} /> Connected
            </span>
          ) : (
            <span className="badge bg-amber-100 text-amber-700">
              <AlertTriangle size={12} /> Not configured
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Pixel ID</label>
          <input
            className="input"
            placeholder={status?.pixelId ?? 'e.g. 1234567890'}
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Ad Account ID / Page ID</label>
          <input
            className="input"
            placeholder={status?.adAccountId ?? 'act_xxxxxxxxxx'}
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">System User Access Token</label>
          <input
            type="password"
            className="input"
            placeholder={status?.tokenSet ? '••••••• (stored)' : 'EAAB...'}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save credentials'}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold text-navy-500">Test connection</div>
        <p className="mt-1 text-xs text-slate-500">
          Checks your saved token against Meta and drops a sample Meta lead into your pipeline so
          you can confirm the link works.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={runTest} disabled={testing}>
            {testing ? 'Testing…' : 'Run Meta test'}
          </button>
          {testResult && (
            <span
              className={`text-xs font-semibold ${
                testResult.ok ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {testResult.ok ? '✓ ' : '✕ '}
              {testResult.text}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <div className="font-semibold text-navy-500">Webhook setup</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>In Meta App → Webhooks → Add "page" subscription</li>
          <li>Callback URL: <code className="rounded bg-white px-1">https://YOUR-API/webhooks/meta/leads</code></li>
          <li>Verify Token: value of <code>META_VERIFY_TOKEN</code> env var</li>
          <li>Subscribe to <code>leadgen</code> field</li>
        </ol>
      </div>
    </section>
  );
}

function WhatsAppCard({ status, onSaved }: { status?: Status['whatsapp']; onSaved: () => void }) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [bizId, setBizId] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Test send
  const [testPhone, setTestPhone] = useState('');
  const [testTemplate, setTestTemplate] = useState('hello_world');
  const [testResult, setTestResult] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api('/integrations/whatsapp', {
        method: 'PUT',
        body: JSON.stringify({
          ...(phoneNumberId && { whatsappPhoneId: phoneNumberId }),
          ...(bizId && { whatsappBizId: bizId }),
          ...(token && { whatsappToken: token }),
        }),
      });
      setMsg('Saved.');
      setToken('');
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTestResult(null);
    try {
      const r = await apiPost<{ sent: boolean; response?: unknown }>(
        '/integrations/whatsapp/test-template',
        { toPhone: testPhone, templateName: testTemplate, languageCode: 'en_US' },
      );
      setTestResult(r.sent ? 'Sent ✓' : `Failed: ${JSON.stringify(r.response).slice(0, 200)}`);
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : 'Send failed');
    }
  }

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3">
        <Plug className="text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold text-navy-500">WhatsApp Cloud API</h2>
          <p className="text-xs text-slate-500">
            Send templates + free-form, receive inbound messages as activities.
          </p>
        </div>
        <div className="ml-auto">
          {status?.configured ? (
            <span className="badge bg-emerald-100 text-emerald-700">
              <ShieldCheck size={12} /> Connected
            </span>
          ) : (
            <span className="badge bg-amber-100 text-amber-700">
              <AlertTriangle size={12} /> Not configured
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Phone Number ID</label>
          <input
            className="input"
            placeholder={status?.phoneNumberId ?? '123456789012345'}
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Business Account ID</label>
          <input
            className="input"
            placeholder={status?.businessAccountId ?? '987654321098765'}
            value={bizId}
            onChange={(e) => setBizId(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Permanent Access Token</label>
          <input
            type="password"
            className="input"
            placeholder={status?.tokenSet ? '••••••• (stored)' : 'EAAB...'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save credentials'}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold text-navy-500">Test send</div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-slate-500">To phone (+91XXXXXXXXXX)</label>
            <input className="input" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Template name</label>
            <input
              className="input"
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={sendTest}>
            Send test
          </button>
          {testResult && <span className="text-xs text-slate-500">{testResult}</span>}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <div className="font-semibold text-navy-500">Webhook setup</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>WhatsApp Manager → Configuration → Webhook</li>
          <li>Callback URL: <code className="rounded bg-white px-1">https://YOUR-API/webhooks/whatsapp</code></li>
          <li>Verify Token: value of <code>WHATSAPP_VERIFY_TOKEN</code> env var</li>
          <li>Subscribe to <code>messages</code> field</li>
        </ol>
      </div>
    </section>
  );
}
