import type { CapturedRequest, Delivery, ForwardRule } from '@snag/shared/types';

interface DbCapturedRequestShape {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  query: unknown;
  headers: unknown;
  body: string | null;
  bodyType: string | null;
  status: number | null;
  latencyMs: number | null;
  receivedAt: Date;
}

export function toCapturedRequest(
  request: DbCapturedRequestShape,
): CapturedRequest {
  return {
    id: request.id,
    endpointId: request.endpointId,
    method: request.method,
    path: request.path,
    query: (request.query as Record<string, string>) ?? {},
    headers: (request.headers as Record<string, string>) ?? {},
    body: request.body,
    bodyType: request.bodyType,
    status: request.status,
    latencyMs: request.latencyMs,
    receivedAt: request.receivedAt.toISOString(),
  };
}

interface DbForwardRuleShape {
  id: string;
  endpointId: string;
  name: string | null;
  enabled: boolean;
  filterMethod: string | null;
  filterBodyKey: string | null;
  filterBodyVal: string | null;
  destinationUrl: string;
  retries: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DbDeliveryShape {
  id: string;
  endpointId: string;
  ruleId: string;
  requestId: string;
  targetUrl: string;
  status: number | null;
  latencyMs: number | null;
  attempt: number;
  error: string | null;
  createdAt: Date;
}

export function toForwardRule(rule: DbForwardRuleShape): ForwardRule {
  return {
    id: rule.id,
    endpointId: rule.endpointId,
    name: rule.name,
    enabled: rule.enabled,
    filterMethod: rule.filterMethod,
    filterBodyKey: rule.filterBodyKey,
    filterBodyVal: rule.filterBodyVal,
    destinationUrl: rule.destinationUrl,
    retries: rule.retries,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export function toDelivery(delivery: DbDeliveryShape): Delivery {
  return {
    id: delivery.id,
    endpointId: delivery.endpointId,
    ruleId: delivery.ruleId,
    requestId: delivery.requestId,
    targetUrl: delivery.targetUrl,
    status: delivery.status,
    latencyMs: delivery.latencyMs,
    attempt: delivery.attempt,
    error: delivery.error,
    createdAt: delivery.createdAt.toISOString(),
  };
}
