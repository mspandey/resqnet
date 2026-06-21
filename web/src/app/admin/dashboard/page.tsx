'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Database, UserCog, ShieldCheck, BarChart3, FileText, Bell, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <AppShell role="admin">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Portal</h1>
          <p className="mt-2 text-slate-400">Hidden developer portal for database, user, and system management.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              title: 'User management',
              description: 'Create, update, and delete citizen, volunteer, authority, and admin accounts.',
              icon: UserCog,
            },
            {
              title: 'Account management',
              description: 'Invite or remove admin users, manage roles, and review access.',
              icon: ShieldCheck,
            },
            {
              title: 'Record oversight',
              description: 'View reports, incidents, assignments, and audit logs in one place.',
              icon: Database,
            },
            {
              title: 'System analytics',
              description: 'Review activity and platform health metrics for the entire stack.',
              icon: BarChart3,
            },
            {
              title: 'Notifications',
              description: 'Inspect notifications, SOS alerts, and push message delivery statuses.',
              icon: Bell,
            },
            {
              title: 'Configuration',
              description: 'Manage application settings, API keys, and role-based access.',
              icon: ShieldCheck,
            },
            {
              title: 'Audit logs',
              description: 'Search every action performed by admin and platform users.',
              icon: FileText,
            },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <card.icon className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 text-slate-400">
            <p>Administration is restricted to the hidden admin login URL. No admin entry points appear in standard navigation.</p>
            <Link href="/admin/login" className="text-sm font-medium text-blue-400 hover:text-blue-300">
              Admin login page (hidden route)
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
