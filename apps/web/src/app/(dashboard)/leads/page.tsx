'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Search, Plus } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import type { PaginatedResponse } from '@oneplace/types';
import { LeadStatus, LeadSource, PIPELINE_STAGES } from '@oneplace/types';
import { StatusBadge } from '@/components/StatusBadge';
import { dateShort } from '@/lib/format';

interface LeadRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: LeadStatus;
  source: LeadSource;
  priority: number;
  score: number;
  city: string | null;
  createdAt: string;
  assignedTo?: { id: string; name: string } | null;
  course?: { id: string; name: string; code: string | null } | null;
}

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    ...(search && { search }),
    ...(status && { status }),
  });

  const { data, mutate } = useSWR<PaginatedResponse<LeadRow>>(
    `/leads?${qs.toString()}`,
    apiGet,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Leads</h1>
          <p className="text-sm text-slate-500">
            {data?.total ?? 0} total · showing page {data?.page ?? 1} of {data?.totalPages ?? 1}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New Lead
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="input max-w-[200px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as LeadStatus | '');
          }}
        >
          <option value="">All statuses</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.status} value={s.status}>
              {s.label}
            </option>
          ))}
          <option value="LOST">Lost</option>
          <option value="COLD">Cold</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-navy-500">{l.fullName}</div>
                  <div className="text-xs text-slate-500">{l.email ?? '—'}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{l.phone}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{l.source}</td>
                <td className="px-4 py-3 text-xs">{l.assignedTo?.name ?? '—'}</td>
                <td className="px-4 py-3">{l.score}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{dateShort(l.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/leads/${l.id}`} className="text-xs font-semibold text-brand hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  No leads yet — click <strong>New Lead</strong> to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            className="btn-ghost disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            className="btn-ghost disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} onCreated={() => mutate()} />}
    </div>
  );
}

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', city: 'Nashik' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiPost('/leads', form);
      onCreated();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">New Lead</h3>
        <input
          className="input"
          placeholder="Full name"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <input
          className="input"
          placeholder="Phone (+919XXXXXXXXX)"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          type="email"
          className="input"
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
