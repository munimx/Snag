import type React from 'react';
import Link from 'next/link';
import {
  IconBrandGithub,
  IconRoute,
  IconShieldCheck,
  IconTerminal2,
  IconTopologyStar3,
  IconWaveSawTool,
} from '@tabler/icons-react';

import { EndpointCreator } from '../components/landing/EndpointCreator';

export default function LandingPage(): React.JSX.Element {
  return (
    <main className="min-h-[calc(100vh-4rem)] text-foreground">
      <div className="grid gap-8 pb-8 pt-8 lg:gap-10 lg:pt-10">
        <section className="grid gap-8 rounded-2xl border border-border/70 bg-card/65 p-6 backdrop-blur-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:p-8">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-primary/45 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
              Premium webhook orchestration
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                Control your webhook edge from one command center
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Capture traffic instantly, tunnel events into local dev, and route production-ready flows without
                maintaining extra infrastructure.
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/55 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">Install the CLI</p>
              <code className="block overflow-x-auto rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-xs text-primary sm:text-sm">
                curl -sL snag.sh | sh
              </code>
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 sm:text-sm">
              <p className="rounded-md border border-border/60 bg-secondary/25 px-3 py-2">Zero-config endpoint spin up</p>
              <p className="rounded-md border border-border/60 bg-secondary/25 px-3 py-2">Live payload replay + inspection</p>
              <p className="rounded-md border border-border/60 bg-secondary/25 px-3 py-2">Built for teams shipping integrations</p>
            </div>
          </div>
          <EndpointCreator />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconTerminal2 size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Console</h2>
            <p className="text-sm text-muted-foreground">
              See every request in real time, inspect payloads, replay events, and debug failures with full context.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconWaveSawTool size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">CLI Tunnel</h2>
            <p className="text-sm text-muted-foreground">
              Run <span className="font-mono">snag listen</span> to stream public webhooks directly to localhost with zero ingress setup.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconTopologyStar3 size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">MCP Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect agents and internal tooling to create endpoints, monitor traffic, and automate integration checks.
            </p>
          </article>
          <article className="rounded-xl border border-border/60 bg-secondary/35 p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <IconRoute size={17} />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Forwarding Rules</h2>
            <p className="text-sm text-muted-foreground">
              Fan out webhooks to multiple destinations with filters, retries, and delivery diagnostics.
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/50 p-5">
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-3 py-1">
              <IconShieldCheck size={14} className="text-primary" />
              Private by default
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-3 py-1">
              Request history and replay
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-3 py-1">
              Fast setup for local and cloud
            </p>
          </div>
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
