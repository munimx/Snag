'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createEndpoint } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EndpointCreator(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'creating' | 'created'>('idle');
  const [endpoint, setEndpoint] = useState<{ token: string; url: string } | null>(null);
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    setState('creating');
    setError(null);

    try {
      const result = await createEndpoint();
      setEndpoint(result);
      setState('created');
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to create endpoint');
      setState('idle');
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (endpoint?.url) {
      await navigator.clipboard.writeText(endpoint.url);
    }
  };

  return (
    <div className="w-full max-w-3xl rounded-lg border border-border bg-secondary/40 p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Create an endpoint</h2>
        <p className="text-muted-foreground">
          Generate a token, start sending webhooks to the capture URL, then open the live console.
        </p>

        {state === 'created' && endpoint ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary p-6">
              <p className="mb-2 text-sm text-muted-foreground">Your endpoint is ready:</p>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 rounded bg-background p-3 font-mono text-sm text-primary">{endpoint.url}</code>
                <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={`/console/${endpoint.token}`}>Open Console</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEndpoint(null);
                  setState('idle');
                }}
              >
                Create Another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              size="lg"
              onClick={() => {
                void handleCreate();
              }}
              disabled={state === 'creating'}
              className="w-full max-w-xs"
            >
              {state === 'creating' ? 'Creating...' : 'Create Endpoint'}
            </Button>
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="mt-8 rounded-lg border border-border p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Open Existing Endpoint</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Enter endpoint token"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
            }}
            className="flex-1 max-w-md font-mono"
          />
          <Button
            onClick={() => {
              if (token) {
                router.push(`/console/${token}`);
              }
            }}
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
