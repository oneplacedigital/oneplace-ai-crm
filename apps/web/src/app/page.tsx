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
        <p className="mt-3 text-xl text-slate-300 md:text-2xl">
          Your AI Pipeline. Built to Convert.
        </p>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Capture leads from Meta Ads, automate WhatsApp + email follow-ups, score with AI, fire
          Meta Conversion API events on every status change. Built for education, coaching, and
          digital marketing businesses.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/register" className="btn-gradient">
            Start free trial
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid w-fu