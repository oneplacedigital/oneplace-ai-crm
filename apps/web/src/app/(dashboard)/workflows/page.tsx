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

interface EmailTemplate {
  id: string;
  name: string;
}

const SOURCE_OPTIONS = [
  'META_ADS', 'GOOGLE_ADS', 'WEBSITE_FORM', 'WHATSAPP',
  'REFERRAL', 'PHONE_CALL', 'MANUAL', 'OTHER',
];
const CONDITION_FIELDS = [
  { value: 'source', label: 'Lead Source' },
  { value: 'city', label: 'City' },
  { value: 'status', label: 'Status' },
  { value: 'score', label: 'Score' },
];
const CONDITION_OPS = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];
type Rule = { field: string; operator: string; value: string };

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
          <p className="text-sm text-slate-500">Automate email, WhatsApp, follow-ups, and assignments.</p>
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

            {(() => {
              const cond = w.actions.find((a) => a.type === 'CONDITIONS');
              if (!cond) return null;
              const cRules = (cond.params.rules as Rule[] | undefined) ?? [];
              const m = String(cond.params.match ?? 'ALL');
              return (
                <div className="mt-2 rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                  Only if {m} match:{' '}
                  {cRules.map((r) => `${r.field} ${r.operator} ${r.value}`).join(', ')}
                </div>
              );
            })()}
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {w.actions.filter((a) => a.type !== 'CONDITIONS').map((a, i) => (
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
  const { data: templates } = useSWR<EmailTemplate[]>('/emails/templates', apiGet);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('LEAD_CREATED');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [actionType, setActionType] = useState('SEND_EMAIL');
  const [emailTemplateId, setEmailTemplateId] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [actionJson, setActionJson] = useState('{"templateName":"oneplace_welcome","language":"en"}');
  const [match, setMatch] = useState('ALL');
  const [rules, setRules] = useState<Rule[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addRule() {
    setRules((r) => [...r, { field: 'source', operator: 'equals', value: '' }]);
  }
  function updateRule(i: number, patch: Partial<Rule>) {
    setRules((r) => r.map((rule, idx) => (idx === i ? { ...rule, ...patch } : rule)));
  }
  function removeRule(i: number) {
    setRules((r) => r.filter((_, idx) => idx !== i));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      let params: Record<string, unknown>;
      if (actionType === 'SEND_EMAIL') {
        if (!emailTemplateId) {
          setErr('Please choose an email template to send.');
          setSaving(false);
          return;
        }
        params = { templateId: emailTemplateId };
      } else if (actionType === 'NOTIFY_ADMIN') {
        params = notifyEmail.trim() ? { toEmail: notifyEmail.trim() } : {};
      } else {
        params = JSON.parse(actionJson || '{}');
      }
      const builtActions: Array<{ type: string; params: Record<string, unknown> }> = [
        { type: actionType, params },
      ];
      const validRules = rules.filter((r) => r.field && r.operator);
      if (validRules.length > 0) {
        builtActions.unshift({ type: 'CONDITIONS', params: { match, rules: validRules } });
      }
      await apiPost('/workflows', {
        name,
        trigger,
        triggerStatuses: trigger === 'LEAD_STATUS_CHANGED' ? statuses : [],
        actions: builtActions,
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

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500">
            Run only when
            <select
              className="rounded border border-slate-300 px-1 py-0.5 text-xs"
              value={match}
              onChange={(e) => setMatch(e.target.value)}
            >
              <option value="ALL">ALL</option>
              <option value="ANY">ANY</option>
            </select>
            of these conditions match (optional)
          </div>
          {rules.map((r, i) => (
            <div key={i} className="mt-2 flex flex-wrap items-center gap-1">
              <select
                className="input max-w-[130px] text-xs"
                value={r.field}
                onChange={(e) => updateRule(i, { field: e.target.value, value: '' })}
              >
                {CONDITION_FIELDS.map((cf) => (
                  <option key={cf.value} value={cf.value}>{cf.label}</option>
                ))}
              </select>
              <select
                className="input max-w-[120px] text-xs"
                value={r.operator}
                onChange={(e) => updateRule(i, { operator: e.target.value })}
              >
                {CONDITION_OPS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {r.operator !== 'is_empty' && r.operator !== 'is_not_empty' && (
                r.field === 'source' ? (
                  <select
                    className="input max-w-[150px] text-xs"
                    value={r.value}
                    onChange={(e) => updateRule(i, { value: e.target.value })}
                  >
                    <option value="">— value —</option>
                    {SOURCE_OPTIONS.map((so) => (
                      <option key={so} value={so}>{so}</option>
                    ))}
                  </select>
                ) : r.field === 'status' ? (
                  <select
                    className="input max-w-[150px] text-xs"
                    value={r.value}
                    onChange={(e) => updateRule(i, { value: e.target.value })}
                  >
                    <option value="">— value —</option>
                    {PIPELINE_STAGES.map((st) => (
                      <option key={st.status} value={st.status}>{st.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input max-w-[150px] text-xs"
                    placeholder="value"
                    value={r.value}
                    onChange={(e) => updateRule(i, { value: e.target.value })}
                  />
                )
              )}
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRule}
            className="mt-2 text-xs font-semibold text-brand hover:underline"
          >
            + Add condition
          </button>
        </div>

        <select
          className="input"
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
        >
          <option value="SEND_EMAIL">Send email (template)</option>
          <option value="SEND_WHATSAPP_TEMPLATE">Send WhatsApp template</option>
          <option value="ASSIGN_COUNSELOR">Assign counselor (round-robin)</option>
          <option value="SET_FOLLOWUP">Set follow-up reminder</option>
          <option value="SET_STATUS">Set status</option>
          <option value="SEND_META_EVENT">Send Meta Conversion event</option>
          <option value="NOTIFY_ADMIN">Notify admin (email)</option>
          <option value="NOTIFY_COUNSELOR">Notify counselor</option>
        </select>
        {actionType === 'SEND_EMAIL' ? (
          <div>
            <label className="text-xs font-semibold text-slate-500">Email template to send</label>
            <select
              className="input"
              value={emailTemplateId}
              onChange={(e) => setEmailTemplateId(e.target.value)}
            >
              <option value="">— Choose a template —</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {templates && templates.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No email templates yet — create one under Email Automation first.
              </p>
            )}
          </div>
        ) : actionType === 'NOTIFY_ADMIN' ? (
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Send the notification to (optional)
            </label>
            <input
              className="input"
              placeholder="Leave blank to use your workspace admin email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              An email with the lead&apos;s name, phone, source and a link is sent each time this
              workflow fires.
            </p>
          </div>
        ) : (
          <textarea
            className="input min-h-[80px] font-mono text-xs"
            placeholder='{"templateName":"oneplace_welcome","language":"en"}'
            value={actionJson}
            onChange={(e) => setActionJson(e.target.value)}
          />
        )}
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
