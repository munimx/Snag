import type { ClientMessage, ServerMessage } from '@snag/shared/ws-messages';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { createConnection } from 'node:net';
import WebSocket from 'ws';

interface LocalTarget {
  host: string;
  port: number;
}

type RequestListener = (message: Extract<ServerMessage, { type: 'request_captured' }>) => void;

export class TunnelClient {
  private readonly ws: WebSocket;
  private readonly localTarget: LocalTarget;
  private readonly listeners = new Set<RequestListener>();

  public constructor(wsUrl: string, token: string, localPort: number) {
    this.localTarget = { host: '127.0.0.1', port: localPort };
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.send({ type: 'register', token, clientType: 'cli' });
    });

    this.ws.on('message', (raw) => {
      let payload: unknown;
      try {
        payload = JSON.parse(raw.toString()) as unknown;
      } catch {
        return;
      }

      const message = payload as ServerMessage;
      if (message.type === 'request_captured') {
        for (const listener of this.listeners) {
          listener(message);
        }
        return;
      }

      if (message.type === 'tunnel_forward') {
        void this.forwardRequest(message);
        return;
      }

      if (message.type === 'pong') {
        return;
      }
    });

    this.ws.on('ping', () => {
      this.ws.pong();
    });
  }

  public onCaptured(listener: RequestListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public startHeartbeat(intervalMs = 25_000): NodeJS.Timeout {
    return setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, intervalMs);
  }

  public close(): void {
    this.ws.close();
  }

  private send(message: ClientMessage): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  private async forwardRequest(message: Extract<ServerMessage, { type: 'tunnel_forward' }>): Promise<void> {
    await new Promise<void>((resolve) => {
      const req = httpRequest(
        {
          host: this.localTarget.host,
          port: this.localTarget.port,
          method: message.method,
          path: message.path,
          headers: createForwardHeaders(message.headers),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          res.on('end', () => {
            this.send({
              type: 'tunnel_response',
              requestId: message.requestId,
              status: res.statusCode ?? 502,
              headers: normalizeResponseHeaders(res.headers),
              body: Buffer.concat(chunks).toString('utf8'),
            });
            resolve();
          });
        },
      );

      req.on('error', () => {
        this.send({
          type: 'tunnel_response',
          requestId: message.requestId,
          status: 502,
          headers: { 'content-type': 'text/plain' },
          body: 'Failed to forward request to local target',
        });
        resolve();
      });

      if (message.body.length > 0) {
        req.write(message.body);
      }
      req.end();
    });
  }
}

function normalizeResponseHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
    } else if (typeof value === 'string') {
      normalized[key] = value;
    }
  }
  return normalized;
}

export async function ensureLocalPortReachable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timed out connecting to localhost:${port}`));
    }, 1_000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });

    socket.once('error', () => {
      clearTimeout(timeout);
      reject(new Error(`No service is listening on localhost:${port}`));
    });
  });
}

function createForwardHeaders(headers: Record<string, string>): Record<string, string> {
  const forwarded: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === 'host' ||
      normalizedKey === 'connection' ||
      normalizedKey === 'content-length' ||
      normalizedKey === 'transfer-encoding'
    ) {
      continue;
    }

    forwarded[key] = value;
  }

  return forwarded;
}
