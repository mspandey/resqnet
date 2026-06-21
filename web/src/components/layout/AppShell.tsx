'use client';

/**
 * web/src/components/layout/AppShell.tsx
 * Shared authenticated shell — sidebar nav + header with ConnectivityChip.
 * Each role gets different nav items.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { ConnectivityChip } from '@/components/ui/ConnectivityChip';
import { clearSession, getSession, type AppRole } from '@/lib/auth';
import { disconnectSocket } from '@/lib/socket';
import { ResQNetSidebarBrand } from '@/components/ui/ResQNetLogo';
import {
  Map,
  List,
  Clock,
  Settings,
  LayoutDashboard,
  Package,
  Bell,
  BarChart2,
  LogOut,
  Shield,
  Inbox,
  ShieldCheck,
  AlertTriangle,
  Database,
  FileText,
  UserCog,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
}

const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  citizen: [
    { href: '/citizen/dashboard', label: 'Dashboard', Icon: ShieldCheck },
    { href: '/citizen/dashboard', label: 'Create report', Icon: AlertTriangle },
    { href: '/citizen/dashboard', label: 'Track reports', Icon: Map },
    { href: '/citizen/dashboard', label: 'Notifications', Icon: Bell },
  ],
  volunteer: [
    { href: '/volunteer/heatmap', label: 'Heatmap', Icon: Map },
    { href: '/volunteer/tasks/active', label: 'My Tasks', Icon: List },
    { href: '/volunteer/tasks/history', label: 'History', Icon: Clock },
    { href: '/volunteer/profile/skills', label: 'Skills', Icon: Settings },
  ],
  rescue_team: [
    { href: '/rescue/queue', label: 'Dispatch Queue', Icon: Inbox },
    { href: '/rescue/history', label: 'History', Icon: Clock },
  ],
  authority: [
    { href: '/authority/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/authority/resources', label: 'Resources', Icon: Package },
    { href: '/authority/alerts/new', label: 'Alerts', Icon: Bell },
    { href: '/authority/analytics', label: 'Analytics', Icon: BarChart2 },
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Admin Dashboard', Icon: Database },
    { href: '/admin/users', label: 'User Management', Icon: UserCog },
    { href: '/admin/dashboard', label: 'Analytics', Icon: BarChart2 },
    { href: '/admin/dashboard', label: 'Audit Logs', Icon: FileText },
    { href: '/admin/dashboard', label: 'Config', Icon: Shield },
  ],
};

interface Props {
  children: React.ReactNode;
  role: AppRole;
}

export function AppShell({ children, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();
  const navItems = NAV_ITEMS[role] ?? [];

  function handleLogout() {
    clearSession();
    disconnectSocket();
    document.cookie = 'resqnet_token=; max-age=0; path=/';
    document.cookie = 'resqnet_role=; max-age=0; path=/';
    router.push('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside
        className="flex w-56 flex-shrink-0 flex-col border-r border-slate-800"
        style={{ background: '#0F1C3F' }}
      >
        {/* Brand */}
        <div className="flex items-center border-b border-slate-800 px-4 py-3.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <ResQNetSidebarBrand />
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-3">
          <ul className="flex flex-col gap-0.5 px-2">
            {navItems.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <div />
          <div className="flex items-center gap-3">
            <ConnectivityChip />
            <span className="text-xs text-slate-500">
              {session?.user_id?.slice(0, 8)}…
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
