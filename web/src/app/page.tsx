'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, defaultPathForRole } from '@/lib/auth';
import { Shield, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session && session.role) {
      router.replace(defaultPathForRole(session.role));
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(239,68,68,0.08) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* Logo container with pulse effect */}
        <div
          className="flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            boxShadow: '0 0 50px rgba(239,68,68,0.3)',
          }}
        >
          <Shield className="h-10 w-10 text-white" />
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #fff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            resq<span style={{ WebkitTextFillColor: '#ef4444' }}>net</span>
          </h1>
          <p className="text-sm font-medium text-slate-400">Loading your secure session...</p>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-red-500" />
          <span className="text-xs tracking-wider uppercase font-semibold">Redirecting</span>
        </div>
      </div>
    </main>
  );
}
