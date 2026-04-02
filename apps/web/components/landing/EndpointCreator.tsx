'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconArrowRight, IconCheck, IconCopy, IconLoader2, IconPlugConnected } from '@tabler/icons-react';

import { createEndpoint } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EndpointCreator(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'creating' | 'created'>('idle');
  const [endpoint, setEndpoint] = useState<{ token: string; url: string } | null>(null);
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    if (state === 'creating') {
      return;
    }

    setState('creating');
    setError(null);

    try {
      const result = await createEndpoint();
      setEndpoint(result);
      setState('created');
      toast({
        title: 'Endpoint created',
        description: `Token ${result.token} is ready to receive webhooks.`,
      });
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to create endpoint';
      setError(message);
      setState('idle');
      toast({
        title: 'Endpoint creation failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (endpoint?.url) {
      await navigator.clipboard.writeText(endpoint.url);
      toast({
        title: 'Copied',
        description: 'Public endpoint URL copied to clipboard.',
      });
    }
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-border/70 bg-card/70 p-6">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden />
      <div className="relative space-y-6">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
            <IconPlugConnected size={13} />
            Endpoint bootstrap
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create a public webhook endpoint</h2>
          <p className="text-sm text-muted-foreground">
            Generate a token, send events to the capture URL, and jump straight into the live console.
          </p>
        </div>

        {state === 'created' && endpoint ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/35 bg-primary/10 p-4">
              <p className="mb-3 inline-flex items-center gap-2 text-xs text-primary">
                <IconCheck size={14} />
                Endpoint is live
              </p>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Token</span>
                  <code className="rounded bg-background/75 px-2 py-1 font-mono text-xs text-foreground">{endpoint.token}</code>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 rounded-md border border-border/60 bg-background/70 p-2 font-mono text-xs text-primary">
                    {endpoint.url}
                  </code>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => void handleCopy()}>
                    <IconCopy size={14} />
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild className="h-9 flex-1 justify-between">
                <Link href={`/console/${endpoint.token}`}>
                  Open live console
                  <IconArrowRight size={14} />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  setEndpoint(null);
                  setState('idle');
                }}
              >
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              size="lg"
              className="h-11 w-full justify-between rounded-md bg-gradient-to-r from-primary/95 to-accent/85 text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)]"
              onClick={() => {
                void handleCreate();
              }}
              disabled={state === 'creating'}
            >
              {state === 'creating' ? (
                <span className="inline-flex items-center gap-2">
                  <IconLoader2 className="animate-spin" size={15} />
                  Creating endpoint...
                </span>
              ) : (
                <>
                  Create endpoint
                  <IconArrowRight size={14} />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">No setup needed—your endpoint is generated server-side.</p>
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-lg border border-border/70 bg-secondary/30 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Open existing endpoint
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Enter endpoint token"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
              }}
              className="flex-1 font-mono text-xs"
            />
            <Button
              className="h-9 rounded-md"
              onClick={() => {
                if (token.trim()) {
                  router.push(`/console/${encodeURIComponent(token.trim())}`);
                }
              }}
            >
              Open console
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
