'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost, tokens, userCache } from '@/lib/api';
import type { LoginResponse } from '@oneplace/types';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tenantName: '',
    tenantSlug: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<LoginResponse>('/auth/register-tenant', {
        ...form,
        tenantSlug: form.tenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });
      tokens.set(res.accessToken, res.refreshToken);
      userCache.set(res.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-lg space-y-4 p-8">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Create your Institute</h1>
          <p className="text-sm text-slate-500">14-day trial. No card required.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Institute Name</label>
            <input className="input" required value={form.tenantName} onChange={update('tenantName')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">URL Slug</label>
            <input
              className="input"
              required
              placeholder="oneplace"
              value={form.tenantSlug}
              onChange={update('tenantSlug')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Your Name</label>
            <input className="input" required value={form.adminName} onChange={update('adminName')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Phone</label>
            <input className="input" value={form.adminPhone} onChange={update('adminPhone')} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500">Admin Email</label>
          <input
            type="email"
            className="input"
            required
            value={form.adminEmail}
            onChange={update('adminEmail')}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500">Password (min 8 chars)</label>
          <input
            type="password"
            className="input"
            required
            minLength={8}
            value={form.password}
            onChange={update('password')}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create Institute & Start Trial'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
