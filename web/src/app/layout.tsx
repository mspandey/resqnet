import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ResQNet — AI-Powered Disaster Intelligence',
  description:
    'Real-time disaster coordination platform for volunteers, rescue teams, and government authorities.',
  keywords: ['disaster', 'emergency response', 'rescue', 'AI', 'coordination'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased min-h-screen`}>
        {/* SVG filter defs for theme-switch sketchy effect — must be in document body */}
        <svg style={{ display: 'none' }} aria-hidden="true">
          <defs>
            <filter id="sketchy" x="-5%" y="-5%" width="115%" height="115%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} seed={2} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="sketchy-sm" x="-5%" y="-5%" width="115%" height="115%">
              <feTurbulence type="fractalNoise" baseFrequency="0.065" numOctaves={3} seed={2} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={2} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
