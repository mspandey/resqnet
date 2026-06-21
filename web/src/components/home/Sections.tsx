'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import { RadioTower, Users, ShieldCheck, Package, BarChart3, Bell, Zap, MapPin, Phone, Heart, Shield, Globe } from 'lucide-react';

/** Attach IntersectionObserver to all .rq-reveal elements on mount */
function ScrollRevealInit() {
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
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('rq-visible');
        } else {
          observer.observe(el);
        }
      });
      return () => observer.disconnect();
    };
    const timer = setTimeout(run, 100);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

const STEPS = [
  { icon: Phone,       label: 'Citizen reports incident',     detail: 'Submit via app, SMS, or web. Location, photo, and severity auto-captured.', color: '#CC2229' },
  { icon: Bell,        label: 'Nearby volunteers notified',   detail: 'AI routes alerts to qualified volunteers within optimal radius instantly.',  color: '#f97316' },
  { icon: ShieldCheck, label: 'Authorities receive incident', detail: 'District command gets verified incident with AI triage classification.',     color: '#3b82f6' },
  { icon: Package,     label: 'Resources dispatched',        detail: 'Rescue teams, medical units, and relief supplies routed in real time.',       color: '#8b5cf6' },
  { icon: BarChart3,   label: 'Resolution tracked',          detail: 'Every action logged. Analytics feed into future preparedness plans.',         color: '#10b981' },
];

const FEATURES = [
  { icon: Phone,      title: 'Emergency Reporting', desc: 'One-tap SOS with auto-location, photo evidence, and offline-first submission.' },
  { icon: Bell,       title: 'SOS Alerts',          desc: 'Instant multi-channel alerts via push, SMS, and in-app broadcast.' },
  { icon: Users,      title: 'Volunteer Network',   desc: 'Geo-matched volunteer dispatch with skills routing and real-time tracking.' },
  { icon: Package,    title: 'Resource Tracking',   desc: 'Live inventory of rescue equipment, medical supplies, and relief materials.' },
  { icon: BarChart3,  title: 'Incident Analytics',  desc: 'Heatmaps, response timelines, and predictive risk scoring for authorities.' },
  { icon: RadioTower, title: 'Authority Operations',desc: 'Unified command dashboard for multi-agency coordination and escalation.' },
];

const STATS = [
  { value: '18,400+', label: 'Volunteers', sub: 'across 120 districts' },
  { value: '2.1M+',   label: 'Citizens',   sub: 'registered on platform' },
  { value: '24,000+', label: 'Incidents',  sub: 'successfully resolved' },
  { value: '< 8 min', label: 'Response',   sub: 'average dispatch time' },
];

const TESTIMONIALS = [
  { quote: 'ResQNet helped our community mobilize within minutes. During the 2024 floods we coordinated 200+ volunteers in real time.', author: 'Anjali Rao', role: 'Citizen Coordinator, Bengaluru' },
  { quote: 'The platform gave us visibility we never had before. Every incident, every resource, every volunteer — one screen.', author: 'Capt. Arun Mehta', role: 'District Disaster Authority, Pune' },
  { quote: 'As a volunteer I could see exactly where I was needed most. The AI routing saved hours of confusion.', author: 'Priya Singh', role: 'Rescue Volunteer' },
];

const PHOTOS = [
  { src: '/hero-rescue.png',       alt: 'Volunteers performing flood rescue operations', caption: 'Field Rescue',    sub: 'Ground-level response across India' },
  { src: '/volunteers-aerial.png', alt: 'Aerial view of coordinated disaster relief effort', caption: 'Coordination',   sub: '18,000+ volunteers networked' },
  { src: '/command-center.png',    alt: 'Emergency command center monitoring incidents', caption: 'Command Ops',    sub: 'Real-time district oversight' },
];

