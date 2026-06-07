'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiPost } from '@/lib/api';

export const dynamic = 'force-dynamic';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await apiPost('/auth/reset-password', { token, password });
      setDone(true);
    } catch (e: unknown) {
      setErr(
        e instanceof Error
          ? e.message
          : 'This link may have expired. Request a new one and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded bg-amber-50 px-3 py-3 text-sm text-amber-700">
          This reset link is missing its token. Please use the full link from your email, or
          request a new one.
        </div>
        <Link href="/forgot-password" className="btn-primary block w-full text-center">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          Your password has been updated. Sign in with your new password.
        </div>
        <Link href="/login" className="btn-primary block w-full text-center">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          New password
        </label>
        <input
          type="password"
          className="input"
          minLength={8}
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Confirm password
        </label>
        <input
          type="password"
          className="input"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the password"
        />
      </div>
      {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card w-full max-w-sm space-y-5 p-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-500">Pipora</div>
          <h1 className="mt-1 text-2xl font-bold text-navy-500">Choose a new password</h1>
        </div>
        <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
