import type { CapturedRequestData, ReplayResult } from './types.js';

import { requestJson } from './http.js';

/**
 * A single captured webhook request.
 */
export class CapturedRequest {
  public readonly data: CapturedRequestData;
  public readonly id: string;
  public readonly endpointId: string;
  public readonly method: string;
  public readonly path: string;
  public readonly query: Record<string, string>;
  public readonly headers: Record<string, string>;
  public readonly body: string | null;
  public readonly bodyType: string | null;
  public readonly status: number | null;
  public readonly latencyMs: number | null;
  public readonly receivedAt: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  public constructor(baseUrl: string, fetchFn: typeof fetch, data: CapturedRequestData) {
    this.baseUrl = baseUrl;
    this.fetchFn = fetchFn;
    this.data = data;
    this.id = data.id;
    this.endpointId = data.endpointId;
    this.method = data.method;
    this.path = data.path;
    this.query = data.query;
    this.headers = data.headers;
    this.body = data.body;
    this.bodyType = data.bodyType;
    this.status = data.status;
    this.latencyMs = data.latencyMs;
    this.receivedAt = data.receivedAt;
  }

  /**
   * Replays this captured request to a target URL.
   */
  public async replay(targetUrl: string): Promise<ReplayResult> {
    return requestJson<ReplayResult>(this.fetchFn, `${this.baseUrl}/api/requests/${this.data.id}/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetUrl }),
    });
  }

  /**
   * Generates a curl command equivalent to this request.
   */
  public toCurl(captureBaseUrl?: string): string {
    const host = captureBaseUrl ?? this.baseUrl;
    const query = new URLSearchParams(this.data.query).toString();
    const pathWithQuery = query.length > 0 ? `${this.data.path}?${query}` : this.data.path;
    const requestUrl = `${host}${pathWithQuery}`;

    const headerEntries = Object.entries(this.data.headers)
      .map(([key, value]) => `-H ${shellQuote(`${key}: ${value}`)}`)
      .join(' ');
    const bodyPart = this.data.body !== null ? ` --data-raw ${shellQuote(this.data.body)}` : '';

    return `curl -X ${this.data.method} ${shellQuote(requestUrl)}${headerEntries ? ` ${headerEntries}` : ''}${bodyPart}`;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
