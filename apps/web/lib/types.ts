import type { CapturedRequest, Delivery, ForwardRule } from '@snag/shared/types';

export interface RequestsListResponse {
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

export interface DeliveriesListResponse {
  data: Delivery[];
  meta: {
    total: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface CreateRulePayload {
  name?: string;
  filterMethod?: string;
  filterBodyKey?: string;
  filterBodyVal?: string;
  destinationUrl: string;
  retries?: number;
}

export type RulesListResponse = ForwardRule[];
