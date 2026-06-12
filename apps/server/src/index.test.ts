import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from './test/mock-db.js';

const mockDb = createMockDb();

vi.mock('./lib/db.js', () => {
  return {
    db: mockDb,
  };
});

vi.mock('./workers/delivery-worker.js', () => {
  return {
    createDeliveryWorker: () => ({
      enqueueCapture: async () => undefined,
      stop: async () => undefined,
    }),
  };
});

describe('server core', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockDb.__reset();
  });

  it('returns health response', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });

  it('captures request and lists request history', async () => {
    const { buildApp } = await import('./index.js');
    const { wsHub } = await import('./ws/hub.js');
    const forwardSpy = vi.spyOn(wsHub, 'forwardToCli');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const captureResponse = await app.inject({
      method: 'POST',
      url: '/h/token-123?source=test',
      headers: { 'content-type': 'application/json' },
      payload: { hello: 'world' },
    });

    expect(captureResponse.statusCode).toBe(200);
    const capturePayload = captureResponse.json<{ ok: boolean; requestId: string }>();
    expect(capturePayload.ok).toBe(true);
    expect(forwardSpy).toHaveBeenCalledWith(
      'token-123',
      expect.objectContaining({
        type: 'tunnel_forward',
        requestId: capturePayload.requestId,
        method: 'POST',
        path: '/h/token-123',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
        body: '{"hello":"world"}',
      }),
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/endpoints/token-123/requests?limit=10',
    });

    expect(listResponse.statusCode).toBe(200);
    const listPayload = listResponse.json<{
      data: Array<{ id: string; method: string; path: string }>;
      meta: { total: number; limit: number; nextCursor: string | null; hasMore: boolean };
    }>();
    expect(listPayload.meta.total).toBe(1);
    expect(listPayload.data[0]?.id).toBe(capturePayload.requestId);
    expect(listPayload.data[0]?.method).toBe('POST');

    await app.close();
  });

  it('creates endpoint via API and supports delete by token', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const createEndpointResponse = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        token: 'api-endpoint-token',
        label: 'API test endpoint',
      },
    });
    expect(createEndpointResponse.statusCode).toBe(201);
    const createdEndpoint = createEndpointResponse.json<{
      token: string;
      label: string | null;
      url: string;
    }>();
    expect(createdEndpoint.token).toBe('api-endpoint-token');
    expect(createdEndpoint.label).toBe('API test endpoint');
    expect(createdEndpoint.url.endsWith('/h/api-endpoint-token')).toBe(true);

    const duplicateCreateResponse = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        token: 'api-endpoint-token',
      },
    });
    expect(duplicateCreateResponse.statusCode).toBe(409);

    const deleteEndpointResponse = await app.inject({
      method: 'DELETE',
      url: '/api/endpoints/api-endpoint-token',
    });
    expect(deleteEndpointResponse.statusCode).toBe(204);

    const requestsAfterDeleteResponse = await app.inject({
      method: 'GET',
      url: '/api/endpoints/api-endpoint-token/requests?limit=10',
    });
    expect(requestsAfterDeleteResponse.statusCode).toBe(404);

    await app.close();
  });

  it('returns request detail and supports deletion', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const captureResponse = await app.inject({
      method: 'GET',
      url: '/h/token-abc',
    });
    const requestId = captureResponse.json<{ requestId: string }>().requestId;

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/requests/${requestId}`,
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json<{ id: string }>().id).toBe(requestId);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/requests/${requestId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const afterDeleteResponse = await app.inject({
      method: 'GET',
      url: `/api/requests/${requestId}`,
    });
    expect(afterDeleteResponse.statusCode).toBe(404);

    await app.close();
  });

  it('supports rules CRUD and delivery logs listing', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    await app.inject({
      method: 'POST',
      url: '/h/rules-token',
    });

    const createRuleResponse = await app.inject({
      method: 'POST',
      url: '/api/endpoints/rules-token/rules',
      payload: {
        name: 'Send order events',
        filterMethod: 'POST',
        filterBodyKey: 'type',
        filterBodyVal: 'order.created',
        destinationUrl: 'https://example.com/webhook',
        retries: 3,
      },
    });
    expect(createRuleResponse.statusCode).toBe(201);
    const createdRule = createRuleResponse.json<{ id: string; destinationUrl: string }>();
    expect(createdRule.destinationUrl).toBe('https://example.com/webhook');

    const listRulesResponse = await app.inject({
      method: 'GET',
      url: '/api/endpoints/rules-token/rules',
    });
    expect(listRulesResponse.statusCode).toBe(200);
    expect(listRulesResponse.json<Array<{ id: string }>>()[0]?.id).toBe(createdRule.id);

    const updateRuleResponse = await app.inject({
      method: 'PATCH',
      url: `/api/endpoints/rules-token/rules/${createdRule.id}`,
      payload: {
        enabled: false,
      },
    });
    expect(updateRuleResponse.statusCode).toBe(200);
    expect(updateRuleResponse.json<{ enabled: boolean }>().enabled).toBe(false);

    const toggleRuleResponse = await app.inject({
      method: 'PATCH',
      url: `/api/rules/${createdRule.id}/toggle`,
      payload: {
        enabled: true,
      },
    });
    expect(toggleRuleResponse.statusCode).toBe(200);
    expect(toggleRuleResponse.json<{ enabled: boolean }>().enabled).toBe(true);

    const deliveriesResponse = await app.inject({
      method: 'GET',
      url: `/api/rules/${createdRule.id}/deliveries?limit=10`,
    });
    expect(deliveriesResponse.statusCode).toBe(200);
    expect(deliveriesResponse.json<{ meta: { total: number } }>().meta.total).toBe(0);

    const deleteRuleResponse = await app.inject({
      method: 'DELETE',
      url: `/api/endpoints/rules-token/rules/${createdRule.id}`,
    });
    expect(deleteRuleResponse.statusCode).toBe(204);

    await app.close();
  });

  it('supports auth magic-link, verify, me and logout', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const magicLinkResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'test@example.com' },
    });
    expect(magicLinkResponse.statusCode).toBe(200);
    const magicLinkPayload = magicLinkResponse.json<{ magicLinkUrl: string }>();
    expect(magicLinkPayload.magicLinkUrl.includes('/api/auth/verify?token=')).toBe(true);

    const verifyUrl = new URL(magicLinkPayload.magicLinkUrl);
    const verifyToken = verifyUrl.searchParams.get('token');
    expect(verifyToken).toBeTruthy();

    const verifyResponse = await app.inject({
      method: 'GET',
      url: `/api/auth/verify?token=${verifyToken}&mode=web`,
    });
    expect(verifyResponse.statusCode).toBe(302);

    const cookieHeader = verifyResponse.headers['set-cookie'];
    expect(cookieHeader).toContain('snag_session=');

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader ?? '',
      },
    });
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json<{ user: { email: string } }>().user.email).toBe('test@example.com');

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        cookie: Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader ?? '',
      },
    });
    expect(logoutResponse.statusCode).toBe(200);

    await app.close();
  });

  it('lists endpoints for authenticated user only', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const unauthorizedListResponse = await app.inject({
      method: 'GET',
      url: '/api/endpoints',
    });
    expect(unauthorizedListResponse.statusCode).toBe(401);

    const magicLinkResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'endpoint-owner@example.com' },
    });
    expect(magicLinkResponse.statusCode).toBe(200);

    const magicLinkPayload = magicLinkResponse.json<{ magicLinkUrl: string }>();
    const verifyToken = new URL(magicLinkPayload.magicLinkUrl).searchParams.get('token');
    expect(verifyToken).toBeTruthy();

    const verifyResponse = await app.inject({
      method: 'GET',
      url: `/api/auth/verify?token=${verifyToken ?? ''}&mode=token`,
    });
    expect(verifyResponse.statusCode).toBe(200);
    const sessionToken = verifyResponse.json<{ token: string }>().token;
    expect(sessionToken.startsWith('sess_')).toBe(true);

    const authCreateResponse = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        token: 'owned-endpoint-token',
        label: 'Owned endpoint',
      },
    });
    expect(authCreateResponse.statusCode).toBe(201);

    const guestCreateResponse = await app.inject({
      method: 'POST',
      url: '/api/endpoints',
      payload: {
        token: 'guest-endpoint-token',
      },
    });
    expect(guestCreateResponse.statusCode).toBe(201);

    const authorizedListResponse = await app.inject({
      method: 'GET',
      url: '/api/endpoints',
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });
    expect(authorizedListResponse.statusCode).toBe(200);
    const listedEndpoints = authorizedListResponse.json<Array<{ token: string }>>();
    expect(listedEndpoints.length).toBe(1);
    expect(listedEndpoints[0]?.token).toBe('owned-endpoint-token');

    await app.close();
  });

  it('returns 413 when request body exceeds configured body limit', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 64,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const payload = 'x'.repeat(128);
    const response = await app.inject({
      method: 'POST',
      url: '/h/body-limit-token',
      headers: { 'content-type': 'text/plain' },
      payload,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json<{ error: string }>().error.toLowerCase()).toContain('payload');

    await app.close();
  });

  it('rate limits capture endpoint per token', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 2,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const first = await app.inject({ method: 'POST', url: '/h/rl-token', payload: { first: true } });
    const second = await app.inject({ method: 'POST', url: '/h/rl-token', payload: { second: true } });
    const third = await app.inject({ method: 'POST', url: '/h/rl-token', payload: { third: true } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.json<{ error: string }>().error).toBe('Rate limit exceeded');

    await app.close();
  });

  it('responds to auth preflight with CORS headers for configured origin', async () => {
    const { buildApp } = await import('./index.js');
    const app = await buildApp({
      DATABASE_URL: 'postgres://localhost:5432/snag',
      HOST: '127.0.0.1',
      PORT: 8080,
      NODE_ENV: 'test',
      CORS_ORIGINS: 'https://snag-web-five.vercel.app',
      BODY_LIMIT_BYTES: 1024 * 1024,
      RATE_LIMIT_MAX_PER_MINUTE: 100,
      WAIT_TIMEOUT_MS: 50,
      REDIS_URL: 'redis://127.0.0.1:6379',
      DELIVERY_QUEUE_NAME: 'delivery-forwarding',
      ENABLE_DELIVERY_WORKER: false,
      MAGIC_LINK_TTL_MINUTES: 15,
      SESSION_TTL_HOURS: 24 * 30,
      APP_URL: 'http://localhost:3000',
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/auth/me',
      headers: {
        origin: 'https://snag-web-five.vercel.app',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://snag-web-five.vercel.app');
    expect(response.headers['access-control-allow-credentials']).toBe('true');

    await app.close();
  });
});
