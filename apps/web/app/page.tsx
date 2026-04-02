import type React from 'react';
import Link from 'next/link';

import { EndpointCreator } from '../components/landing/EndpointCreator';

export default function LandingPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pt-12">
        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="mb-6 font-mono text-5xl font-bold tracking-tight text-primary md:text-6xl">SNAG</p>
          <h1 className="mb-8 max-w-3xl text-balance text-3xl font-semibold md:text-5xl">
            Inspect, replay, and route webhooks in real time
          </h1>
          <EndpointCreator />
        </section>

        <section className="py-16">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-secondary/20 p-6">
              <h3 className="mb-2 text-xl font-semibold">Real-time Console</h3>
              <p className="text-muted-foreground">Watch webhooks arrive in real-time with full request inspection</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-6">
              <h3 className="mb-2 text-xl font-semibold">CLI Tunnel</h3>
              <p className="text-muted-foreground">Forward webhooks to localhost with zero configuration</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-6">
              <h3 className="mb-2 text-xl font-semibold">MCP Support</h3>
              <p className="text-muted-foreground">AI agents can create and monitor endpoints programmatically</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-6">
              <h3 className="mb-2 text-xl font-semibold">Forwarding Rules</h3>
              <p className="text-muted-foreground">Route webhooks to multiple destinations with filters</p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-border py-8">
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-primary">
              Log In
            </Link>
            <a href="https://github.com/munimx/Snag" target="_blank" rel="noopener" className="hover:text-primary">
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
