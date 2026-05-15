'use client';

import useSWR from 'swr';
import { apiGet } from '@/lib/api';
import { PIPELINE_STAGES, LeadStatus } from '@oneplace/types';

interface CounselorStat {
  counselorId: string;
  counselorName: string;
  totalLeads: number;
  byStatus: Record<string, number>;
  conversionRate: number;
  followUpsDue: number;
}

export default function DashboardPage() {
  const { data: summary } = useSWR<Record<string, number>>('/leads/pipeline-summary', apiGet);
  const { data: counselors } = useSWR<CounselorStat[]>('/leads/counselor-stats', apiGet);

  const totalLeads = summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0;
  const paid = summary?.[LeadStatus.PAYMENT_COMPLETED] ?? 0;
  const qualifiedPlus =
    (summary?.[LeadStatus.QUALIFIED] ?? 0) +
    (summary?.[LeadStatus.DEMO_SCHEDULED] ?? 0) +
    (summary?.[LeadStatus.DEMO_COMPLETED] ?? 0) +
    (summary?.[LeadStatus.ADMISSION_CONFIRMED] ?? 0);
  const conversion = totalLeads > 0 ? Math.round((paid / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500">Overview</h1>
        <p className="text-sm text-slate-500">Your admissions pipeline at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPI label="Total Leads" value={totalLeads} accent="brand" />
        <KPI label="Qualified+" value={qualifiedPlus} accent="navy" />
        <KPI label="Paid / Enrolled" value={paid} accent="green" />
        <KPI label="Conversion" value={`${conversion}%`} accent="brand" />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-500">
          Pipeline distribution
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.status} className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="mt-1 text-2xl font-bold text-navy-500">
                {summary?.[s.status] ?? 0}
              </div>
              <div className="mt-1 h-1 rounded-full" style={{ background: s.color }} />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-500">
          Counselor performance
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-4">Counselor</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Qualified</th>
                <th className="py-2 pr-4">Paid</th>
                <th className="py-2 pr-4">Conv. %</th>
                <th className="py-2 pr-4">Overdue F/U</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counselors?.map((c) => (
                <tr key={c.counselorId}>
                  <td className="py-3 pr-4 font-semibold text-navy-500">{c.counselorName}</td>
                  <td className="py-3 pr-4">{c.totalLeads}</td>
                  <td className="py-3 pr-4">{c.byStatus.QUALIFIED ?? 0}</td>
                  <td className="py-3 pr-4">{c.byStatus.PAYMENT_COMPLETED ?? 0}</td>
                  <td className="py-3 pr-4">{Math.round(c.conversionRate * 100)}%</td>
                  <td className="py-3 pr-4">
                    {c.followUpsDue > 0 ? (
                      <span className="badge bg-red-100 text-red-700">{c.followUpsDue}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
              {counselors && counselors.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={6}>
                    No counselors yet. Add them under <a className="text-brand" href="/counselors">Counselors</a>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string | number; accent: 'brand' | 'navy' | 'green' }) {
  const cls = accent === 'brand' ? 'text-brand' : accent === 'green' ? 'text-emerald-600' : 'text-navy-500';
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}
