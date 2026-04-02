'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';
import { IconLoader2, IconPlayerPlayFilled, IconSend2, IconWorld } from '@tabler/icons-react';

import { replayRequest } from '../../lib/api';
import type { ReplayResponse } from '../../lib/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ReplayPanelProps {
  request: CapturedRequest;
}

function getStatusVariant(status: number | null): 'status2xx' | 'status3xx' | 'status4xx' | 'status5xx' | 'secondary' {
  if (status === null) return 'secondary';
  if (status >= 500) return 'status5xx';
  if (status >= 400) return 'status4xx';
  if (status >= 300) return 'status3xx';
  return 'status2xx';
}

export function ReplayPanel({ request }: ReplayPanelProps): React.JSX.Element {
  const [targetUrl, setTargetUrl] = useState<string>('http://localhost:3000/webhook');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onReplay = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const replay = await replayRequest(request.id, targetUrl);
      setResult(replay);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Replay failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-outline-variant/15 bg-surface-low/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 font-label text-xs font-medium uppercase tracking-extra-wide text-muted-foreground">
          <IconSend2 size={14} className="text-primary/60" />
          Replay request
        </h3>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {request.id.slice(0, 8)}
        </Badge>
      </div>
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={targetUrl}
          onChange={(event) => {
            setTargetUrl(event.target.value);
          }}
          placeholder="http://localhost:3000/webhook"
          className="flex-1 font-mono text-xs"
        />
        <Button
          className="justify-between sm:min-w-[140px]"
          onClick={() => {
            void onReplay();
          }}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <IconLoader2 size={14} className="animate-spin" />
              Sending...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <IconPlayerPlayFilled size={12} />
              Replay
            </span>
          )}
        </Button>
      </div>

      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <IconWorld size={13} className="text-muted-foreground/60" />
        Forward this request to your local or staging endpoint.
      </p>

      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-high/40 px-3 py-2.5">
          <Badge variant={getStatusVariant(result.responseStatus ?? null)}>
            {result.responseStatus ?? 'Failed'}
          </Badge>
          <span className="font-label text-[11px] uppercase tracking-extra-wide text-muted-foreground">
            Latency: <span className="font-mono text-foreground">{result.latencyMs ?? '—'}ms</span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
