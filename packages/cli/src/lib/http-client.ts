import type { CapturedRequest } from '@snag/shared/types';

export interface ListRequestsResponse {
  data: CapturedRequest[];
  meta: {
    total: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface ReplayResponse {
  id: string;
  targetUrl: string;
  responseStatus: number | null;
  latencyMs: number | null;
  createdAt: string;
}

function buildUrl(path: string, serverUrl: string): string {
  return new URL(path, serverUrl).toString();
}

function createAuthHeaders(authToken?: string): HeadersInit | undefined {
  if (!authToken) {
    return undefined;
  }
  return {
    authorization: `Bearer ${authToken}`,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export async function getRequestById(serverUrl: string, requestId: string, authToken?: string): Promise<CapturedRequest> {
  const response = await fetch(buildUrl(`/api/requests/${requestId}`, serverUrl), {
    method: 'GET',
    headers: createAuthHeaders(authToken),
  });
  return parseJsonResponse<CapturedRequest>(response);
}

export async function listRequests(
  serverUrl: string,
  token: string,
  params?: { limit?: number; method?: string; search?: string },
  authToken?: string,
): Promise<ListRequestsResponse> {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  if (params?.method) {
    query.set('method', params.method);
  }
  if (params?.search) {
    query.set('search', params.search);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  const response = await fetch(buildUrl(`/api/endpoints/${token}/requests${suffix}`, serverUrl), {
    method: 'GET',
    headers: createAuthHeaders(authToken),
  });
  return parseJsonResponse<ListRequestsResponse>(response);
}

export async function replayRequest(
  serverUrl: string,
  requestId: string,
  targetUrl: string,
  authToken?: string,
): Promise<ReplayResponse> {
  const response = await fetch(buildUrl(`/api/requests/${requestId}/replay`, serverUrl), {
    method: 'POST',
    headers: {
      ...(createAuthHeaders(authToken) ?? {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ targetUrl }),
  });
  return parseJsonResponse<ReplayResponse>(response);
}

export async function requestMagicLink(serverUrl: string, email: string): Promise<{ magicLinkUrl: string }> {
  const response = await fetch(buildUrl('/api/auth/magic-link', serverUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseJsonResponse<{ magicLinkUrl: string }>(response);
}

export async function verifyMagicLinkToken(
  serverUrl: string,
  token: string,
): Promise<{ token: string; expiresAt: string; user: { id: string; email: string } }> {
  const url = new URL('/api/auth/verify', serverUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('mode', 'token');

  const response = await fetch(url.toString(), { method: 'GET' });
  return parseJsonResponse<{ token: string; expiresAt: string; user: { id: string; email: string } }>(response);
}
