'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

interface LicenseInfo {
  valid: boolean;
  plan: string;
  validForDays: number;
  name: string | null;
}

function RegisterForm() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    tenantName: '',
    tenantSlug: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    licenseCode: params?.get('code') ?? '',
  });
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function validateLicense() {
    if (!form.licenseCode.trim()) {
      setLicenseInfo(null);
      setLicenseError(null);
      return;
    }
    setValidating(true);
    setLicenseError(null);
    try {
      const info = await apiPost<LicenseInfo>('/licenses/validate', { code: form.licenseCode });
      setLicenseInfo(info);
    } catch (e) {
      setLicenseError(e instanceof Error ? e.message : 'Invalid code');
      setLicenseInfo(null);
    } finally {
      setValidating(false);
    }
  }

  useEffect(() => {
    if (form.licenseCode && form.licenseCode.length >= 8) {
      const t = setTimeout(validateLicense, 500);
      return () => clearTimeout(t);
    }
    setLicenseInfo(null);
    setLicenseError(null);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.licenseCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ pending: boolean; message: string }>('/auth/register-tenant', {
        ...form,
        tenantSlug: form.tenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        licenseCode: form.licenseCode || undefined,
      });
      setSubmitted(
        res.message ??
          'Your workspace has been created and is awaiting approval. You will be notified by email once approved.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="card w-full max-w-md space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          <h1 className="text-2xl font-bold text-navy-500">Workspace created!</h1>
          <p className="text-sm text-slate-600">{submitted}</p>
          <Link href="/login" className="btn-primary inline-flex">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-lg space-y-4 p-8">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Create your Klozent workspace</h1>
          <p className="text-sm text-slate-500">
            Sign up free. Have a license code? Enter below for premium access. New accounts are
            reviewed before activation.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500">License Code (optional)</label>
          <input
            className="input font-mono"
            placeholder="e.g. KLOZENT-2026"
            value={form.licenseCode}
            onChange={update('licenseCode')}
          />
          {validating && <p className="mt-1 text-xs text-slate-500">Checking...</p>}
          {licenseInfo && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 size={14} />
              <span>
                Valid! <strong>{licenseInfo.plan}</strong> plan for{' '}
                <strong>{licenseInfo.validForDays} days</strong>
                {licenseInfo.name && ` (${licenseInfo.name})`}
              </span>
            </div>
          )}
          {licenseError && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {licenseError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Business / Workspace Name</label>
            <input
              className="input"
              required
              placeholder="e.g. Acme Marketing"
              value={form.tenantName}
              onChange={update('tenantName')}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">URL Slug</label>
            <input
              className="input"
              required
              placeholder="acme-marketing"
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

        <button
          type="submit"
          className="btn-gradient w-full"
          disabled={loading || (form.licenseCode.length > 0 && !licenseInfo)}
        >
          {loading ? 'Creating...' : 'Create workspace'}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
