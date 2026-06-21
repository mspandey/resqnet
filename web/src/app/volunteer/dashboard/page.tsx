'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AlertTriangle, MapPin, ListChecks, Bell, Compass, Users } from 'lucide-react';
import Link from 'next/link';

export default function VolunteerDashboardPage() {
  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Volunteer Dashboard</h1>
          <p className="mt-2 text-slate-400">See available incidents, manage assignments, and stay connected to your community.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              title: 'Available incidents',
              description: 'Browse verified incidents nearby and accept tasks that match your skills.',
              icon: MapPin,
            },
            {
              title: 'Assigned incidents',
              description: 'Track incidents currently assigned to you and update status in real-time.',
              icon: ListChecks,
            },
            {
              title: 'Location tracking',
              description: 'Share your approximate location so nearby requests can reach you faster.',
              icon: Compass,
            },
            {
              title: 'Assistance requests',
              description: 'Respond to user requests and coordinate volunteer support.',
              icon: AlertTriangle,
            },
            {
              title: 'Profile & statistics',
              description: 'Review your volunteer profile, skills, and performance metrics.',
              icon: Users,
            },
            {
              title: 'Notifications',
              description: 'Receive urgent alerts for new tasks and assignment changes.',
              icon: Bell,
            },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <card.icon className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-slate-300">
            <p className="font-semibold text-white">Volunteer mission control</p>
            <p className="text-sm text-slate-400">Your dashboard gives you instant access to active incidents and volunteer coordination.</p>
          </div>
          <Link href="/volunteer/heatmap" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
            Open heatmap
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
