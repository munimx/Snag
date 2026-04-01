'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';

import { replayRequest } from '../../lib/api';
import type { ReplayResponse } from '../../lib/types';

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
    <section style={{ borderTop: '1px solid #243150', marginTop: 12, paddingTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Replay</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={targetUrl}
          onChange={(event) => {
            setTargetUrl(event.target.value);
          }}
          style={{
            flex: 1,
            borderRadius: 8,
            border: '1px solid #2e3a5e',
            background: '#0f1730',
            color: '#e6edf3',
            padding: 8,
          }}
        />
        <button
          onClick={() => {
            void onReplay();
          }}
          disabled={loading}
          style={{
            border: 'none',
            borderRadius: 8,
            background: '#3b82f6',
            color: '#fff',
            padding: '8px 12px',
          }}
        >
          {loading ? 'Replaying…' : 'Replay'}
        </button>
      </div>
      {error ? <p style={{ color: '#ff8a8a' }}>{error}</p> : null}
      {result ? (
        <p style={{ color: '#9fb0d1' }}>
          Replay status: {result.responseStatus ?? 'failed'} · latency: {result.latencyMs ?? '—'}ms
        </p>
      ) : null}
    </section>
  );
}
