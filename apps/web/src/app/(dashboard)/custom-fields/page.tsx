'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Settings2, Plus, Trash2, Pencil } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  placeholder: string | null;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'SELECT', label: 'Dropdown (choose options)' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'URL', label: 'URL' },
  { value: 'EMAIL', label: 'Email' },
];

function typeLabel(t: string) {
  return FIELD_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export default function CustomFieldsPage() {
  const { data, mutate } = useSWR<CustomField[]>('/custom-fields', apiGet);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function remove(id: string, label: string) {
    if (!confirm(`Delete "${label}"? Values stored on existing leads will be hidden but not erased.`)) return;
    await apiDelete(`/custom-fields/${id}`);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="text-brand" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-navy-500">Custom Fields</h1>
            <p className="text-sm text-slate-500">
              Add fields specific to your business so every lead captures what matters to you.
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowNew(true); }}>
          <Plus size={16} /> New Field
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-navy-500">{f.label}</div>
                  {f.description && <div className="text-xs text-slate-500">{f.description}</div>}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-slate-600">{f.key}</td>
                <td className="px-4 py-3 text-xs">
                  {typeLabel(f.type)}
                  {f.type === 'SELECT' && f.options && f.options.length > 0 && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      {f.options.slice(0, 4).join(', ')}{f.options.length > 4 ? '...' : ''}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {f.required ? (
                    <span className="badge bg-red-100 text-red-700">Required</span>
                  ) : (
                    <span className="text-slate-400">Optional</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${f.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {f.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-3">
                    <button
                      onClick={() => { setEditing(f); setShowNew(true); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => remove(f.id, f.label)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data && data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No custom fields yet. Click <strong>New Field</strong> to add one — for example,
                  <em> Property Type</em>, <em>Course Interested In</em>, <em>Visit Date</em>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <FieldModal
          field={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}

function FieldModal({
  field,
  onClose,
  onSaved,
}: {
  field: CustomField | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    key: field?.key ?? '',
    label: field?.label ?? '',
    type: field?.type ?? 'TEXT',
    required: field?.required ?? false,
    options: (field?.options ?? []).join('\n'),
    placeholder: field?.placeholder ?? '',
    description: field?.description ?? '',
    order: field?.order ?? 0,
    isActive: field?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function suggestKey(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 40);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const opts = form.options
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      const payload: Record<string, unknown> = {
        label: form.label,
        type: form.type,
        required: form.required,
        placeholder: form.placeholder || undefined,
        description: form.description || undefined,
        order: form.order,
        isActive: form.isActive,
        options: form.type === 'SELECT' ? opts : undefined,
      };
      if (!field) {
        payload.key = form.key || suggestKey(form.label);
        await apiPost('/custom-fields', payload);
      } else {
        await apiPatch(`/custom-fields/${field.id}`, payload);
      }
      onSaved();
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
        <h3 className="text-lg font-bold text-navy-500">
          {field ? 'Edit Custom Field' : 'New Custom Field'}
        </h3>

        <div>
          <label className="text-xs font-semibold text-slate-500">Field label (shown to users)</label>
          <input
            className="input"
            required
            placeholder="e.g. Property Type"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>

        {!field && (
          <div>
            <label className="text-xs font-semibold text-slate-500">
              Internal key (lowercase, no spaces) — leave blank to auto-generate
            </label>
            <input
              className="input font-mono"
              placeholder={suggestKey(form.label) || 'property_type'}
              value={form.key}
              onChange={(e) =>
                setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
              }
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-500">Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {FIELD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {form.type === 'SELECT' && (
          <div>
            <label className="text-xs font-semibold text-slate-500">Options (one per line)</label>
            <textarea
              className="input min-h-[100px] font-mono text-xs"
              placeholder="Apartment&#10;Villa&#10;Plot&#10;Commercial"
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-500">Placeholder (optional)</label>
          <input
            className="input"
            placeholder="Hint text shown inside the input"
            value={form.placeholder}
            onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500">Help text (optional)</label>
          <input
            className="input"
            placeholder="Short explanation shown below the field"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
            />
            Required field
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (visible on leads)
          </label>
        </div>

        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : field ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
