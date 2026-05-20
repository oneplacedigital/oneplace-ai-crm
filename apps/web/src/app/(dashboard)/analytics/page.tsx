'use client';

import useSWR from 'swr';
import { apiGet } from '@/lib/api';

interface FunnelData {
  total: number;
  stages: { status: string; count: number; share: number; stepConversion: number | null }[];
  lost: number;
  cold: number;
}
interface SourceRow {
  source: string;
  leads: number;
  conversions: number;
  conversionRate: number;
}
interface DailyPoint { day: string; count: number }
interface Leader { counselorId: string; counselorName: string; total: number; converted: number; rate: number }
interface T2C { median: number | null; p90: number | null; count: number }

const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export default function AnalyticsPage() {
  const { data: funnel } = useSWR<FunnelData>('/analytics/funnel', apiGet);
  const { data: sources } = useSWR<SourceRow[]>('/analytics/sources', apiGet);
  const { data: daily } = useSWR<DailyPoint[]>('/analytics/daily?days=30', apiGet);
  const { data: t2c } = useSWR<T2C>('/analytics/time-to-convert', apiGet);
  const { data: leaders } = useSWR<Leader[]>('/analytics/leaderboard', apiGet);

  const maxDaily = Math.max(1, ...(daily?.map((d) => d.count) ?? [0]));
  const maxFunnel = Math.max(1, ...(funnel?.stages.map((s) => s.count) ?? [0]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500">Analytics</h1>
        <p className="text-sm text-slate-500">Funnel, source ROI, daily trend, and counselor leaderboard.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPI label="Total leads" value={funnel?.total ?? 0} />
        <KPI
          label="Median time to convert"
          value={t2c?.median != null ? `${t2c.median.toFixed(1)} d` : '—'}
        />
        <KPI label="Conversions" value={t2c?.count ?? 0} accent="green" />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-500">Funnel</h2>
        <div className="space-y-2">
          {funnel?.stages.map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <div className="w-32 text-sm text-slate-600">{STAGE_LABEL[s.status] ?? s.status}</div>
              <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-7 rounded-full bg-brand text-right text-xs font-semibold leading-7 text-white"
                  style={{ width: `${Math.max(2, (s.count / maxFunnel) * 100)}%` }}
                >
                  <span className="mr-2">{s.count}</span>
                </div>
              </div>
              <div className="w-20 text-right text-xs text-slate-500">
                {s.stepConversion != null ? `${Math.round(s.stepConversion * 100)}%` : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-500">
            Daily new leads (30d)
          </h2>
          <div className="flex h-40 items-end gap-1">
            {daily?.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ${d.count}`}
                className="flex-1 rounded-t bg-brand/80"
                style={{ height: `${Math.max(2, (d.count / maxDaily) * 100)}%` }}
              />
            ))}
            {daily && daily.length === 0 && (
              <div className="m-auto text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-500">Source ROI</h2>
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Leads</th>
                <th className="py-2 pr-4">Paid</th>
                <th className="py-2 pr-4">Conv %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources?.map((s) => (
                <tr key={s.source}>
                  <td className="py-2 pr-4 font-semibold text-navy-500">{s.source}</td>
                  <td className="py-2 pr-4">{s.leads}</td>
                  <td className="py-2 pr-4">{s.conversions}</td>
                  <td className="py-2 pr-4">{Math.round(s.conversionRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy-500">
          Counselor leaderboard
        </h2>
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Counselor</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaders?.map((l, i) => (
              <tr key={l.counselorId}>
                <td className="py-2 pr-4">{i + 1}</td>
                <td className="py-2 pr-4 font-semibold text-navy-500">{l.counselorName}</td>
                <td className="py-2 pr-4">{l.total}</td>
                <td className="py-2 pr-4">{l.converted}</td>
                <td className="py-2 pr-4">{Math.round(l.rate * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string | number; accent?: 'green' | 'brand' }) {
  const cls = accent === 'green' ? 'text-emerald-600' : 'text-brand';
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}
