'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';

import { copyText, toCurl } from '../../lib/curl';
import { ReplayPanel } from './ReplayPanel';

interface RequestDetailProps {
  request: CapturedRequest | null;
}

export function RequestDetail({ request }: RequestDetailProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!request) {
    return <div style={{ padding: 16, color: '#9fb0d1' }}>Select a request to view details.</div>;
  }

  const curl = toCurl(request);

  const onCopyCurl = async (): Promise<void> => {
    try {
      await copyText(curl);
      setCopyError(null);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Copy failed';
      setCopyError(message);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>
        {request.method} {request.path}
      </h2>
      <p style={{ color: '#9fb0d1' }}>Received: {new Date(request.receivedAt).toLocaleString()}</p>

      <section>
        <h3>Headers</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(request.headers, null, 2)}</pre>
      </section>

      <section>
        <h3>Query</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(request.query, null, 2)}</pre>
      </section>

      <section>
        <h3>Body</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{request.body ?? 'No body'}</pre>
      </section>

      <section>
        <h3>cURL</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{curl}</pre>
        <button
          onClick={() => {
            void onCopyCurl();
          }}
          style={{
            border: '1px solid #2e3a5e',
            borderRadius: 8,
            padding: '6px 10px',
            color: '#d7e5ff',
            background: '#0f1730',
          }}
        >
          {copied ? 'Copied!' : 'Copy as cURL'}
        </button>
        {copyError ? <p style={{ color: '#ff8a8a' }}>{copyError}</p> : null}
      </section>

      <ReplayPanel request={request} />
    </div>
  );
}
