import type { Metadata } from 'next';
import type React from 'react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../components/auth/AuthProvider';
import { NavBar } from '../components/ui/NavBar';
import { webConfig } from '../lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(webConfig.appUrl),
  title: {
    default: 'Snag Web Console',
    template: '%s · Snag',
  },
  description: 'Inspect, replay, and route webhooks in real time.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Snag Web Console',
    description: 'Inspect, replay, and route webhooks in real time.',
    images: ['/og.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snag Web Console',
    description: 'Inspect, replay, and route webhooks in real time.',
    images: ['/og.svg'],
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground">
            <NavBar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
