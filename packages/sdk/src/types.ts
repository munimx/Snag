/**
 * Config options for the Snag SDK client.
 */
export interface SnagClientOptions {
  /**
   * Base HTTP URL for the Snag server.
   * @defaultValue "https://snag-server.fly.dev"
   */
  baseUrl?: string;
  /**
   * WebSocket URL for live events.
   * @defaultValue derived from `baseUrl` + "/ws"
   */
  wsUrl?: string;
  /**
   * Custom fetch implementation.
   */
  fetchFn?: typeof fetch;
  /**
   * Optional WebSocket factory used in browser/node/custom runtimes.
   */
  websocketFactory?: (url: string) => SnagWebSocketLike;
}

/**
 * Options for creating a new endpoint.
 */
export interface CreateEndpointOptions {
  /**
   * Optional endpoint label (if supported by server endpoint-creation APIs).
   */
  label?: string;
  /**
   * Optional explicit token. Useful for deterministic setup in tests.
   */
  token?: string;
}

/**
 * Basic endpoint identity.
 */
export interface EndpointInfo {
  token: string;
  url: string;
}

/**
 * Query options for listing captured requests.
 */
export interface ListRequestsOptions {
  cursor?: string;
  limit?: number;
  method?: string;
  search?: string;
}

/**
 * Paginated request list response.
 */
export interface ListRequestsResult {
  data: import('./captured-request.js').CapturedRequest[];
  meta: {
    total: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

/**
 * Wire-format replay response from Snag server.
 */
export interface ReplayResult {
  id: string;
  targetUrl: string;
  responseStatus: number | null;
  latencyMs: number | null;
  createdAt: string;
}

/**
 * Captured request shape used across REST and WS.
 */
export interface CapturedRequestData {
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

export interface WsRegisteredMessage {
  type: 'registered';
  endpointId: string;
}

export interface WsRequestCapturedMessage {
  type: 'request_captured';
  request: CapturedRequestData;
}

export interface WsPongMessage {
  type: 'pong';
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export type SnagWsServerMessage =
  | WsRegisteredMessage
  | WsRequestCapturedMessage
  | WsPongMessage
  | WsErrorMessage;

export interface SnagWsRegisterMessage {
  type: 'register';
  token: string;
  clientType: 'sdk';
}

export interface SnagWsPingMessage {
  type: 'ping';
}

export type SnagWsClientMessage = SnagWsRegisterMessage | SnagWsPingMessage;

export interface SnagWebSocketLike {
  addEventListener(event: 'open', listener: () => void): void;
  addEventListener(event: 'close', listener: () => void): void;
  addEventListener(event: 'error', listener: (event: unknown) => void): void;
  addEventListener(
    event: 'message',
    listener: (event: { data: string | ArrayBuffer | ArrayBufferView }) => void,
  ): void;
  removeEventListener(event: 'open', listener: () => void): void;
  removeEventListener(event: 'close', listener: () => void): void;
  removeEventListener(event: 'error', listener: (event: unknown) => void): void;
  removeEventListener(
    event: 'message',
    listener: (event: { data: string | ArrayBuffer | ArrayBufferView }) => void,
  ): void;
  send(data: string): void;
  close(): void;
}
