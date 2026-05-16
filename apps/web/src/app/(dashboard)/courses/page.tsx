'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { inr } from '@/lib/format';

interface Course {
  id: string;
  name: string;
  code: string | null;
  durationWeeks: number;
  feeInr: number;
  pace: string;
  isActive: boolean;
}

export default function CoursesPage() {
  const { data, mutate } = useSWR<Course[]>('/courses', apiGet);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Courses</h1>
          <p className="text-sm text-slate-500">Programs your institute is selling.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Course
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">{c.code ?? '—'}</div>
            <div className="mt-1 text-lg font-bold text-navy-500">{c.name}</div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">{c.durationWeeks} weeks · {c.pace}</span>
              <span className="font-bold text-brand">{inr(c.feeInr)}</span>
            </div>
          </div>
        ))}
        {data && data.length === 0 && (
          <div className="card col-span-full p-10 text-center text-sm text-slate-500">
            No courses yet. Create your first program to start tagging leads.
          </div>
        )}
      </div>

      {showNew && <NewCourseModal onClose={() => setShowNew(false)} onCreated={() => mutate()} />}
    </div>
  );
}

function NewCourseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    durationWeeks: 12,
    feeInr: 0,
    pace: 'WEEKDAY',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/courses', form);
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">New Course</h3>
        <input
          className="input"
          placeholder="Course name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="Code (e.g. AI-DM-PRO)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            className="input"
            placeholder="Duration (weeks)"
            min={1}
            value={form.durationWeeks}
            onChange={(e) => setForm({ ...form, durationWeeks: Number(e.target.value) })}
          />
          <input
            type="number"
            className="input"
            placeholder="Fee (INR)"
            min={0}
            value={form.feeInr}
            onChange={(e) => setForm({ ...form, feeInr: Number(e.target.value) })}
          />
        </div>
        <select
          className="input"
          value={form.pace}
          onChange={(e) => setForm({ ...form, pace: e.target.value })}
        >
          <option value="WEEKDAY">Weekday</option>
          <option value="WEEKEND">Weekend</option>
          <option value="EVENING">Evening</option>
          <option value="ONLINE">Online</option>
          <option value="HYBRID">Hybrid</option>
        </select>
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
