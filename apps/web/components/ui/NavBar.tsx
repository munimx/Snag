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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link className="group inline-flex items-center gap-2" href="/">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/90 to-accent/80 text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-transform group-hover:scale-105">
            <IconBolt size={16} aria-hidden />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.14em] text-foreground/95">SNAG</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {view.showEmail && user ? (
            <>
              <span className="max-w-[220px] truncate rounded-md border border-border/70 bg-secondary/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                {user.email}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoggingOut}
                className="h-8 rounded-md border-border/80 bg-background/60 px-3"
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
              className="rounded-md border border-transparent px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border/70 hover:bg-secondary/40 hover:text-foreground"
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
