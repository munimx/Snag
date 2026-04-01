import { CapturedRequest } from './captured-request.js';
import { SnagSdkError } from './errors.js';
import { requestJson, requestNoContent } from './http.js';
import type {
  CapturedRequestData,
  EndpointInfo,
  ListRequestsOptions,
  ListRequestsResult,
  SnagWebSocketLike,
  SnagWsServerMessage,
} from './types.js';

type RequestHandler = (request: CapturedRequest) => void;
type RawListRequestsResult = {
  data: CapturedRequestData[];
  meta: ListRequestsResult['meta'];
};

/**
 * Represents a single Snag endpoint and provides request operations.
 */
export class Endpoint {
  public readonly token: string;
  public readonly url: string;
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly websocketFactory: (url: string) => SnagWebSocketLike;

  public constructor(
    info: EndpointInfo,
    config: {
      baseUrl: string;
      wsUrl: string;
      fetchFn: typeof fetch;
      websocketFactory: (url: string) => SnagWebSocketLike;
    },
  ) {
    this.token = info.token;
    this.url = info.url;
    this.baseUrl = config.baseUrl;
    this.wsUrl = config.wsUrl;
    this.fetchFn = config.fetchFn;
    this.websocketFactory = config.websocketFactory;
  }

  /**
   * Lists requests for this endpoint.
   */
  public async listRequests(options: ListRequestsOptions = {}): Promise<ListRequestsResult> {
    const searchParams = new URLSearchParams();
    if (options.cursor) {
      searchParams.set('cursor', options.cursor);
    }
    if (options.limit !== undefined) {
      searchParams.set('limit', String(options.limit));
    }
    if (options.method) {
      searchParams.set('method', options.method);
    }
    if (options.search) {
      searchParams.set('search', options.search);
    }

    const path = `${this.baseUrl}/api/endpoints/${encodeURIComponent(this.token)}/requests`;
    const url = searchParams.size > 0 ? `${path}?${searchParams.toString()}` : path;

    const result = await requestJson<RawListRequestsResult>(this.fetchFn, url);
    return {
      data: result.data.map((item) => this.wrapCaptured(item)),
      meta: result.meta,
    };
  }

  /**
   * Deletes a captured request by ID.
   */
  public async delete(requestId?: string): Promise<void> {
    if (!requestId) {
      await requestNoContent(this.fetchFn, `${this.baseUrl}/api/endpoints/${encodeURIComponent(this.token)}`, {
        method: 'DELETE',
      });
      return;
    }

    await requestNoContent(this.fetchFn, `${this.baseUrl}/api/requests/${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Waits for the next request using long polling.
   * Returns null on timeout/no-content.
   */
  public async waitForRequest(options?: { timeout?: number }): Promise<CapturedRequest | null> {
    const timeout = options?.timeout;
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
      throw new SnagSdkError('waitForRequest timeout must be a positive number.');
    }

    if (timeout !== undefined) {
      return this.waitForRequestViaWebSocket(timeout);
    }

    const response = await this.fetchFn(`${this.baseUrl}/api/endpoints/${encodeURIComponent(this.token)}/wait`);
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      throw new SnagSdkError(`Wait request failed with status ${response.status}`);
    }

    const data = (await response.json()) as CapturedRequestData;
    return this.wrapCaptured(data);
  }

  /**
   * Subscribes to live request-captured events for this endpoint.
   * Returns an unsubscribe function.
   */
  public onRequest(handler: RequestHandler): () => void {
    const socket = this.websocketFactory(this.wsUrl);

    const onOpen = (): void => {
      socket.send(
        JSON.stringify({
          type: 'register',
          token: this.token,
          clientType: 'sdk',
        }),
      );
    };

    const onMessage = (event: { data: string | ArrayBuffer | ArrayBufferView }): void => {
      const asString = toMessageString(event.data);
      if (!asString) {
        return;
      }

      let message: SnagWsServerMessage;
      try {
        message = JSON.parse(asString) as SnagWsServerMessage;
      } catch {
        return;
      }

      if (message.type === 'request_captured') {
        handler(this.wrapCaptured(message.request));
      }
    };

    const onError = (): void => {
      socket.close();
    };

    socket.addEventListener('open', onOpen);
    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);

    return (): void => {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
      socket.close();
    };
  }

  private wrapCaptured(data: CapturedRequestData): CapturedRequest {
    return new CapturedRequest(this.baseUrl, this.fetchFn, data);
  }

  private waitForRequestViaWebSocket(timeout: number): Promise<CapturedRequest | null> {
    return new Promise((resolve) => {
      const socket = this.websocketFactory(this.wsUrl);
      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeout);

      const cleanup = (): void => {
        clearTimeout(timer);
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('message', onMessage);
        socket.removeEventListener('error', onError);
        socket.removeEventListener('close', onClose);
        socket.close();
      };

      const onOpen = (): void => {
        socket.send(JSON.stringify({ type: 'register', token: this.token, clientType: 'sdk' }));
      };

      const onMessage = (event: { data: string | ArrayBuffer | ArrayBufferView }): void => {
        const asString = toMessageString(event.data);
        if (!asString) {
          return;
        }
        let parsed: SnagWsServerMessage;
        try {
          parsed = JSON.parse(asString) as SnagWsServerMessage;
        } catch {
          return;
        }

        if (parsed.type === 'request_captured') {
          cleanup();
          resolve(this.wrapCaptured(parsed.request));
        }
      };

      const onError = (): void => {
        cleanup();
        resolve(null);
      };

      const onClose = (): void => {
        cleanup();
      };

      socket.addEventListener('open', onOpen);
      socket.addEventListener('message', onMessage);
      socket.addEventListener('error', onError);
      socket.addEventListener('close', onClose);
    });
  }
}

function toMessageString(data: string | ArrayBuffer | ArrayBufferView): string | null {
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  }
  return null;
}
