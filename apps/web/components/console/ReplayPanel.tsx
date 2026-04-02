'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';
import { IconLoader2, IconPlayerPlayFilled, IconSend2, IconWorld } from '@tabler/icons-react';

import { replayRequest } from '../../lib/api';
import type { ReplayResponse } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ReplayPanelProps {
  request: CapturedRequest;
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
    <section className="space-y-3 rounded-md border border-border/60 bg-secondary/25 p-3">
      <h3 className="inline-flex items-center gap-2 text-sm font-medium">
        <IconSend2 size={14} />
        Replay
      </h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={targetUrl}
          onChange={(event) => {
            setTargetUrl(event.target.value);
          }}
          className="flex-1 font-mono text-xs"
        />
        <Button
          className="h-9 justify-between sm:min-w-[140px]"
          onClick={() => {
            void onReplay();
          }}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <IconLoader2 size={14} className="animate-spin" />
              Replaying…
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
        <IconWorld size={13} />
        Send to your local or staging endpoint.
      </p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {result ? (
        <p className="text-xs text-muted-foreground">
          Replay status: {result.responseStatus ?? 'failed'} · latency: {result.latencyMs ?? '—'}ms
        </p>
      ) : null}
    </section>
  );
}
