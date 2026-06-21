'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, AlertTriangle, Users } from 'lucide-react';

/** Hook: adds .rq-visible to all .rq-reveal elements when they scroll into view */
export function useScrollReveal() {
  useEffect(() => {
    const run = () => {
      const els = document.querySelectorAll('.rq-reveal');
      if (!els.length) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('rq-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
      els.forEach((el) => {
        // If already visible in viewport, reveal immediately
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('rq-visible');
        } else {
          observer.observe(el);
        }
      });
      return () => observer.disconnect();
    };
    // Small defer so the DOM is fully painted before we measure positions
    const timer = setTimeout(run, 100);
    return () => clearTimeout(timer);
  }, []);
}

function CommandCenterVisual({ dark }: { dark: boolean }) {
  return (
    <div className="rq-float relative w-full max-w-lg mx-auto" aria-hidden="true">
      {/* Main card */}
      <div
        className="rounded-3xl p-5 shadow-2xl"
        style={{
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          boxShadow: dark
            ? '0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(204,34,41,0.15)'
            : '0 40px 80px rgba(0,0,0,0.12), 0 0 60px rgba(204,34,41,0.1)',
        }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ animation: 'rq-blink 2s ease-in-out infinite' }} />
            <span className="text-xs font-medium tracking-wider uppercase" style={{ color: dark ? '#94a3b8' : '#475569' }}>
              Live Operations
            </span>
          </div>
          <span className="text-xs" style={{ color: dark ? '#475569' : '#94a3b8' }}>District Command</span>
        </div>
        {/* Map area */}
        <div className="relative rounded-2xl overflow-hidden mb-4" style={{ height: '180px', background: 'linear-gradient(135deg,#0a1628 0%,#0f2040 50%,#091525 100%)' }}>
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#4a6fa5" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* Roads */}
          <svg className="absolute inset-0 w-full h-full opacity-40">
            <line x1="0" y1="90" x2="400" y2="90" stroke="#2a4a7f" strokeWidth="2" />
            <line x1="200" y1="0" x2="200" y2="200" stroke="#2a4a7f" strokeWidth="2" />
            <line x1="0" y1="45" x2="400" y2="135" stroke="#1a3a6f" strokeWidth="1.5" />
          </svg>
          {/* Incident markers */}
          {[
            { x: '28%', y: '35%', color: '#CC2229', label: 'CRITICAL' },
            { x: '65%', y: '55%', color: '#f97316', label: 'HIGH' },
            { x: '45%', y: '70%', color: '#eab308', label: 'MED' },
          ].map((m, i) => (
            <div key={i} className="absolute" style={{ left: m.x, top: m.y, transform: 'translate(-50%,-50%)' }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: m.color,
                  width: '20px',
                  height: '20px',
                  transform: 'translate(-50%,-50%)',
                  animation: `rq-pulse-ring ${1.5 + i * 0.4}s ease-out infinite ${i * 0.5}s`,
                  opacity: 0.6,
                }}
              />
              <div
                className="relative w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
              </div>
            </div>
          ))}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                'radial-gradient(circle at 28% 35%, rgba(204,34,41,0.15) 0%, transparent 40%), radial-gradient(circle at 65% 55%, rgba(249,115,22,0.1) 0%, transparent 35%)',
            }}
          />
          {/* Stats overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            {[['3', 'Active'], ['12', 'Volunteers'], ['8m', 'Avg ETA']].map(([v, l], i) => (
              <div key={i} className="flex-1 rounded-xl px-2 py-1.5 text-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                <div className="text-white font-bold text-sm">{v}</div>
                <div className="text-slate-400 text-xs">{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Incident list */}
        <div className="space-y-2">
          {[
            { sev: 'CRITICAL', title: 'Flood — Sector 4', time: '2m ago', color: '#CC2229', vol: 3 },
            { sev: 'HIGH', title: 'Building collapse — MG Road', time: '14m ago', color: '#f97316', vol: 5 },
            { sev: 'MED', title: 'Road accident — NH-48', time: '31m ago', color: '#eab308', vol: 2 },
          ].map((inc, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: inc.color, boxShadow: `0 0 8px ${inc.color}` }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: dark ? 'white' : '#0f172a' }}>{inc.title}</div>
                <div className="text-xs" style={{ color: dark ? '#475569' : '#64748b' }}>{inc.sev} · {inc.time}</div>
              </div>
              <div className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: dark ? '#94a3b8' : '#475569' }}>
                <Users className="w-3 h-3" /> {inc.vol}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Floating badge */}
      <div
        className="absolute -top-4 -right-4 rounded-2xl px-3 py-2 text-xs font-semibold text-white shadow-xl flex items-center gap-2"
        style={{
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(204,34,41,0.4)',
          color: dark ? 'white' : '#0f172a',
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'rq-blink 1.5s infinite' }} />
        Live — 24 Districts
      </div>
    </div>
  );
}

