'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Shield, Plus, Ban, Power, KeyRound, Building2, CheckCircle2, XCircle } from 'lucide-react';
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
  approvalStatus: string;
  rejectedReason: string | null;
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
  const [grantFor, setGrantFor] = useState<Tenant | null>(null);

  const pendingCount = tenants?.filter((t) => t.approvalStatus === 'PENDING').length ?? 0;

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

  async function approve(id: string, name: string) {
    if (!confirm(`Approve "${name}"? They will get full access immediately.`)) return;
    await apiPost(`/super-admin/tenants/${id}/approve`, {});
    mutateTenants();
  }

  async function reject(id: string, name: string) {
    const reason = prompt(`Reject "${name}"?\nReason (shown to the applicant):`);
    if (!reason) return;
    await apiPost(`/super-admin/tenants/${id}/reject`, { reason });
    mutateTenants();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-brand" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Super Admin</h1>
          <p className="text-sm text-slate-500">Approve signups, manage businesses and license keys.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPI label="Businesses" value={stats?.totalTenants ?? 0} icon={Building2} />
        <KPI label="Pending approval" value={pendingCount} icon={CheckCircle2} />
        <KPI label="Leads (all)" value={stats?.totalLeads ?? 0} />
        <KPI label="Active licenses" value={stats?.activeLicenses ?? 0} icon={KeyRound} />
      </div>

      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{pendingCount}</strong> {pendingCount === 1 ? 'business is' : 'businesses are'}{' '}
          waiting for your approval — see the Pending rows below.
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-semibold ${
            tab === 'tenants' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'
          }`}
          onClick={() => setTab('tenants')}
        >
          Businesses ({tenants?.length ?? 0})
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
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Stats</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants?.map((t) => (
                <tr key={t.id} className={t.approvalStatus === 'PENDING' ? 'bg-amber-50/60' : ''}>
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
                    {t.approvalStatus === 'PENDING' ? (
                      <span className="badge bg-amber-100 text-amber-700">Pending</span>
                    ) : t.approvalStatus === 'REJECTED' ? (
                      <span className="badge bg-red-100 text-red-700" title={t.rejectedReason ?? ''}>
                        Rejected
                      </span>
                    ) : t.isSuspended ? (
                      <span className="badge bg-red-100 text-red-700" title={t.suspendedReason ?? ''}>
                        Suspended
                      </span>
                    ) : t.isActive ? (
                      <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      const a = accessInfo(t);
                      return <span className={a.cls}>{a.label}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {t.stats.users}u · {t.stats.leads}l · {t.stats.emailSends}e
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{dateShort(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.approvalStatus === 'PENDING' ? (
                      <div className="flex justify-end gap-3">
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                          onClick={() => approve(t.id, t.name)}
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => reject(t.id, t.name)}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    ) : t.approvalStatus === 'REJECTED' ? (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                        onClick={() => approve(t.id, t.name)}
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                          onClick={() => setGrantFor(t)}
                        >
                          <KeyRound size={12} /> Grant access
                        </button>
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
                      </div>
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

      {grantFor && (
        <GrantAccessModal
          tenant={grantFor}
          onClose={() => setGrantFor(null)}
          onDone={() => {
            setGrantFor(null);
            mutateTenants();
          }}
        />
      )}
    </div>
  );
}

function accessInfo(t: Tenant): { label: string; cls: string } {
  const ends = [t.licenseExpiresAt, t.trialEndsAt]
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime());
  if (!ends.length) return { label: '—', cls: 'text-slate-400' };
  const days = Math.ceil((Math.max(...ends) - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Expired', cls: 'font-semibold text-red-600' };
  if (days === 0) return { label: 'Ends today', cls: 'font-semibold text-red-600' };
  if (days <= 7) return { label: `${days}d left`, cls: 'font-semibold text-amber-600' };
  return { label: `${days}d left`, cls: 'text-emerald-600' };
}

function GrantAccessModal({
  tenant,
  onClose,
  onDone,
}: {
  tenant: Tenant;
  onClose: () => void;
  onDone: () => void;
}) {
  const [days, setDays] = useState<number>(180);
  const [customDays, setCustomDays] = useState<number>(30);
  const [plan, setPlan] = useState<string>(tenant.plan === 'TRIAL' ? 'PRO' : tenant.plan);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current = accessInfo(tenant);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const extendDays = days === -1 ? customDays : days;
      await apiPost(`/super-admin/tenants/${tenant.id}/plan`, { plan, extendDays });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to grant access');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">Grant access</h3>
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-navy-500">{tenant.name}</span> — current access:{' '}
          <span className={current.cls}>{current.label}</span>
        </p>

        <div>
          <label className="text-xs font-semibold text-slate-500">Access duration (from today)</label>
          <select
            className="input"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={14}>14 days (extend trial)</option>
            <option value={30}>1 month</option>
            <option value={90}>3 months</option>
            <option value={180}>6 months</option>
            <option value={365}>1 year</option>
            <option value={-1}>Custom…</option>
          </select>
        </div>

        {days === -1 && (
          <div>
            <label className="text-xs font-semibold text-slate-500">Custom days</label>
            <input
              type="number"
              className="input"
              min={1}
              max={3650}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value))}
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-500">Plan</label>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="TRIAL">Trial</option>
          </select>
        </div>

        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Granting…' : 'Grant access'}
          </button>
        </div>
      </form>
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: number | string; icon?: any }) {
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
          <p className="mt-2 text-sm text-slate-600">Share this code. They redeem it at /register.</p>
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
          placeholder="Custom code (optional, e.g. KLOZENT-2026)"
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
