import type React from 'react';
import Link from 'next/link';
import { IconBrandGithub, IconArrowRight } from '@tabler/icons-react';

import { EndpointCreator } from '../components/landing/EndpointCreator';

export default function LandingPage(): React.JSX.Element {
  return (
    <main className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center sm:py-24">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Webhook infrastructure
          <br />
          <span className="text-muted-foreground">for developers</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Capture, inspect, replay, and route webhooks. Open source with a CLI
          tunnel and MCP support for AI agents.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="#try-snag"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try it live
            <IconArrowRight size={16} />
          </Link>
          <a
            href="https://github.com/munimx/Snag"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandGithub size={16} />
            GitHub
          </a>
        </div>
      </section>

      {/* Try it */}
      <section id="try-snag" className="mx-auto max-w-2xl scroll-mt-24 pb-16">
        <EndpointCreator />
      </section>

      {/* Code example */}
      <section className="mx-auto max-w-3xl pb-20">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-lowest">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-muted-foreground/20" />
              <span className="size-3 rounded-full bg-muted-foreground/20" />
              <span className="size-3 rounded-full bg-muted-foreground/20" />
            </div>
            <span className="ml-2 text-xs text-muted-foreground">terminal</span>
          </div>
          <div className="p-5 font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground">
              <span className="text-foreground/60">$</span>{' '}
              <span className="text-foreground">npx snag-cli listen 3000</span>
            </p>
            <p className="mt-3 text-muted-foreground/70">
              → Tunneling to http://localhost:3000
            </p>
            <p className="text-muted-foreground/70">
              → Public URL:{' '}
              <span className="text-primary">https://snag-server.fly.dev/h/abc123</span>
            </p>
            <p className="mt-3 text-muted-foreground/70">
              <span className="text-emerald-400">POST</span>{' '}
              /webhooks/stripe 200{' '}
              <span className="text-muted-foreground/50">12ms</span>
            </p>
            <p className="text-muted-foreground/70">
              <span className="text-emerald-400">POST</span>{' '}
              /webhooks/github 200{' '}
              <span className="text-muted-foreground/50">8ms</span>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20">
        <div className="mx-auto grid max-w-4xl gap-12 sm:grid-cols-3 sm:gap-8">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Real-time console
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Watch requests arrive, inspect headers and bodies, replay with one
              click.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">CLI tunnel</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Stream webhooks to localhost. No ngrok, no port forwarding, no
              config.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Forwarding rules
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Route to multiple destinations with filters, retries, and delivery
              logs.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">MCP server</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Let AI agents create endpoints, wait for webhooks, and inspect
              payloads.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              TypeScript SDK
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Programmatic access. Create endpoints, subscribe to events, replay
              requests.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Self-host</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Run on your own infrastructure. Firestore + Redis. Deploy anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Open source and free to use.{' '}
          <a
            href="https://github.com/munimx/Snag"
            className="text-foreground underline underline-offset-4"
          >
            Star on GitHub
          </a>
        </p>
      </section>
    </main>
  );
}
