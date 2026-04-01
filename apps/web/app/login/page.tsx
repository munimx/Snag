'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { requestMagicLink } from '../../lib/auth';

export default function LoginPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === '1';
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);

  const statusText = useMemo(() => {
    if (verified) {
      return 'Magic link verified. You are now logged in.';
    }
    return null;
  }, [verified]);

  const submit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await requestMagicLink(email.trim().toLowerCase());
      setMagicLinkUrl(result.magicLinkUrl);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to request magic link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '56px 24px' }}>
      <h1 style={{ marginTop: 0 }}>Login to Snag</h1>
      <p style={{ color: '#9fb0d1' }}>Enter your email and we will generate a magic link sign-in URL.</p>
      {statusText ? <p style={{ color: '#9efcb3' }}>{statusText}</p> : null}
      <div style={{ display: 'grid', gap: 12 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          style={{
            background: '#0f1730',
            color: '#e6edf3',
            border: '1px solid #2e3a5e',
            borderRadius: 8,
            padding: 10,
          }}
        />
        <button
          type="button"
          disabled={isSubmitting || email.trim() === ''}
          onClick={() => {
            void submit();
          }}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          {isSubmitting ? 'Sending…' : 'Send magic link'}
        </button>
      </div>

      {error ? <p style={{ color: '#ff8a8a' }}>{error}</p> : null}

      {magicLinkUrl ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#9fb0d1', marginBottom: 8 }}>
            Development shortcut: open this link to verify (email delivery is not wired in this phase).
          </p>
          <a href={magicLinkUrl} style={{ color: '#7fb3ff', wordBreak: 'break-all' }}>
            {magicLinkUrl}
          </a>
        </div>
      ) : null}
    </main>
  );
}
