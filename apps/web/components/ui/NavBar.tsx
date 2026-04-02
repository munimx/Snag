'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconBolt } from '@tabler/icons-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { getNavBarView } from '@/components/ui/nav-bar-view';

export function NavBar(): React.JSX.Element {
  const { user, logout, refresh } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const view = getNavBarView(user?.email ?? null);

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
      await refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/72 backdrop-blur-2xl">
      <div className="mx-auto flex h-[4.35rem] w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link className="group inline-flex items-center gap-2.5" href="/">
          <span className="inline-flex size-8 items-center justify-center rounded-[10px] border border-primary/40 bg-gradient-to-br from-primary/90 via-primary/80 to-accent/85 text-primary-foreground shadow-[0_0_26px_hsl(var(--primary)/0.36)] transition-transform group-hover:scale-105">
            <IconBolt size={16} aria-hidden />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.18em] text-foreground/95">SNAG</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {view.showEmail && user ? (
            <>
              <span className="max-w-[220px] truncate rounded-md border border-border/75 bg-secondary/45 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                {user.email}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoggingOut}
                className="h-8 rounded-md border-border/85 bg-background/70 px-3 text-[0.78rem] uppercase tracking-[0.06em]"
                onClick={() => {
                  void handleLogout();
                }}
              >
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </Button>
            </>
          ) : null}
          {view.showLoginLink ? (
            <Link
              className="rounded-md border border-border/50 bg-secondary/25 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.09em] text-muted-foreground transition-colors hover:border-primary/45 hover:bg-secondary/45 hover:text-foreground"
              href="/login"
            >
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
