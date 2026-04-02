import type { Metadata } from 'next';
import type React from 'react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../components/auth/AuthProvider';
import { NavBar } from '../components/ui/NavBar';
import { Toaster } from '../components/ui/toaster';
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
          <div className="min-h-screen text-foreground">
            <NavBar />
            <div className="relative mx-auto w-full max-w-[1280px] px-4 pb-8 pt-4 sm:px-6">{children}</div>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
