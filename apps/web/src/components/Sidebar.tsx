'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  GraduationCap,
  UserCog,
  LogOut,
  Zap,
  Plug,
  BarChart3,
  Mail,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/workflows', label: 'Workflows', icon: Zap },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/counselors', label: 'Team', icon: UserCog },
  { href: '/courses', label: 'Courses', icon: GraduationCap },
  { href: '/integrations', label: 'Integrations', icon: Plug },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-ink-500 text-slate-100">
      <div className="px-6 py-5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-klozent-gradient">
            <svg width="22" height="22" viewBox="0 0 120 120" fill="none" aria-hidden="true">
              <g stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round">
                <line x1="42" y1="34" x2="42" y2="86" />
                <line x1="42" y1="62" x2="80" y2="34" />
                <line x1="42" y1="58" x2="80" y2="86" />
              </g>
              <path d="M90 30 L93.5 38 L101.5 41.5 L93.5 45 L90 53 L86.5 45 L78.5 41.5 L86.5 38 Z" fill="#fff" />
            </svg>
          </span>
          <span className="text-lg font-bold leading-tight text-white">Klozent</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-brand-300">{user?.tenantName ?? 'Workspace'}</div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                active ? 'bg-brand text-white' : 'text-slate-300 hover:bg-ink-700 hover:text-white',
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}

        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-ink-700" />
            <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-brand-300">Platform</div>
            <Link
              href="/super-admin"
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                pathname?.startsWith('/super-admin')
                  ? 'bg-brand text-white'
                  : 'text-slate-300 hover:bg-ink-700 hover:text-white',
              )}
            >
              <Shield size={18} />
              <span>Super Admin</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-ink-700 p-4">
        <div className="mb-2 text-xs text-slate-400">Signed in as</div>
        <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
        <div className="truncate text-xs text-slate-400">{user?.email}</div>
        <button
          onClick={() => logout()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-ink-700"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
