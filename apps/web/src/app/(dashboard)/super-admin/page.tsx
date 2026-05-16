'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Shield, Plus, Ban, Power, KeyRound, Building2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { dateShort } from '@/lib/format';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  email: string;
  plan: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedReason: string | null;
  city: string | null;
  createdAt: string;
  trialEndsAt: string | null;
  licenseExpiresAt: string | null;
  licenseCode: string | null;
  licenseName: string | null;
  stats: { users: number; leads: number; emailSends: number };
}

interface Stats {
  totalTenants: number;
  totalLeads: number;
  totalEmails: number;
  activeLicenses: number;
  byPlan: Record<string, number>;
}

interface License {
  id: string;
  code: string;
  name: string | null;
  plan: string;
  status: string;
  validForDays: number;
  maxRedemptions: number;
  redeemedCount: number;
  createdAt: string;
  expiresAt: string | null;
  _count: { redeemedTenants: number };
}

export default function SuperAdminPage() {
  const { data: stats } = useSWR<Stats>('/super-admin/stats', apiGet);
  const { data: tenants, mutate: mutateTenants } = useSWR<Tenant[]>('/super-admin/tenants', apiGet);
  const { data: licenses, mutate: mutateLicenses } = useSWR<License[]>('/licenses', apiGet);
  const [tab, setTab] = useState<'tenants' | 'licenses'>('tenants');
  const [showNewLicense, setShowNewLicense] = useState(false);

  async function suspend(id: string, name: string) {
    const reason = prompt(`Suspend ${name}?\nReason:`);
    if (!reason) return;
    await apiPost(`/super-admin/tenants/${id}/suspend`, { reason });
    mutateTenants();
  }

  async function activate(id: string) {
    await apiPost(`/super-admin/tenants/${id}/activate`, {});
    mutateTenants();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-brand" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Super Admin</h1>
          <p className="text-sm text-slate-500">Manage all tenant accounts and license keys.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPI label="Tenants" value={stats?.totalTenants ?? 0} icon={Building2} />
        <KPI label="Leads (all)" value={stats?.totalLeads ?? 0} />
        <KPI label="Emails sent" value={stats?.totalEmails ?? 0} />
        <KPI label="Active licenses" value={stats?.activeLicenses ?? 0} icon={KeyRound} />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-semibold ${
            tab === 'tenants' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'
          }`}
          onClick={() => setTab('tenants')}
        >
          Tenants ({tenants?.length ?? 0})
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold ${
            tab === 'licenses' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'
          }`}
          onClick={() => setTab('licenses')}
        >
          License Keys ({licenses?.length ?? 0})
        </button>
      </div>

      {tab === 'tenants' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Institute</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Stats</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants?.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-navy-500">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.email}</div>
                    <div className="text-xs text-slate-400">/{t.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-violet-100 text-violet-700">{t.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.licenseCode ? (
                      <>
                        <div className="font-mono">{t.licenseCode}</div>
                        {t.licenseName && <div className="text-slate-400">{t.licenseName}</div>}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.isSuspended ? (
                      <span className="badge bg-red-100 text-red-700" title={t.suspendedReason ?? ''}>
                        Suspended
                      </span>
                    ) : t.isActive ? (
                      <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {t.stats.users}u · {t.stats.leads}l · {t.stats.emailSends}e
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{dateShort(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.isSuspended ? (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                        onClick={() => activate(t.id)}
                      >
                        <Power size={12} /> Activate
                      </button>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => suspend(t.id, t.name)}
                      >
                        <Ban size={12} /> Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'licenses' && (
        <>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setShowNewLicense(true)}>
              <Plus size={16} /> New License Key
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Redemptions</th>
                  <th className="px-4 py-3">Valid (days)</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses?.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono">{l.code}</code>
                    </td>
                    <td className="px-4 py-3 text-sm">{l.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-violet-100 text-violet-700">{l.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        l.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        l.status === 'REDEEMED' ? 'bg-slate-100 text-slate-500' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l.redeemedCount} / {l.maxRedemptions}
                    </td>
                    <td className="px-4 py-3 text-xs">{l.validForDays}d</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{dateShort(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showNewLicense && (
        <NewLicenseModal onClose={() => setShowNewLicense(false)} onCreated={() => mutateLicenses()} />
      )}
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: number | string; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-brand">{value}</div>
    </div>
  );
}

function NewLicenseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    plan: 'STARTER',
    validForDays: 180,
    maxRedemptions: 1,
    customCode: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name || undefined,
        plan: form.plan,
        validForDays: form.validForDays,
        maxRedemptions: form.maxRedemptions,
      };
      if (form.customCode) payload.customCode = form.customCode.toUpperCase();
      const license = await apiPost<{ code: string }>('/licenses', payload);
      setCreated(license);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
        <div className="card w-full max-w-md p-6 text-center">
          <h3 className="text-lg font-bold text-emerald-600">License Created!</h3>
          <p className="mt-2 text-sm text-slate-600">Share this code with students. They redeem it at /register.</p>
          <div className="my-4 rounded-lg bg-slate-100 px-4 py-3">
            <code className="text-lg font-mono font-bold text-navy-500">{created.code}</code>
          </div>
          <button className="btn-primary w-full" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">New License Key</h3>
        <input
          className="input"
          placeholder="Name (e.g. May 2026 Cohort)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
          <option value="TRIAL">Trial</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Valid for (days)</label>
            <input
              type="number"
              className="input"
              min={1}
              max={3650}
              value={form.validForDays}
              onChange={(e) => setForm({ ...form, validForDays: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Max redemptions</label>
            <input
              type="number"
              className="input"
              min={1}
              max={10000}
              value={form.maxRedemptions}
              onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) })}
            />
          </div>
        </div>
        <input
          className="input"
          placeholder="Custom code (optional, e.g. ONEPLACE-MAY-2026)"
          value={form.customCode}
          onChange={(e) => setForm({ ...form, customCode: e.target.value })}
        />
        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create License'}
          </button>
        </div>
      </form>
    </div>
  );
}
