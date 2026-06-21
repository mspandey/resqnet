'use client';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/home/NavFooter';
import { HeroSection } from '@/components/home/HeroSection';
import {
  HowItWorksSection,
  FeaturesSection,
  StatsSection,
  AboutSection,
  CtaSection,
} from '@/components/home/Sections';

export default function HomePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const isDark = theme === 'dark';
  return (
    <div
      data-theme={theme}
      style={{
        minHeight: '100vh',
        background: isDark ? '#060E22' : '#f8fafc',
        color: isDark ? '#e2e8f0' : '#0f172a',
        transition: 'background 0.5s ease, color 0.5s ease',
      }}
    >
      <Navbar theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
      <main>
        <HeroSection theme={theme} />
        <HowItWorksSection theme={theme} />
        <FeaturesSection theme={theme} />
        <StatsSection theme={theme} />
        <AboutSection theme={theme} />
        <CtaSection theme={theme} />
      </main>
      <Footer />
    </div>
  );
}
