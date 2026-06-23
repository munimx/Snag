'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLoader2,
  IconTerminal2,
} from '@tabler/icons-react';

import { createEndpoint, sendTestEvent } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EndpointCreator(): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'creating' | 'created'>('idle');
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [endpoint, setEndpoint] = useState<{ token: string; url: string } | null>(null);
  const [testRequestId, setTestRequestId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'url' | 'curl' | null>(null);

  const handleCreate = async (): Promise<void> => {
    if (state === 'creating') return;
    setState('creating');
    setError(null);

    try {
      const result = await createEndpoint();
      setEndpoint(result);
      setTestState('idle');
      setTestRequestId(null);
      setState('created');
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to create endpoint';
      setError(message);
      setState('idle');
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleCopyUrl = async (): Promise<void> => {
    if (!endpoint?.url) return;
    await navigator.clipboard.writeText(endpoint.url);
    setCopied('url');
    setTimeout(() => setCopied(null), 2000);
  };

  const sampleCurl = endpoint
    ? `curl -X POST '${endpoint.url}?source=snag-onboarding' \\
  -H 'content-type: application/json' \\
  --data '{"type":"snag.test_event","data":{"object":{"status":"delivered"}}}'`
    : '';

  const handleCopyCurl = async (): Promise<void> => {
    if (!sampleCurl) return;
    await navigator.clipboard.writeText(sampleCurl);
    setCopied('curl');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSendTestEvent = async (): Promise<void> => {
    if (!endpoint || testState === 'sending') return;
    setTestState('sending');
    setError(null);

    try {
      const response = await sendTestEvent(endpoint.token);
      setTestRequestId(response.requestId);
      setTestState('sent');
      toast({
        title: 'Test event captured',
        description: response.requestId,
      });
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to send test event';
      setError(message);
      setTestState('idle');
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (state === 'created' && endpoint) {
    const consoleHref = `/console/${endpoint.token}${testRequestId ? `?selected=${testRequestId}` : ''}`;

    return (
      <div className="rounded-xl border border-border bg-surface-lowest p-6 shadow-2xl shadow-black/20">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <IconCheck size={16} />
            Endpoint ready
          </div>
          {testState === 'sent' ? (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] text-emerald-300">
              {testRequestId}
            </span>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 font-label text-[11px] uppercase tracking-extra-wide text-muted-foreground">
              Capture URL
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-sm text-foreground">
                {endpoint.url}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  void handleCopyUrl();
                }}
                aria-label="Copy capture URL"
              >
                {copied === 'url' ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-extra-wide text-muted-foreground">
                <IconTerminal2 size={14} />
                Sample event
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void handleCopyCurl();
                }}
              >
                {copied === 'curl' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                Copy
              </Button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
              {sampleCurl}
            </pre>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void handleSendTestEvent();
              }}
              disabled={testState === 'sending'}
            >
              {testState === 'sending' ? (
                <>
                  <IconLoader2 className="animate-spin" size={16} />
                  Sending
                </>
              ) : testState === 'sent' ? (
                <>
                  <IconCheck size={16} />
                  Event sent
                </>
              ) : (
                <>
                  <IconBolt size={16} />
                  Send test event
                </>
              )}
            </Button>
            <Button asChild>
              <Link href={consoleHref}>
                Open console
                <IconExternalLink size={14} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEndpoint(null);
                setTestRequestId(null);
                setTestState('idle');
                setState('idle');
              }}
            >
              New
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-lowest p-6 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <p className="font-label text-[11px] uppercase tracking-extra-wide text-primary">
          Live in seconds
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Create a capture URL</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a hosted endpoint, send a sample event, then inspect the request stream.
        </p>
      </div>
      <div className="mb-5">
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
