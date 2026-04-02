'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestMagicLink } from '@/lib/auth';

type LoginState = 'idle' | 'sending' | 'sent';

function LoginPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const emailFromQuery = searchParams.get('email');
  const [email, setEmail] = useState<string>(emailFromQuery ?? '');
  const [state, setState] = useState<LoginState>(emailFromQuery ? 'sent' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || state === 'sending') {
      return;
    }

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

  if (state === 'sent') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[400px] space-y-6 rounded-lg border border-border bg-card p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-primary">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          {magicLinkUrl && process.env.NODE_ENV === 'development' ? (
            <div className="space-y-2 rounded-md border border-border bg-secondary p-4">
              <p className="text-xs text-muted-foreground">Development mode direct verification link:</p>
              <a className="break-all text-sm text-primary hover:underline" href={magicLinkUrl}>
                {magicLinkUrl}
              </a>
            </div>
          ) : null}

          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setState('idle');
              setEmail('');
              setMagicLinkUrl(null);
              setError(null);
            }}
          >
            Send another
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6 rounded-lg border border-border bg-card p-8">
        <div className="space-y-2 text-center">
          <Link className="inline-block" href="/">
            <h1 className="text-3xl font-bold tracking-tight text-primary">SNAG</h1>
          </Link>
          <p className="text-sm text-muted-foreground">Sign in with magic link</p>
        </div>

        <div className="space-y-4">
          <Input
            className="w-full"
            disabled={state === 'sending'}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(event.target.value);
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                void handleSubmit();
              }
            }}
            placeholder="you@example.com"
            type="email"
            value={email}
          />

          <Button
            className="w-full"
            disabled={email.trim() === '' || state === 'sending'}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {state === 'sending' ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Sending...
              </span>
            ) : (
              'Send magic link'
            )}
          </Button>

          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          {from ? <p className="text-center text-xs text-muted-foreground">You need to sign in to continue</p> : null}
        </div>

        <div className="text-center">
          <Link className="text-sm text-muted-foreground hover:text-primary" href="/">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
