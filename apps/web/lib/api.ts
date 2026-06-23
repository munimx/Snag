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

export async function createEndpoint(label?: string): Promise<{ token: string; url: string }> {
  const response = await fetch(buildUrl('/api/endpoints'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to create endpoint (${response.status})`);
  }

  return (await response.json()) as { token: string; url: string };
}

export async function sendTestEvent(token: string): Promise<{ ok: boolean; requestId: string }> {
  const response = await fetch(buildUrl(`/h/${encodeURIComponent(token)}?source=snag-onboarding`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: `evt_snag_test_${Date.now()}`,
      type: 'snag.test_event',
      createdAt: new Date().toISOString(),
      data: {
        object: {
          id: 'demo_payload',
          status: 'delivered',
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send test event (${response.status})`);
  }

  return (await response.json()) as { ok: boolean; requestId: string };
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
