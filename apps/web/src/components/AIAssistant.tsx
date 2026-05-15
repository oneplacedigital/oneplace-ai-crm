'use client';

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { apiPost } from '@/lib/api';

interface Props {
  leadId: string;
  onRefresh?: () => void;
}

interface ChatEntry {
  role: 'user' | 'ai';
  text: string;
}

export default function AIAssistant({ leadId, onRefresh }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [question, setQuestion] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function score() {
    setBusy('scoring');
    setErr(null);
    try {
      const r = await apiPost<{ score: number; rationale: string }>('/ai/score', { leadId });
      setChat((c) => [...c, { role: 'ai', text: `Score: ${r.score} — ${r.rationale}` }]);
      onRefresh?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI error');
    } finally {
      setBusy(null);
    }
  }

  async function suggest() {
    setBusy('suggesting');
    setErr(null);
    try {
      const r = await apiPost<{ suggestion: string }>('/ai/suggest-followup', { leadId });
      setChat((c) => [...c, { role: 'ai', text: `Suggested follow-up:\n\n${r.suggestion}` }]);
      onRefresh?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI error');
    } finally {
      setBusy(null);
    }
  }

  async function summarize() {
    setBusy('summarizing');
    setErr(null);
    try {
      const r = await apiPost<{ summary: string }>('/ai/summarize', { leadId });
      setChat((c) => [...c, { role: 'ai', text: r.summary }]);
      onRefresh?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI error');
    } finally {
      setBusy(null);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setChat((c) => [...c, { role: 'user', text: q }]);
    setQuestion('');
    setBusy('asking');
    setErr(null);
    try {
      const r = await apiPost<{ answer: string }>('/ai/ask', { leadId, question: q });
      setChat((c) => [...c, { role: 'ai', text: r.answer }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-brand" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-500">AI Assistant</h3>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={!!busy} onClick={score}>
          {busy === 'scoring' ? '…' : 'Score lead'}
        </button>
        <button className="btn-secondary" disabled={!!busy} onClick={suggest}>
          {busy === 'suggesting' ? '…' : 'Suggest follow-up'}
        </button>
        <button className="btn-secondary" disabled={!!busy} onClick={summarize}>
          {busy === 'summarizing' ? '…' : 'Summarize'}
        </button>
      </div>

      {chat.length > 0 && (
        <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          {chat.map((c, i) => (
            <div
              key={i}
              className={c.role === 'user' ? 'text-right text-navy-500' : 'whitespace-pre-wrap text-slate-700'}
            >
              <div className="text-xs font-semibold text-slate-400">{c.role === 'user' ? 'You' : 'AI'}</div>
              <div>{c.text}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={ask} className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask AI about this lead…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!!busy}
        />
        <button className="btn-primary" disabled={!!busy || !question.trim()}>
          <Send size={14} /> Ask
        </button>
      </form>

      {err && <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}

      <p className="mt-2 text-[10px] text-slate-400">
        AI suggestions require counselor approval before sending. Lead data is wrapped in
        delimiters and prompt-injection-hardened.
      </p>
    </section>
  );
}
