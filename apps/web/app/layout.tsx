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
    default: 'Snag — Webhook Inspector & Tunnel',
    template: '%s · Snag',
  },
  description:
    'Capture, inspect, and replay webhooks in real time. Open-source webhook inspector with CLI tunnel and AI agent support via MCP.',
  keywords: [
    'webhook',
    'inspector',
    'tunnel',
    'ngrok alternative',
    'hookdeck alternative',
    'webhook testing',
    'MCP server',
    'developer tools',
  ],
  authors: [{ name: 'Snag' }],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Snag — Webhook Inspector & Tunnel',
    description:
      'Capture, inspect, and replay webhooks in real time. Open-source with CLI tunnel and MCP support.',
    images: ['/og.svg'],
    type: 'website',
    siteName: 'Snag',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snag — Webhook Inspector & Tunnel',
    description:
      'Capture, inspect, and replay webhooks in real time. Open-source with CLI tunnel and MCP support.',
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
            <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-5 sm:px-6">{children}</div>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
