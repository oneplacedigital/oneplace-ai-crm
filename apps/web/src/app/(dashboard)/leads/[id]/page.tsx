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
  customFields?: Record<string, unknown> | null;
}

interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  placeholder: string | null;
  description: string | null;
  isActive: boolean;
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

  const { data: fieldDefs } = useSWR<CustomFieldDef[]>('/custom-fields', apiGet);

  async function saveCustomFields(values: Record<string, unknown>) {
    await apiPatch(`/leads/${params!.id}`, { customFields: values });
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
          {fieldDefs && fieldDefs.filter((f) => f.isActive).length > 0 && (
            <CustomFieldsSection
              defs={fieldDefs.filter((f) => f.isActive)}
              values={(data.customFields ?? {}) as Record<string, unknown>}
              onSave={saveCustomFields}
            />
          )}
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

function CustomFieldsSection({
  defs,
  values,
  onSave,
}: {
  defs: CustomFieldDef[];
  values: Record<string, unknown>;
  onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(values);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({ ...values });
    setEditing(true);
  }

  async function commit() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function update(key: string, v: unknown) {
    setDraft((d) => ({ ...d, [key]: v }));
  }

  function display(f: CustomFieldDef): string {
    const v = values[f.key];
    if (v == null || v === '') return '—';
    if (f.type === 'BOOLEAN') return v ? 'Yes' : 'No';
    if (f.type === 'DATE') return String(v).slice(0, 10);
    return String(v);
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-500">
          Custom fields
        </h3>
        {!editing ? (
          <button
            className="text-xs font-semibold text-brand hover:underline"
            onClick={startEdit}
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              className="text-xs font-semibold text-slate-500 hover:underline"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="text-xs font-semibold text-brand hover:underline"
              onClick={commit}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <dl className="space-y-3 text-sm">
        {defs.map((f) => (
          <div key={f.id}>
            <dt className="text-xs font-semibold text-slate-500">
              {f.label}
              {f.required && <span className="ml-1 text-red-500">*</span>}
            </dt>
            <dd className="mt-1 text-slate-700">
              {!editing ? (
                <span className="whitespace-pre-wrap">{display(f)}</span>
              ) : (
                <FieldInput
                  def={f}
                  value={draft[f.key]}
                  onChange={(v) => update(f.key, v)}
                />
              )}
              {!editing && f.description && (
                <div className="mt-0.5 text-[11px] text-slate-400">{f.description}</div>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = value == null ? '' : String(value);
  if (def.type === 'TEXTAREA') {
    return (
      <textarea
        className="input min-h-[80px] text-sm"
        placeholder={def.placeholder ?? ''}
        value={v}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (def.type === 'SELECT') {
    return (
      <select
        className="input text-sm"
        value={v}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— choose —</option>
        {(def.options ?? []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (def.type === 'BOOLEAN') {
    return (
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        Yes
      </label>
    );
  }
  const inputType =
    def.type === 'NUMBER' ? 'number' :
    def.type === 'DATE' ? 'date' :
    def.type === 'URL' ? 'url' :
    def.type === 'EMAIL' ? 'email' :
    'text';
  return (
    <input
      type={inputType}
      className="input text-sm"
      placeholder={def.placeholder ?? ''}
      value={v}
      onChange={(e) =>
        onChange(def.type === 'NUMBER' && e.target.value !== '' ? Number(e.target.value) : e.target.value)
      }
    />
  );
}

