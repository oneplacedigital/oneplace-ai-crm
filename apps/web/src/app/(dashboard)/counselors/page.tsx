'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, KeyRound, MailCheck, Copy, Check } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import type { UserRole } from '@oneplace/types';

interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export default function CounselorsPage() {
  const me = useAuth((s) => s.user);
  const { data, mutate } = useSWR<UserRow[]>('/users', apiGet);
  const [showNew, setShowNew] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [setPassFor, setSetPassFor] = useState<UserRow | null>(null);

  const canManage = me?.role === 'TENANT_ADMIN' || me?.role === 'MANAGER';
  const isAdmin = me?.role === 'TENANT_ADMIN' || me?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Counselors & Team</h1>
          <p className="text-sm text-slate-500">Users in your institute workspace.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Password</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold text-navy-500">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-slate-100 text-slate-700">{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${
                      u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-secondary !px-2.5 !py-1.5 text-xs"
                        title="Email a password reset link to this user"
                        onClick={() => setResetFor(u)}
                      >
                        <MailCheck size={14} /> Send reset
                      </button>
                      <button
                        className="btn-secondary !px-2.5 !py-1.5 text-xs"
                        title="Set a new password for this user"
                        onClick={() => setSetPassFor(u)}
                      >
                        <KeyRound size={14} /> Set password
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && canManage && (
        <NewUserModal onClose={() => setShowNew(false)} onCreated={() => mutate()} />
      )}
      {resetFor && isAdmin && (
        <SendResetModal user={resetFor} onClose={() => setResetFor(null)} />
      )}
      {setPassFor && isAdmin && (
        <SetPasswordModal user={setPassFor} onClose={() => setSetPassFor(null)} />
      )}
    </div>
  );
}

function SendResetModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ resetUrl: string; emailed: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiPost<{ resetUrl: string; emailed: boolean }>(
        `/users/${user.id}/send-reset`,
      );
      setResult(r);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <div className="card w-full max-w-md space-y-4 p-6">
        <h3 className="text-lg font-bold text-navy-500">Password reset — {user.name}</h3>
        {!result ? (
          <>
            <p className="text-sm text-slate-600">
              This creates a secure one-time reset link for <b>{user.email}</b> (valid 60
              minutes), emails it to them, and gives you a copy to share on WhatsApp if needed.
            </p>
            {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={send} disabled={loading}>
                {loading ? 'Creating…' : 'Create reset link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className={`rounded px-3 py-2 text-sm ${
                result.emailed
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {result.emailed
                ? 'Reset email sent to the user.'
                : 'Email not configured — share the link below manually.'}
            </div>
            <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 p-2">
              <code className="flex-1 break-all text-xs text-slate-700">{result.resetUrl}</code>
              <button className="btn-secondary !px-2 !py-1.5" onClick={copy} title="Copy link">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await apiPost(`/users/${user.id}/set-password`, { password });
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">Set password — {user.name}</h3>
        {done ? (
          <>
            <div className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated. The user&apos;s old sessions were signed out.
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Choose a new password for <b>{user.email}</b>. Share it with them securely — they
              can change it later.
            </p>
            <input
              type="password"
              className="input"
              placeholder="New password (min 8 chars)"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function NewUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'COUNSELOR' as UserRole,
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiPost('/users', form);
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
        <h3 className="text-lg font-bold text-navy-500">Add Team Member</h3>
        <input
          className="input"
          placeholder="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          className="input"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <select
          className="input"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
        >
          <option value="COUNSELOR">Counselor</option>
          <option value="MANAGER">Manager</option>
          <option value="VIEWER">Viewer</option>
          <option value="TENANT_ADMIN">Tenant Admin</option>
        </select>
        <input
          type="password"
          className="input"
          placeholder="Temporary password (min 8 chars)"
          minLength={8}
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}
