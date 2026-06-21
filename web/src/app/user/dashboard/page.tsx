'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Shield, AlertTriangle, MapPin, Bell, Clock, Users } from 'lucide-react';
import Link from 'next/link';

export function CitizenDashboardContent() {
  return (
    <AppShell role="citizen">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Citizen Dashboard</h1>
          <p className="mt-2 text-slate-400">Create reports, track your emergencies, and stay connected to volunteers and notifications.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              title: 'Create reports',
              description: 'Submit a new emergency report and share location, photos, or voice details.',
              icon: Shield,
              href: '/citizen/dashboard',
            },
            {
              title: 'Track reports',
              description: 'Monitor the status of all active reports in one place.',
              icon: MapPin,
              href: '/citizen/dashboard',
            },
            {
              title: 'Emergency SOS',
              description: 'Trigger a fast-response alert and share your updated location.',
              icon: AlertTriangle,
              href: '/citizen/dashboard',
            },
            {
              title: 'Nearby volunteers',
              description: 'View verified volunteers who can assist in your area.',
              icon: Users,
              href: '/citizen/dashboard',
            },
            {
              title: 'Notifications',
              description: 'Get critical status updates and dispatch alerts instantly.',
              icon: Bell,
              href: '/citizen/dashboard',
            },
            {
              title: 'Report history',
              description: 'Review saved reports and status changes over time.',
              icon: Clock,
              href: '/citizen/dashboard',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <card.icon className="h-5 w-5 text-sky-400" />
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
              <Link href={card.href} className="mt-5 inline-flex text-sm font-medium text-blue-400 hover:text-blue-300">
                Explore
              </Link>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <Shield className="h-5 w-5 text-emerald-400" />
            <p className="text-sm">Your citizen account is protected with role-based access and session authentication.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function UserDashboardPage() {
  return <CitizenDashboardContent />;
}
