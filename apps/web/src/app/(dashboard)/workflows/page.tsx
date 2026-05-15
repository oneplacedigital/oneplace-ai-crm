'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Zap, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { PIPELINE_STAGES } from '@oneplace/types';

interface Workflow {
  id: string;
  name: string;
  isActive: boolean;
  trigger: string;
  triggerStatuses: string[];
  actions: Array<{ type: string; params: Record<string, unknown> }>;
  _count?: { runs: number };
}

export default function WorkflowsPage() {
  const { data, mutate } = useSWR<Workflow[]>('/workflows', apiGet);
  const [showNew, setShowNew] = useState(false);

  async function toggle(id: string, isActive: boolean) {
    await apiPatch(`/workflows/${id}`, { isActive });
    mutate();
  }
  async function remove(id: string) {
    if (!confirm('Delete this workflow?')) return;
    await apiDelete(`/workflows/${id}`);
    mutate();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Workflows</h1>
          <p className="text-sm text-slate-500">Automate WhatsApp, Meta events, follow-ups, and assignments.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data?.map((w) => (
          <div key={w.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-brand" />
                  <div className="font-bold text-navy-500">{w.name}</div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Trigger: <strong>{w.trigger}</strong>
                  {w.triggerStatuses.length > 0 && ` · when status → ${w.triggerStatuses.join(', ')}`}
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={w.isActive}
                  onChange={(e) => toggle(w.id, e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-xs">{w.isActive ? 'On' : 'Off'}</span>
              </label>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {w.actions.map((a, i) => (
                <li key={i} className="rounded bg-slate-50 px-3 py-1.5">
                  <span className="font-mono text-xs text-brand">{a.type}</span>
                  {Object.keys(a.params).length > 0 && (
                    <span className="ml-2 text-xs text-slate-500">
                      {JSON.stringify(a.params).slice(0, 80)}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{w._count?.runs ?? 0} runs</span>
              <button
                onClick={() => remove(w.id)}
                className="inline-flex items-center gap-1 text-red-600 hover:underline"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
        {data && data.length === 0 && (
          <div className="card col-span-full p-10 text-center text-sm text-slate-500">
            No workflows yet. Click <strong>New Workflow</strong> to automate a follow-up.
          </div>
        )}
      </div>

      {showNew && <NewWorkflow onClose={() => setShowNew(false)} onCreated={() => mutate()} />}
    </div>
  );
}

function NewWorkflow({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('LEAD_CREATED');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [actionType, setActionType] = useState('SEND_WHATSAPP_TEMPLATE');
  const [actionJson, setActionJson] = useState('{"templateName":"oneplace_welcome","language":"en"}');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const params = JSON.parse(actionJson || '{}');
      await apiPost('/workflows', {
        name,
        trigger,
        triggerStatuses: trigger === 'LEAD_STATUS_CHANGED' ? statuses : [],
        actions: [{ type: actionType, params }],
      });
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={save} className="card w-full max-w-lg space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">New Workflow</h3>
        <input
          className="input"
          placeholder="Workflow name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="LEAD_CREATED">When a lead is created</option>
          <option value="LEAD_STATUS_CHANGED">When status changes</option>
          <option value="LEAD_ASSIGNED">When lead is assigned</option>
        </select>

        {trigger === 'LEAD_STATUS_CHANGED' && (
          <div>
            <label className="text-xs font-semibold text-slate-500">Fire when status → one of:</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {PIPELINE_STAGES.map((s) => {
                const on = statuses.includes(s.status);
                return (
                  <button
                    key={s.status}
                    type="button"
                    onClick={() =>
                      setStatuses((prev) =>
                        prev.includes(s.status) ? prev.filter((x) => x !== s.status) : [...prev, s.status],
                      )
                    }
                    className={`rounded-full px-2 py-1 text-xs ${
                      on ? 'bg-brand text-white' : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <select
          className="input"
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
        >
          <option value="SEND_WHATSAPP_TEMPLATE">Send WhatsApp template</option>
          <option value="ASSIGN_COUNSELOR">Assign counselor (round-robin)</option>
          <option value="SET_FOLLOWUP">Set follow-up reminder</option>
          <option value="SET_STATUS">Set status</option>
          <option value="SEND_META_EVENT">Send Meta Conversion event</option>
          <option value="NOTIFY_COUNSELOR">Notify counselor</option>
        </select>
        <textarea
          className="input min-h-[80px] font-mono text-xs"
          placeholder='{"templateName":"oneplace_welcome","language":"en"}'
          value={actionJson}
          onChange={(e) => setActionJson(e.target.value)}
        />
        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