export function HeroSection({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  useScrollReveal();

  return (
    <section
      className="relative overflow-hidden min-h-screen flex items-center"
      style={{
        background: dark
          ? 'linear-gradient(135deg, #060E22 0%, #0F1C3F 50%, #060E22 100%)'
          : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%)',
      }}
    >
      {/* Full-width background photo with overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/hero-disaster.png"
          alt="Emergency operations center"
          fill
          className="object-cover"
          style={{ opacity: dark ? 0.45 : 0.35 }}
          priority
        />
        {/* Gradient overlay on top of photo */}
        <div
          className="absolute inset-0"
          style={{
            background: dark
              ? 'linear-gradient(135deg, rgba(6,14,34,0.75) 0%, rgba(15,28,63,0.65) 50%, rgba(6,14,34,0.75) 100%)'
              : 'linear-gradient(135deg, rgba(241,245,249,0.80) 0%, rgba(226,232,240,0.75) 50%, rgba(248,250,252,0.80) 100%)',
          }}
        />
        {/* Glow orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #CC2229 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 w-full">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left copy */}
          <div className="space-y-8">
            <div
              className="rq-fade-up inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: 'rgba(204,34,41,0.15)', border: '1px solid rgba(204,34,41,0.4)', color: '#f87171' }}
            >
              <div className="w-2 h-2 rounded-full bg-red-400" style={{ animation: 'rq-blink 1.5s infinite' }} />
              Real-time disaster response platform
            </div>

            <h1
              className="rq-fade-up-d1 font-black tracking-tight leading-[1.05]"
              style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)', color: dark ? 'white' : '#0f172a' }}
            >
              Disaster Response.<br />
              <span className="rq-gradient-text">Connected.</span>
            </h1>

            <p
              className="rq-fade-up-d2 text-lg leading-relaxed max-w-xl"
              style={{ color: dark ? '#94a3b8' : '#475569' }}
            >
              ResQNet connects citizens, volunteers, and emergency authorities during disasters — accelerating response and saving lives through intelligent coordination.
            </p>

            <div className="rq-fade-up-d3 flex flex-wrap gap-4">
              <Link
                href="/citizen/signup"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-100"
                style={{ background: '#CC2229', boxShadow: '0 0 30px rgba(204,34,41,0.4)' }}
              >
                <AlertTriangle className="w-4 h-4" /> Report Incident <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/volunteer/signup"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition-all hover:scale-105"
                style={{
                  background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  backdropFilter: 'blur(20px)',
                  border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                  color: dark ? 'white' : '#0f172a',
                }}
              >
                <Users className="w-4 h-4" /> Become a Volunteer
              </Link>
            </div>

            <div className="rq-fade-up-d4 flex items-center gap-8 pt-2">
              {[['18K+', 'Volunteers'], ['24K+', 'Incidents Resolved'], ['92%', 'Response Rate']].map(([v, l]) => (
                <div key={l}>
                  <div className="text-2xl font-black" style={{ color: dark ? 'white' : '#0f172a' }}>{v}</div>
                  <div className="text-xs mt-0.5" style={{ color: dark ? '#475569' : '#64748b' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right visual */}
          <div className="rq-fade-up-d2">
            <CommandCenterVisual dark={dark} />
          </div>
        </div>
      </div>
    </section>
  );
}
