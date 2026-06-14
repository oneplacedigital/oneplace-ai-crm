'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await apiPost('/auth/forgot-password', { email });
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="card w-full max-w-sm space-y-5 p-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand">Klozent</div>
          <h1 className="mt-1 text-2xl font-bold text-navy-500">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your account email and we&apos;ll send you a secure reset link.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              If an account exists for <b>{email}</b>, a reset link is on its way. It is valid
              for 60 minutes — check spam too.
            </div>
            <Link href="/login" className="btn-primary block w-full text-center">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                type="email"
                className="input"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-slate-500">
              Remembered it?{' '}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
