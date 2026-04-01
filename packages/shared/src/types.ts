export interface Endpoint {
  id: string;
  token: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapturedRequest {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  bodyType: string | null;
  status: number | null;
  latencyMs: number | null;
  receivedAt: string;
}

export interface Flow {
  id: string;
  endpointId: string;
  name: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForwardRule {
  id: string;
  endpointId: string;
  name: string | null;
  enabled: boolean;
  filterMethod: string | null;
  filterBodyKey: string | null;
  filterBodyVal: string | null;
  destinationUrl: string;
  retries: number;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  endpointId: string;
  ruleId: string;
  requestId: string;
  targetUrl: string;
  status: number | null;
  latencyMs: number | null;
  attempt: number;
  error: string | null;
  createdAt: string;
}
