'use client';

import Link from 'next/link';
import { useState } from 'react';

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link className="font-mono text-lg font-semibold tracking-tight text-primary" href="/">
          SNAG
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {view.showEmail && user ? (
            <>
              <span className="text-muted-foreground">{user.email}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoggingOut}
                onClick={() => {
                  void handleLogout();
                }}
              >
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </Button>
            </>
          ) : null}
          {view.showLoginLink ? (
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/login">
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