export function HowItWorksSection({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <section id="how-it-works" className="py-28 px-6" style={{ background: dark ? '#060E22' : '#f8fafc' }}>
      <ScrollRevealInit />
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <p className="rq-reveal text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#CC2229' }}>How It Works</p>
          <h2
            className="rq-reveal rq-reveal-d1 font-black tracking-tight"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: dark ? 'white' : '#0f172a' }}
          >
            From alert to resolution<br />in minutes, not hours.
          </h2>
        </div>
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-6 top-8 bottom-8 w-px hidden md:block" style={{ background: 'linear-gradient(to bottom, #CC2229, #8b5cf6, #10b981)' }} />
          <div className="space-y-6">
            {STEPS.map((s, i) => (
              <div key={i} className="rq-reveal flex gap-6 items-start group" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div
                  className="relative flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 z-10"
                  style={{ background: `${s.color}22`, border: `1px solid ${s.color}44` }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div
                  className="flex-1 rounded-2xl px-5 py-4 transition-all group-hover:border-opacity-30"
                  style={{
                    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(20px)',
                    border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: s.color }}>Step {i + 1}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: dark ? 'white' : '#0f172a' }}>{s.label}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: dark ? '#64748b' : '#475569' }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <section
      id="features"
      className="py-28 px-6"
      style={{ background: dark ? 'linear-gradient(180deg,#060E22 0%,#0F1C3F 100%)' : 'linear-gradient(180deg,#f0f4f8 0%,#e8edf4 100%)' }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="rq-reveal text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#CC2229' }}>Platform Features</p>
          <h2
            className="rq-reveal rq-reveal-d1 font-black tracking-tight"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: dark ? 'white' : '#0f172a' }}
          >
            Built for every role.<br />
            <span className="rq-gradient-text">Every emergency.</span>
          </h2>
          <p className="rq-reveal rq-reveal-d2 mt-4 max-w-2xl mx-auto text-lg" style={{ color: dark ? '#64748b' : '#475569' }}>
            A unified platform powering citizens, volunteers, and government authorities through every stage of disaster response.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="rq-reveal rounded-3xl p-7 group transition-all hover:scale-[1.02]"
              style={{
                transitionDelay: `${i * 0.08}s`,
                transitionDuration: '200ms',
                background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(204,34,41,0.15)', border: '1px solid rgba(204,34,41,0.3)' }}>
                <f.icon className="w-6 h-6" style={{ color: '#CC2229' }} />
              </div>
              <h3 className="font-bold text-xl mb-2" style={{ color: dark ? 'white' : '#0f172a' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: dark ? '#64748b' : '#475569' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <section id="impact" className="py-28 px-6" style={{ background: dark ? '#060E22' : '#f8fafc' }}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="rq-reveal text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#CC2229' }}>Platform Impact</p>
          <h2
            className="rq-reveal rq-reveal-d1 font-black tracking-tight"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: dark ? 'white' : '#0f172a' }}
          >
            Trusted by communities<br />when it matters most.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-20">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="rq-reveal rounded-3xl p-8 text-center group hover:scale-[1.03] transition-transform"
              style={{
                transitionDelay: `${i * 0.1}s`,
                background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div className="font-black text-4xl mb-1" style={{ fontVariantNumeric: 'tabular-nums', color: dark ? 'white' : '#0f172a' }}>{s.value}</div>
              <div className="font-bold text-lg mb-1" style={{ color: '#CC2229' }}>{s.label}</div>
              <div className="text-xs" style={{ color: dark ? '#475569' : '#64748b' }}>{s.sub}</div>
            </div>
          ))}
        </div>
        {/* Testimonials */}
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="rq-reveal rounded-3xl p-7"
              style={{
                transitionDelay: `${i * 0.12}s`,
                background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <p className="text-base leading-relaxed mb-6 italic" style={{ color: dark ? '#cbd5e1' : '#334155' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <div className="font-bold text-sm" style={{ color: dark ? 'white' : '#0f172a' }}>{t.author}</div>
                <div className="text-xs mt-0.5" style={{ color: dark ? '#475569' : '#64748b' }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <section
      id="about"
      className="py-28 px-6"
      style={{ background: dark ? 'linear-gradient(180deg,#0F1C3F 0%,#060E22 100%)' : 'linear-gradient(180deg,#e8edf4 0%,#f0f4f8 100%)' }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Mission */}
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center mb-24">
          <div>
            <p className="rq-reveal text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#CC2229' }}>Our Mission</p>
            <h2
              className="rq-reveal rq-reveal-d1 font-black tracking-tight mb-6"
              style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: dark ? 'white' : '#0f172a' }}
            >
              Technology built<br />
              <span className="rq-gradient-text">to save lives.</span>
            </h2>
            <p className="rq-reveal rq-reveal-d2 text-lg leading-relaxed mb-6" style={{ color: dark ? '#94a3b8' : '#475569' }}>
              ResQNet was born from the chaos of the 2023 Uttarakhand floods, when we saw first-hand how poor coordination cost lives. We built a platform to change that — connecting every person, every resource, every authority in real time.
            </p>
            <p className="rq-reveal rq-reveal-d3 text-lg leading-relaxed" style={{ color: dark ? '#94a3b8' : '#475569' }}>
              Today ResQNet operates across 120 districts in India, trusted by district collectors, NDRF units, and 18,000+ certified volunteers to coordinate disaster response faster and more effectively than ever before.
            </p>
          </div>
          {/* Values grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Heart,  title: 'People First', desc: 'Every design decision starts with one question: does this help save a life?' },
              { icon: Shield, title: 'Reliability',  desc: 'Built on offline-first architecture. Works when networks fail.' },
              { icon: Globe,  title: 'Scalability',  desc: 'From a single village to a national catastrophe — no incident too large.' },
              { icon: Zap,    title: 'Speed',        desc: 'Sub-second alert dispatch. Every second in disaster response is precious.' },
            ].map((v, i) => (
              <div
                key={i}
                className="rq-reveal rounded-2xl p-5"
                style={{
                  transitionDelay: `${i * 0.1}s`,
                  background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(20px)',
                  border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <v.icon className="w-6 h-6 mb-3" style={{ color: '#CC2229' }} />
                <h4 className="font-bold mb-1 text-sm" style={{ color: dark ? 'white' : '#0f172a' }}>{v.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: dark ? '#64748b' : '#475569' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="mt-4">
          <div className="text-center mb-10">
            <p className="rq-reveal text-sm font-bold uppercase tracking-[0.3em] mb-3" style={{ color: '#CC2229' }}>In The Field</p>
            <h3
              className="rq-reveal rq-reveal-d1 font-black tracking-tight"
              style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: dark ? 'white' : '#0f172a' }}
            >
              Real operations.{' '}
              <span className="rq-gradient-text">Real impact.</span>
            </h3>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PHOTOS.map((p, i) => (
              <div
                key={i}
                className="rq-reveal group relative overflow-hidden rounded-3xl"
                style={{ transitionDelay: `${i * 0.12}s`, aspectRatio: '4/3' }}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Overlay */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-5"
                  style={{ background: 'linear-gradient(to top, rgba(6,14,34,0.85) 0%, transparent 60%)' }}
                >
                  <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#CC2229' }}>{p.caption}</div>
                  <div className="font-semibold text-sm text-white">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaSection({ theme = 'dark' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <section
      className="py-28 px-6"
      style={{ background: dark ? 'linear-gradient(135deg, #0F1C3F 0%, #060E22 100%)' : 'linear-gradient(135deg, #e8edf4 0%, #f0f4f8 100%)' }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <div
          className="rq-reveal rounded-[2.5rem] px-8 py-16"
          style={{
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 0 80px rgba(204,34,41,0.15)',
          }}
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#CC2229' }}>Get Started</p>
          <h2
            className="font-black tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: dark ? 'white' : '#0f172a' }}
          >
            Ready to save lives?
          </h2>
          <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: dark ? '#64748b' : '#475569' }}>
            Join ResQNet today as a citizen or volunteer and become part of the fastest-growing disaster response network in India.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/citizen/signup"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: '#CC2229', boxShadow: '0 0 30px rgba(204,34,41,0.4)' }}
            >
              <Zap className="w-4 h-4" /> Report an Incident
            </a>
            <a
              href="/volunteer/signup"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold transition-all hover:scale-105"
              style={{
                background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                color: dark ? 'white' : '#0f172a',
              }}
            >
              <Users className="w-4 h-4" /> Become a Volunteer
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
