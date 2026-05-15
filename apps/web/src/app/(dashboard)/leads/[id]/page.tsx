'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import AIAssistant from '@/components/AIAssistant';
import { PIPELINE_STAGES, LeadStatus, ActivityType } from '@oneplace/types';
import { dateTime } from '@/lib/format';

interface LeadDetail {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  status: LeadStatus;
  source: string;
  notes: string | null;
  score: number;
  priority: number;
  aiSummary: string | null;
  aiNextAction: string | null;
  assignedTo: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
  createdAt: string;
  activities: {
    id: string;
    type: ActivityType;
    title: string;
    body: string | null;
    createdAt: string;
    user: { id: string; name: string } | null;
  }[];
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, mutate } = useSWR<LeadDetail>(params?.id ? `/leads/${params.id}` : null, apiGet);
  const [noteText, setNoteText] = useState('');

  async function setStatus(status: LeadStatus) {
    await apiPost(`/leads/${params!.id}/transition`, { status });
    mutate();
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await apiPost(`/leads/${params!.id}/activities`, {
      type: 'NOTE',
      title: 'Counselor note',
      body: noteText,
    });
    setNoteText('');
    mutate();
  }

  if (!data) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Lead</div>
          <h1 className="text-2xl font-bold text-navy-500">{data.fullName}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            <span>{data.phone}</span>
            {data.email && <span>· {data.email}</span>}
            {data.city && <span>· {data.city}</span>}
            <span>· Score: <strong className="text-brand">{data.score}</strong></span>
          </div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <section className="card p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-navy-500">
          Move through pipeline
        </h3>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s.status}
              onClick={() => setStatus(s.status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                data.status === s.status
                  ? 'bg-brand text-white'
                  : 'border border-slate-300 bg-white text-navy-500 hover:bg-slate-100'
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setStatus('LOST')}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Mark Lost
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-navy-500">
              Add note / log activity
            </h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="What did you discuss with the lead?"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button onClick={addNote} className="btn-primary" disabled={!noteText.trim()}>
                Log
              </button>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-navy-500">
              Activity timeline
            </h3>
            <ul className="space-y-3">
              {data.activities.map((a) => (
                <li key={a.id} className="flex gap-3 border-l-2 border-brand pl-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy-500">{a.title}</div>
                    {a.body && <div className="whitespace-pre-wrap text-sm text-slate-600">{a.body}</div>}
                    <div className="mt-1 text-xs text-slate-400">
                      {a.type} · {a.user?.name ?? 'System'} · {dateTime(a.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
              {data.activities.length === 0 && (
                <li className="text-sm text-slate-500">No activity yet.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-5">
          <AIAssistant leadId={data.id} onRefresh={mutate} />

          {data.aiSummary && (
            <section className="card p-5">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy-500">
                AI Summary
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{data.aiSummary}</p>
            </section>
          )}
          {data.aiNextAction && (
            <section className="card p-5">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-navy-500">
                Next Action (AI-suggested)
              </h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{data.aiNextAction}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
