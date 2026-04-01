import { Endpoint } from './endpoint.js';
import { SnagSdkError } from './errors.js';
import type { CreateEndpointOptions, EndpointInfo, SnagClientOptions, SnagWebSocketLike } from './types.js';

/**
 * Main SDK client for creating and interacting with Snag endpoints.
 */
export class SnagClient {
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly websocketFactory: (url: string) => SnagWebSocketLike;

  public constructor(options: SnagClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://localhost:8080').replace(/\/$/, '');
    this.wsUrl = options.wsUrl ?? deriveWsUrl(this.baseUrl);
    this.fetchFn = options.fetchFn ?? fetch;

    if (options.websocketFactory) {
      this.websocketFactory = options.websocketFactory;
    } else {
      const wsCtor = globalThis.WebSocket;
      if (!wsCtor) {
        throw new SnagSdkError('No WebSocket implementation found. Provide websocketFactory in SnagClientOptions.');
      }
      this.websocketFactory = (url: string) => new wsCtor(url) as unknown as SnagWebSocketLike;
    }
  }

  /**
   * Creates an endpoint and returns an Endpoint helper.
   * Uses REST endpoint-creation API if available, with fallback token generation.
   */
  public async createEndpoint(options: CreateEndpointOptions = {}): Promise<Endpoint> {
    const fromApi = await this.tryCreateEndpointViaApi(options);
    if (fromApi) {
      return this.toEndpoint(fromApi);
    }

    const token = options.token ?? createToken();
    return this.toEndpoint({
      token,
      url: `${this.baseUrl}/h/${encodeURIComponent(token)}`,
    });
  }

  /**
   * Returns a local endpoint helper for a known token.
   */
  public getEndpoint(token: string): Endpoint {
    const safeToken = token.trim();
    if (safeToken.length === 0) {
      throw new SnagSdkError('Endpoint token cannot be empty.');
    }

    return this.toEndpoint({
      token: safeToken,
      url: `${this.baseUrl}/h/${encodeURIComponent(safeToken)}`,
    });
  }

  private async tryCreateEndpointViaApi(options: CreateEndpointOptions): Promise<EndpointInfo | null> {
    const body = {
      ...(options.label ? { label: options.label } : {}),
      ...(options.token ? { token: options.token } : {}),
    };

    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/endpoints`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as unknown;
      if (!isEndpointLike(payload)) {
        return null;
      }

      return {
        token: payload.token,
        url: payload.url ?? `${this.baseUrl}/h/${encodeURIComponent(payload.token)}`,
      };
    } catch {
      return null;
    }
  }

  private toEndpoint(info: EndpointInfo): Endpoint {
    return new Endpoint(info, {
      baseUrl: this.baseUrl,
      wsUrl: this.wsUrl,
      fetchFn: this.fetchFn,
      websocketFactory: this.websocketFactory,
    });
  }
}

function deriveWsUrl(baseUrl: string): string {
  if (baseUrl.startsWith('https://')) {
    return baseUrl.replace('https://', 'wss://') + '/ws';
  }
  if (baseUrl.startsWith('http://')) {
    return baseUrl.replace('http://', 'ws://') + '/ws';
  }
  return `${baseUrl}/ws`;
}

function createToken(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `sdk_${random}`;
}

function isEndpointLike(value: unknown): value is { token: string; url?: string } {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.token === 'string' && candidate.token.length > 0;
}
