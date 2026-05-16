'use client';

import { PIPELINE_STAGES, LeadStatus } from '@oneplace/types';
import clsx from 'clsx';

const META: Record<LeadStatus, { label: string; bg: string; text: string }> = {
  NEW: { label: 'New', bg: 'bg-slate-200', text: 'text-slate-700' },
  CONTACTED: { label: 'Contacted', bg: 'bg-blue-100', text: 'text-blue-700' },
  INTERESTED: { label: 'Interested', bg: 'bg-sky-100', text: 'text-sky-700' },
  QUALIFIED: { label: 'Qualified', bg: 'bg-violet-100', text: 'text-violet-700' },
  DEMO_SCHEDULED: { label: 'Demo Booked', bg: 'bg-amber-100', text: 'text-amber-700' },
  DEMO_COMPLETED: { label: 'Demo Done', bg: 'bg-orange-100', text: 'text-orange-700' },
  ADMISSION_CONFIRMED: { label: 'Admission ✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PAYMENT_COMPLETED: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800' },
  LOST: { label: 'Lost', bg: 'bg-red-100', text: 'text-red-700' },
  COLD: { label: 'Cold', bg: 'bg-slate-100', text: 'text-slate-500' },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const m = META[status];
  return <span className={clsx('badge', m.bg, m.text)}>{m.label}</span>;
}

export { PIPELINE_STAGES };
