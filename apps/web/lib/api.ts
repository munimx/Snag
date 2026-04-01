import type { CapturedRequest } from '@snag/shared/types';

import { webConfig } from './config';
import type {
  CreateRulePayload,
  DeliveriesListResponse,
  ReplayResponse,
  RequestsListResponse,
  RulesListResponse,
} from './types';

function buildUrl(path: string): string {
  return `${webConfig.serverUrl}${path}`;
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export async function createEndpoint(): Promise<{ token: string; url: string }> {
  const token = generateToken();
  return { token, url: `${webConfig.serverUrl}/h/${token}` };
}

export async function listRequests(
  token: string,
  options?: { method?: string; search?: string; limit?: number; cursor?: string },
): Promise<RequestsListResponse> {
  const query = new URLSearchParams();
  if (options?.method) {
    query.set('method', options.method);
  }
  if (options?.search) {
    query.set('search', options.search);
  }
  if (options?.limit) {
    query.set('limit', String(options.limit));
  }
  if (options?.cursor) {
    query.set('cursor', options.cursor);
  }

  const response = await fetch(buildUrl(`/api/endpoints/${encodeURIComponent(token)}/requests?${query.toString()}`), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch requests (${response.status})`);
  }
  return (await response.json()) as RequestsListResponse;
}

export async function getRequestDetail(id: string): Promise<CapturedRequest> {
  const response = await fetch(buildUrl(`/api/requests/${encodeURIComponent(id)}`), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch request detail (${response.status})`);
  }
  return (await response.json()) as CapturedRequest;
}

export async function replayRequest(id: string, targetUrl: string): Promise<ReplayResponse> {
  const response = await fetch(buildUrl(`/api/requests/${encodeURIComponent(id)}/replay`), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ targetUrl }),
  });
  if (!response.ok) {
    throw new Error(`Failed to replay request (${response.status})`);
  }
  return (await response.json()) as ReplayResponse;
}

export async function listRules(token: string): Promise<RulesListResponse> {
  const response = await fetch(buildUrl(`/api/endpoints/${encodeURIComponent(token)}/rules`), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch rules (${response.status})`);
  }
  return (await response.json()) as RulesListResponse;
}

export async function createRule(token: string, payload: CreateRulePayload): Promise<RulesListResponse[number]> {
  const response = await fetch(buildUrl(`/api/endpoints/${encodeURIComponent(token)}/rules`), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create rule (${response.status})`);
  }
  return (await response.json()) as RulesListResponse[number];
}

export async function listDeliveries(ruleId: string, limit = 20): Promise<DeliveriesListResponse> {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  const response = await fetch(buildUrl(`/api/rules/${encodeURIComponent(ruleId)}/deliveries?${query.toString()}`), {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch deliveries (${response.status})`);
  }
  return (await response.json()) as DeliveriesListResponse;
}
