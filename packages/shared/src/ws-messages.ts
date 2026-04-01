import type { CapturedRequest } from './types.js';

export type ClientType = 'browser' | 'cli' | 'sdk';

export type ClientMessage =
  | { type: 'register'; token: string; clientType: ClientType }
  | { type: 'ping' }
  | {
      type: 'tunnel_response';
      requestId: string;
      status: number;
      headers: Record<string, string>;
      body: string;
    };

export type ServerMessage =
  | { type: 'registered'; endpointId: string }
  | { type: 'request_captured'; request: CapturedRequest }
  | { type: 'pong' }
  | {
      type: 'tunnel_forward';
      requestId: string;
      method: string;
      path: string;
      headers: Record<string, string>;
      body: string;
    }
  | { type: 'error'; message: string };
