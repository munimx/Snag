import { webConfig } from './config';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthMeResponse {
  user: AuthUser | null;
  expiresAt?: string;
}

function buildUrl(path: string): string {
  return `${webConfig.serverUrl}${path}`;
}

export async function requestMagicLink(email: string): Promise<{ ok: boolean; magicLinkUrl: string; expiresAt: string }> {
  const response = await fetch(buildUrl('/api/auth/magic-link'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to request magic link (${response.status})`);
  }

  return (await response.json()) as { ok: boolean; magicLinkUrl: string; expiresAt: string };
}

export async function getCurrentUser(): Promise<AuthMeResponse> {
  const response = await fetch(buildUrl('/api/auth/me'), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.status === 401) {
    return { user: null };
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch current user (${response.status})`);
  }

  return (await response.json()) as AuthMeResponse;
}

export async function logout(): Promise<void> {
  const response = await fetch(buildUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to logout (${response.status})`);
  }
}
