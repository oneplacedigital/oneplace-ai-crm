'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-store';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-pipely-gradient p-12 text-white md:flex">
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-100">Pipely</div>
          <div className="mt-2 text-3xl font-bold">Your AI Pipeline.<br/>Built to Convert.</div>
        </div>
        <div className="space-y-4 text-sm text-white/85">
          <p>"From Meta Lead to Paying Customer — fully automated."</p>
          <ul className="space-y-2">
            <li>✓ AI lead qualification & scoring</li>
            <li>✓ WhatsApp + Email automation</li>
            <li>✓ Meta Conversion API on every status change</li>
            <li>✓ Counselor performance dashboards</li>
            <li>✓ Multi-workspace with license keys</li>
          </ul>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-white p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-ink-500">Sign in to Pipely</h1>
            <p className="text-sm text-slate-500">Access your pipeline workspace</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" className="btn-gradient w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Create your workspace
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
