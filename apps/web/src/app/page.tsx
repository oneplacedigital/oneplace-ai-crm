import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-ink-500 text-white">
      <div className="mx-auto flex min-h-screen max-w-pipely flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 inline-flex rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200">
          AI-Powered CRM Platform
        </div>
        <h1 className="text-balance text-5xl font-bold leading-tight md:text-7xl">
          Pipely<span className="bg-pipely-gradient bg-clip-text text-transparent">.</span>
        </h1>
        <p className="mt-3 text-xl text-slate-300 md:text-2xl">Your AI Pipeline. Built to Convert.</p>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Capture leads from Meta Ads, automate WhatsApp + email follow-ups, score with AI, fire Meta Conversion API events on every status change.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/register" className="btn-gradient">Start free trial</Link>
          <Link href="/login" className="btn-secondary">Sign in</Link>
        </div>
        <div className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-6 text-left md:grid-cols-4">
          <Feature title="Meta Lead Ads" body="Auto-capture with HMAC-verified webhooks." />
          <Feature title="WhatsApp Cloud API" body="Send templates, free-form, auto-reply." />
          <Feature title="AI Scoring" body="0-100 score + follow-up suggestions in Hinglish." />
          <Feature title="Email Automation" body="Templates, drip campaigns, unsubscribe handling." />
        </div>
        <p className="mt-12 text-xs text-slate-500">v0.2 - Phase A - License keys, Super Admin, Email automation</p>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-700/50 p-4">
      <div className="text-sm font-semibold text-brand-300">{title}</div>
      <div className="mt-1 text-xs text-slate-400">{body}</div>
    </div>
  );
}
