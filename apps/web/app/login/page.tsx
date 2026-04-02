'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { IconAt, IconCircleCheck, IconLoader2, IconMailCheck, IconSend2 } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestMagicLink } from '@/lib/auth';
import { webConfig } from '@/lib/config';

type LoginState = 'idle' | 'sending' | 'sent' | 'verified';

function LoginPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const isVerified = searchParams.get('verified') === '1';
  const emailFromQuery = searchParams.get('email');
  const initialState = useMemo<LoginState>(() => {
    if (isVerified) {
      return 'verified';
    }
    return emailFromQuery ? 'sent' : 'idle';
  }, [emailFromQuery, isVerified]);
  const [email, setEmail] = useState<string>(emailFromQuery ?? '');
  const [state, setState] = useState<LoginState>(initialState);
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

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-10">
      <section className="w-full max-w-[460px] space-y-5 rounded-2xl border border-border/70 bg-card/65 p-6 sm:p-7">
        <div className="space-y-2 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Magic link auth</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sign in to Snag</h1>
          <p className="text-sm text-muted-foreground">
            Use your email and we’ll send a one-time login link to your inbox.
          </p>
        </div>

        {state === 'verified' ? (
          <div className="space-y-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
              <IconCircleCheck size={16} />
              Email verified
            </p>
            <p className="text-sm text-muted-foreground">Your sign-in is complete. You can continue to the console or send another link.</p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setState('idle');
                setError(null);
              }}
            >
              Send another magic link
            </Button>
          </div>
        ) : null}

        {state === 'sent' ? (
          <div className="space-y-4 rounded-lg border border-primary/35 bg-primary/10 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <IconMailCheck size={16} />
              Check your email
            </p>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="font-semibold text-foreground">{email}</span>.
            </p>

            {magicLinkUrl && webConfig.isDevelopment ? (
              <div className="space-y-2 rounded-md border border-border/70 bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Development direct verification link:</p>
                <a className="break-all font-mono text-xs text-primary hover:underline" href={magicLinkUrl}>
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
        ) : state === 'idle' || state === 'sending' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                Email
              </label>
              <Input
                id="email"
                className="h-11 bg-background/70"
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
            </div>

            <Button
              className="h-11 w-full justify-between bg-gradient-to-r from-primary/95 to-accent/85 text-primary-foreground"
              disabled={email.trim() === '' || state === 'sending'}
              onClick={() => {
                void handleSubmit();
              }}
            >
              {state === 'sending' ? (
                <span className="inline-flex items-center gap-2">
                  <IconLoader2 size={15} className="animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2">
                    <IconSend2 size={15} />
                    Send magic link
                  </span>
                  <IconAt size={14} />
                </>
              )}
            </Button>

            {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}

        {from ? <p className="text-center text-xs text-muted-foreground">You need to sign in to continue.</p> : null}

        <div className="text-center">
          <Link className="text-xs uppercase tracking-[0.08em] text-muted-foreground hover:text-primary" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">Loading login…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
