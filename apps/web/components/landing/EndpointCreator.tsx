'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconArrowRight, IconCheck, IconCopy, IconLoader2 } from '@tabler/icons-react';

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
  const [copied, setCopied] = useState(false);

  const handleCreate = async (): Promise<void> => {
    if (state === 'creating') return;
    setState('creating');
    setError(null);

    try {
      const result = await createEndpoint();
      setEndpoint(result);
      setState('created');
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to create endpoint';
      setError(message);
      setState('idle');
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!endpoint?.url) return;
    await navigator.clipboard.writeText(endpoint.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state === 'created' && endpoint) {
    return (
      <div className="rounded-xl border border-border bg-surface-lowest p-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400">
          <IconCheck size={16} />
          Endpoint created
        </div>
        <div className="mb-4 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-sm text-foreground">
            {endpoint.url}
          </code>
          <button
            onClick={() => void handleCopy()}
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </button>
        </div>
        <div className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href={`/console/${endpoint.token}`}>
              Open console
              <IconArrowRight size={14} />
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setEndpoint(null);
              setState('idle');
            }}
          >
            New
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-lowest p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Create an endpoint instantly, or open an existing one by token.
      </p>
      <div className="mb-4">
        <Button
          className="w-full"
          onClick={() => void handleCreate()}
          disabled={state === 'creating'}
        >
          {state === 'creating' ? (
            <>
              <IconLoader2 className="animate-spin" size={16} />
              Creating...
            </>
          ) : (
            <>
              Create endpoint
              <IconArrowRight size={14} />
            </>
          )}
        </Button>
      </div>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Input
          placeholder="Existing token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
        <Button
          variant="ghost"
          onClick={() => {
            if (token.trim()) {
              router.push(`/console/${encodeURIComponent(token.trim())}`);
            }
          }}
        >
          Open
        </Button>
      </div>
    </div>
  );
}
