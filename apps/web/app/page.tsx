import type React from 'react';
import Link from 'next/link';
import { IconBrandGithub, IconHistory, IconRoute, IconTerminal2, IconTopologyStar3 } from '@tabler/icons-react';

import { EndpointCreator } from '../components/landing/EndpointCreator';

export default function LandingPage(): React.JSX.Element {
  return (
    <main className="min-h-[calc(100vh-4rem)] text-foreground">
      <div className="grid gap-10 pb-8 pt-8 lg:gap-12 lg:pt-12">
        <section className="grid gap-8 rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:p-8">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-primary/45 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
              Webhook observability, redesigned
            </span>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Inspect, replay, and route webhooks in real time
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Snag gives every integration a live stream, a request microscope, and programmable routing—without
              spinning up custom infrastructure.
            </p>
          </div>
          <EndpointCreator />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconTerminal2 size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Real-time console</h2>
            <p className="text-sm text-muted-foreground">
              Watch captured traffic arrive instantly, inspect payloads, replay requests, and compare body diffs.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconRoute size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Forwarding rules</h2>
            <p className="text-sm text-muted-foreground">
              Route events to multiple destinations with method/body filters and delivery diagnostics.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconTopologyStar3 size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">MCP + SDK ready</h2>
            <p className="text-sm text-muted-foreground">
              Let agents and apps create endpoints, watch traffic, and automate integration testing.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconHistory size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">History at a glance</h2>
            <p className="text-sm text-muted-foreground">
              Filter request history across method, search terms, and time windows, then jump directly into console
              detail.
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/50 p-5">
          <p className="text-sm text-muted-foreground">
            Built for developers debugging webhooks in production-like flows. Use <span className="font-mono">snag
            listen</span> locally, observe events in the console, and route to downstream services.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-md border border-border/70 bg-secondary/30 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Log in
            </Link>
            <a
              href="https://github.com/munimx/Snag"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-secondary/30 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <IconBrandGithub size={14} />
              GitHub
            </a>
            <Link
              href="/history/demo"
              className="inline-flex items-center rounded-md border border-border/70 bg-secondary/30 px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Explore history UI
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
