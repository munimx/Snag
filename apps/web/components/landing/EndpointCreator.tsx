'use client';

import { useState } from 'react';

import { createEndpoint } from '../../lib/api';

export function EndpointCreator(): React.JSX.Element {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string; url: string } | null>(null);

  const handleCreate = async (): Promise<void> => {
    setIsCreating(true);
    setError(null);

    try {
      const endpoint = await createEndpoint();
      setResult(endpoint);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to create endpoint';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section
      style={{
        background: '#111a33',
        border: '1px solid #2e3a5e',
        borderRadius: 12,
        padding: 24,
        maxWidth: 780,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Create an endpoint</h2>
      <p style={{ color: '#9fb0d1' }}>
        Generate a token, start sending webhooks to the capture URL, then open the live console.
      </p>
      <button
        onClick={() => {
          void handleCreate();
        }}
        disabled={isCreating}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '10px 16px',
          cursor: 'pointer',
        }}
      >
        {isCreating ? 'Creating…' : 'Create endpoint'}
      </button>

      {error ? <p style={{ color: '#ff8a8a' }}>{error}</p> : null}

      {result ? (
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <div>
            <strong>Token:</strong> <code>{result.token}</code>
          </div>
          <div>
            <strong>Capture URL:</strong> <code>{result.url}</code>
          </div>
          <div>
            <a href={`/console/${result.token}`} style={{ color: '#7fb3ff' }}>
              Open console →
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
