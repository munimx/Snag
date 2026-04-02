'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestMagicLink } from '@/lib/auth';
import { webConfig } from '@/lib/config';

type LoginState = 'idle' | 'sending' | 'sent' | 'verified';

function LoginPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const isVerified = searchParams.get('verified') === '1';
  const emailFromQuery = searchParams.get('email');
  const initialState = useMemo<LoginState>(() => {
    if (isVerified) return 'verified';
    return emailFromQuery ? 'sent' : 'idle';
  }, [emailFromQuery, isVerified]);
  const [email, setEmail] = useState<string>(emailFromQuery ?? '');
  const [state, setState] = useState<LoginState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || state === 'sending') return;

    setState('sending');
    setError(null);

    try {
      const result = await requestMagicLink(normalizedEmail);
      setEmail(normalizedEmail);
      setMagicLinkUrl(result.magicLinkUrl ?? null);
      setState('sent');
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to send magic link');
      setState('idle');
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-xl font-semibold text-foreground">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email to receive a magic link.
        </p>

        {state === 'verified' ? (
          <div className="mb-6 rounded-lg border border-border bg-surface-lowest p-4">
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <IconCheck size={16} />
              Signed in successfully
            </p>
          </div>
        ) : null}

        {state === 'sent' ? (
          <div className="mb-6 rounded-lg border border-border bg-surface-lowest p-4">
            <p className="mb-2 text-sm text-foreground">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a link to {email}
            </p>
            {magicLinkUrl && webConfig.isDevelopment ? (
              <a
                className="mt-3 block break-all font-mono text-xs text-primary hover:underline"
                href={magicLinkUrl}
              >
                {magicLinkUrl}
              </a>
            ) : null}
            <button
              className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => {
                setState('idle');
                setEmail('');
                setMagicLinkUrl(null);
              }}
            >
              Try another email
            </button>
          </div>
        ) : null}

        {state === 'idle' || state === 'sending' ? (
          <div className="space-y-4">
            <Input
              disabled={state === 'sending'}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
            <Button
              className="w-full"
              disabled={!email.trim() || state === 'sending'}
              onClick={() => void handleSubmit()}
            >
              {state === 'sending' ? (
                <>
                  <IconLoader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </Button>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
