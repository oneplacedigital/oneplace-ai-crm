import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-navy-500 text-white">
      <div className="mx-auto flex min-h-screen max-w-oneplace flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 inline-flex rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-50">
          OnePlace Digital Academy
        </div>
        <h1 className="text-balance text-5xl font-bold leading-tight md:text-6xl">
          ONEPLACE <span className="text-brand">AI CRM</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          AI Admissions CRM + Marketing Automation. Capture Meta leads, run your admissions pipeline,
          automate WhatsApp, and convert faster — built for digital marketing institutes, coaching
          classes, academies, and training centers.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="btn-primary">
            Login to CRM
          </Link>
          <Link href="/register" className="btn-secondary">
            Create Institute
          </Link>
        </div>
        <p className="mt-10 text-xs text-slate-400">
          v0.1 · Phase 1 — Leads, Pipeline, Counselor Dashboard
        </p>
      </div>
    </main>
  );
}
