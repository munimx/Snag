'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';

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
    <section className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-medium">Replay</h3>
      <div className="mt-2 flex gap-2">
        <Input
          value={targetUrl}
          onChange={(event) => {
            setTargetUrl(event.target.value);
          }}
          className="flex-1"
        />
        <Button
          onClick={() => {
            void onReplay();
          }}
          disabled={loading}
        >
          {loading ? 'Replaying…' : 'Replay'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {result ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Replay status: {result.responseStatus ?? 'failed'} · latency: {result.latencyMs ?? '—'}ms
        </p>
      ) : null}
    </section>
  );
}
