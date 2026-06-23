import type { FastifyPluginAsync } from 'fastify';

import { addHours, createToken, getHistoryCutoff, getSessionFromRequest } from '../lib/auth.js';
import { db } from '../lib/db.js';
import {
  createEndpointBodySchema,
  createRuleBodySchema,
  listRequestsQuerySchema,
  listDeliveriesQuerySchema,
  replayBodySchema,
  requestIdParamsSchema,
  ruleIdParamsSchema,
  tokenParamsSchema,
  toggleRuleBodySchema,
  updateRuleBodySchema,
} from '../lib/schemas.js';
import { toCapturedRequest, toDelivery, toForwardRule } from '../lib/serializers.js';
import { wsHub } from '../ws/hub.js';

const apiRoute: FastifyPluginAsync = async (fastify) => {
  const protectedHeaders = new Set(['authorization', 'cookie', 'set-cookie', 'proxy-authorization']);

  interface EndpointResponseShape {
    id: string;
    token: string;
    label: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  function getPreferredHeaderValue(header: string | string[] | undefined): string | null {
    if (Array.isArray(header)) {
      return header[0]?.split(',')[0]?.trim() ?? null;
    }
    if (typeof header === 'string') {
      return header.split(',')[0]?.trim() ?? null;
    }
    return null;
  }

  function buildCaptureUrl(token: string, request: { protocol: string; headers: Record<string, unknown> }): string {
    if (fastify.config.PUBLIC_API_URL) {
      return `${fastify.config.PUBLIC_API_URL.replace(/\/$/, '')}/h/${token}`;
    }

    const forwardedProto = getPreferredHeaderValue(
      request.headers['x-forwarded-proto'] as string | string[] | undefined,
    );
    const forwardedHost = getPreferredHeaderValue(request.headers['x-forwarded-host'] as string | string[] | undefined);
    const host = forwardedHost ?? getPreferredHeaderValue(request.headers.host as string | string[] | undefined);
    const protocol = forwardedProto ?? request.protocol;
    if (!host) {
      return `/h/${token}`;
    }
    return `${protocol}://${host}/h/${token}`;
  }

  function toEndpointResponse(endpoint: EndpointResponseShape, request: { protocol: string; headers: Record<string, unknown> }) {
    return {
      ...endpoint,
      createdAt: endpoint.createdAt.toISOString(),
      updatedAt: endpoint.updatedAt.toISOString(),
      url: buildCaptureUrl(endpoint.token, request),
    };
  }

  function generateEndpointToken(): string {
    return createToken('ep').replace(/^ep_/, 'tok_');
  }

  fastify.get('/api/endpoints', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const endpoints = await db.endpoint.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        label: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send(endpoints.map((endpoint) => toEndpointResponse(endpoint, request)));
  });

  fastify.post('/api/endpoints', async (request, reply) => {
    const parsedBody = createEndpointBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedBody.error.flatten() });
    }

    const session = await getSessionFromRequest(request);
    const trimmedLabel = parsedBody.data.label?.trim();
    const requestedToken = parsedBody.data.token?.trim();
    const token = requestedToken && requestedToken.length > 0 ? requestedToken : generateEndpointToken();
    const now = new Date();

    const existingEndpoint = await db.endpoint.findUnique({
      where: { token },
      select: { id: true },
    });

    if (existingEndpoint) {
      return reply.status(409).send({ error: 'Endpoint token already exists' });
    }

    const createdEndpoint = await db.endpoint.create({
      data: {
        token,
        label: trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : null,
        userId: session?.userId ?? null,
        expiresAt: session ? null : addHours(now, 24),
      },
      select: {
        id: true,
        token: true,
        label: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(201).send({
      ...toEndpointResponse(createdEndpoint, request),
    });
  });

  fastify.delete<{ Params: { token: string } }>('/api/endpoints/:token', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const endpoint = await db.endpoint.findUnique({
      where: { token: parsedParams.data.token },
      select: { id: true, userId: true },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Endpoint not found' });
    }

    if (endpoint.userId) {
      const session = await getSessionFromRequest(request);
      if (!session || session.userId !== endpoint.userId) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }
    }

    await db.endpoint.delete({
      where: { id: endpoint.id },
    });
    return reply.status(204).send();
  });

  function sanitizeReplayHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (protectedHeaders.has(key.toLowerCase())) {
        continue;
      }
      sanitized[key] = value;
    }
    return sanitized;
  }

  async function hasRequestAccess(requestId: string, userId: string | null): Promise<boolean> {
    const target = await db.capturedRequest.findUnique({
      where: { id: requestId },
      select: {
        endpoint: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!target) {
      return false;
    }

    const ownerUserId = target.endpoint?.userId ?? null;
    if (ownerUserId === null) {
      return true;
    }

    return userId !== null && ownerUserId === userId;
  }

  fastify.get<{
    Params: { token: string };
    Querystring: { cursor?: string; limit?: number; method?: string; search?: string };
  }>('/api/endpoints/:token/requests', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const parsedQuery = listRequestsQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedQuery.error.flatten() });
    }

    const endpoint = await db.endpoint.findUnique({
      where: { token: parsedParams.data.token },
      select: { id: true },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Endpoint not found' });
    }

    const filter = parsedQuery.data;
    const session = await getSessionFromRequest(request);
    const historyCutoff = getHistoryCutoff();
    const whereClause = {
      endpointId: endpoint.id,
      ...(session ? {} : { receivedAt: { gte: historyCutoff } }),
      ...(filter.method ? { method: filter.method.toUpperCase() } : {}),
      ...(filter.search
        ? {
            OR: [{ path: { contains: filter.search, mode: 'insensitive' as const } }, { body: { contains: filter.search } }],
          }
        : {}),
    };

    const total = await db.capturedRequest.count({ where: whereClause });

    const rows = await db.capturedRequest.findMany({
      where: whereClause,
      orderBy: { receivedAt: 'desc' },
      take: filter.limit,
      skip: filter.cursor ? 1 : 0,
      cursor: filter.cursor ? { id: filter.cursor } : undefined,
      select: {
        id: true,
        endpointId: true,
        method: true,
        path: true,
        query: true,
        headers: true,
        body: true,
        bodyType: true,
        status: true,
        latencyMs: true,
        receivedAt: true,
      },
    });

    const hasMore = rows.length === filter.limit;
    const nextCursor = hasMore ? (rows.at(-1)?.id ?? null) : null;

    return reply.status(200).send({
      data: rows.map((row) => toCapturedRequest(row)),
      meta: {
        total,
        limit: filter.limit,
        nextCursor,
        hasMore,
      },
    });
  });

  fastify.get<{ Params: { id: string } }>('/api/requests/:id', async (request, reply) => {
    const parsedParams = requestIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const session = await getSessionFromRequest(request);
    const canAccess = await hasRequestAccess(parsedParams.data.id, session?.userId ?? null);
    if (!canAccess) {
      return reply.status(404).send({ error: 'Request not found' });
    }

    const row = await db.capturedRequest.findUnique({
      where: { id: parsedParams.data.id },
      select: {
        id: true,
        endpointId: true,
        method: true,
        path: true,
        query: true,
        headers: true,
        body: true,
        bodyType: true,
        status: true,
        latencyMs: true,
        receivedAt: true,
      },
    });

    if (!row) {
      return reply.status(404).send({ error: 'Request not found' });
    }

    return reply.status(200).send(toCapturedRequest(row));
  });

  fastify.delete<{ Params: { id: string } }>('/api/requests/:id', async (request, reply) => {
    const parsedParams = requestIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const session = await getSessionFromRequest(request);
    const canAccess = await hasRequestAccess(parsedParams.data.id, session?.userId ?? null);
    if (!canAccess) {
      return reply.status(404).send({ error: 'Request not found' });
    }

    const deleted = await db.capturedRequest.deleteMany({
      where: { id: parsedParams.data.id },
    });
    if (deleted.count === 0) {
      return reply.status(404).send({ error: 'Request not found' });
    }

    return reply.status(204).send();
  });

  fastify.post<{ Params: { id: string }; Body: { targetUrl: string } }>(
    '/api/requests/:id/replay',
    async (request, reply) => {
      const parsedParams = requestIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
      }

      const parsedBody = replayBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedBody.error.flatten() });
      }

      const row = await db.capturedRequest.findUnique({
        where: { id: parsedParams.data.id },
        select: {
          id: true,
          endpointId: true,
          method: true,
          path: true,
          query: true,
          headers: true,
          body: true,
        },
      });

      if (!row) {
        return reply.status(404).send({ error: 'Request not found' });
      }

      const session = await getSessionFromRequest(request);
      const canAccess = await hasRequestAccess(row.id, session?.userId ?? null);
      if (!canAccess) {
        return reply.status(404).send({ error: 'Request not found' });
      }

      const startedAt = Date.now();
      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let responseHeaders: Record<string, string> | null = null;

      try {
        const replayResponse = await fetch(parsedBody.data.targetUrl, {
          method: row.method,
          headers: sanitizeReplayHeaders(row.headers as Record<string, string>),
          body: row.body ?? undefined,
        });

        responseStatus = replayResponse.status;
        responseBody = await replayResponse.text();
        responseHeaders = Object.fromEntries(replayResponse.headers.entries());
      } catch (error: unknown) {
        request.log.error({ err: error, requestId: row.id }, 'replay failed');
      }

      const latencyMs = Date.now() - startedAt;

      const replay = await db.replay.create({
        data: {
          endpointId: row.endpointId,
          capturedRequestId: row.id,
          targetUrl: parsedBody.data.targetUrl,
          responseStatus,
          responseHeaders: responseHeaders ?? null,
          responseBody,
          latencyMs,
        },
        select: {
          id: true,
          targetUrl: true,
          responseStatus: true,
          latencyMs: true,
          createdAt: true,
        },
      });

      return reply.status(200).send({
        ...replay,
        createdAt: replay.createdAt.toISOString(),
      });
    },
  );

  fastify.get<{ Params: { token: string } }>('/api/endpoints/:token/wait', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const endpoint = await db.endpoint.findUnique({
      where: { token: parsedParams.data.token },
      select: { id: true },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Endpoint not found' });
    }

    const requestId = await wsHub.waitForNext(parsedParams.data.token, fastify.config.WAIT_TIMEOUT_MS);
    if (!requestId) {
      return reply.status(204).send();
    }

    const row = await db.capturedRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        endpointId: true,
        method: true,
        path: true,
        query: true,
        headers: true,
        body: true,
        bodyType: true,
        status: true,
        latencyMs: true,
        receivedAt: true,
      },
    });

    if (!row) {
      return reply.status(204).send();
    }

    return reply.status(200).send(toCapturedRequest(row));
  });

  fastify.get<{ Params: { token: string } }>('/api/endpoints/:token/rules', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const endpoint = await db.endpoint.findUnique({
      where: { token: parsedParams.data.token },
      select: { id: true },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Endpoint not found' });
    }

    const rows = await db.forwardRule.findMany({
      where: { endpointId: endpoint.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        endpointId: true,
        name: true,
        enabled: true,
        filterMethod: true,
        filterBodyKey: true,
        filterBodyVal: true,
        destinationUrl: true,
        retries: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send(rows.map((row) => toForwardRule(row)));
  });

  fastify.post<{ Params: { token: string } }>('/api/endpoints/:token/rules', async (request, reply) => {
    const parsedParams = tokenParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const parsedBody = createRuleBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedBody.error.flatten() });
    }

    const endpoint = await db.endpoint.findUnique({
      where: { token: parsedParams.data.token },
      select: { id: true },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Endpoint not found' });
    }

    const created = await db.forwardRule.create({
      data: {
        endpointId: endpoint.id,
        name: parsedBody.data.name ?? null,
        enabled: parsedBody.data.enabled ?? true,
        filterMethod: parsedBody.data.filterMethod?.toUpperCase() ?? null,
        filterBodyKey: parsedBody.data.filterBodyKey ?? null,
        filterBodyVal: parsedBody.data.filterBodyVal ?? null,
        destinationUrl: parsedBody.data.destinationUrl,
        retries: parsedBody.data.retries ?? 3,
      },
      select: {
        id: true,
        endpointId: true,
        name: true,
        enabled: true,
        filterMethod: true,
        filterBodyKey: true,
        filterBodyVal: true,
        destinationUrl: true,
        retries: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(201).send(toForwardRule(created));
  });

  fastify.patch<{ Params: { token: string; id: string } }>(
    '/api/endpoints/:token/rules/:id',
    async (request, reply) => {
      const parsedToken = tokenParamsSchema.safeParse(request.params);
      const parsedParams = ruleIdParamsSchema.safeParse(request.params);
      if (!parsedToken.success || !parsedParams.success) {
        return reply.status(422).send({ error: 'Validation failed' });
      }

      const parsedBody = updateRuleBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedBody.error.flatten() });
      }

      const endpoint = await db.endpoint.findUnique({
        where: { token: parsedToken.data.token },
        select: { id: true },
      });
      if (!endpoint) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }

      const existing = await db.forwardRule.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true, endpointId: true },
      });

      if (!existing || existing.endpointId !== endpoint.id) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      const updated = await db.forwardRule.update({
        where: { id: parsedParams.data.id },
        data: {
          ...(parsedBody.data.name !== undefined ? { name: parsedBody.data.name } : {}),
          ...(parsedBody.data.enabled !== undefined ? { enabled: parsedBody.data.enabled } : {}),
          ...(parsedBody.data.filterMethod !== undefined
            ? { filterMethod: parsedBody.data.filterMethod ? parsedBody.data.filterMethod.toUpperCase() : null }
            : {}),
          ...(parsedBody.data.filterBodyKey !== undefined ? { filterBodyKey: parsedBody.data.filterBodyKey } : {}),
          ...(parsedBody.data.filterBodyVal !== undefined ? { filterBodyVal: parsedBody.data.filterBodyVal } : {}),
          ...(parsedBody.data.destinationUrl !== undefined ? { destinationUrl: parsedBody.data.destinationUrl } : {}),
          ...(parsedBody.data.retries !== undefined ? { retries: parsedBody.data.retries } : {}),
        },
        select: {
          id: true,
          endpointId: true,
          name: true,
          enabled: true,
          filterMethod: true,
          filterBodyKey: true,
          filterBodyVal: true,
          destinationUrl: true,
          retries: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.status(200).send(toForwardRule(updated));
    },
  );

  fastify.patch<{ Params: { id: string }; Body: { enabled: boolean } }>('/api/rules/:id/toggle', async (request, reply) => {
    const parsedParams = ruleIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
    }

    const parsedBody = toggleRuleBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(422).send({ error: 'Validation failed', details: parsedBody.error.flatten() });
    }

    const existing = await db.forwardRule.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true },
    });
    if (!existing) {
      return reply.status(404).send({ error: 'Rule not found' });
    }

    const updated = await db.forwardRule.update({
      where: { id: parsedParams.data.id },
      data: { enabled: parsedBody.data.enabled },
      select: {
        id: true,
        endpointId: true,
        name: true,
        enabled: true,
        filterMethod: true,
        filterBodyKey: true,
        filterBodyVal: true,
        destinationUrl: true,
        retries: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send(toForwardRule(updated));
  });

  fastify.delete<{ Params: { token: string; id: string } }>('/api/endpoints/:token/rules/:id', async (request, reply) => {
    const parsedToken = tokenParamsSchema.safeParse(request.params);
    const parsedParams = ruleIdParamsSchema.safeParse(request.params);
    if (!parsedToken.success || !parsedParams.success) {
      return reply.status(422).send({ error: 'Validation failed' });
    }

    const endpoint = await db.endpoint.findUnique({
      where: { token: parsedToken.data.token },
      select: { id: true },
    });
    if (!endpoint) {
      return reply.status(404).send({ error: 'Endpoint not found' });
    }

    const existing = await db.forwardRule.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true, endpointId: true },
    });
    if (!existing || existing.endpointId !== endpoint.id) {
      return reply.status(404).send({ error: 'Rule not found' });
    }

    await db.forwardRule.delete({ where: { id: parsedParams.data.id } });
    return reply.status(204).send();
  });

  fastify.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: number } }>(
    '/api/rules/:id/deliveries',
    async (request, reply) => {
      const parsedParams = ruleIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedParams.error.flatten() });
      }

      const parsedQuery = listDeliveriesQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedQuery.error.flatten() });
      }

      const existingRule = await db.forwardRule.findUnique({
        where: { id: parsedParams.data.id },
        select: { id: true },
      });
      if (!existingRule) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      const whereClause = { ruleId: parsedParams.data.id };
      const total = await db.delivery.count({ where: whereClause });
      const rows = await db.delivery.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parsedQuery.data.limit,
        skip: parsedQuery.data.cursor ? 1 : 0,
        cursor: parsedQuery.data.cursor ? { id: parsedQuery.data.cursor } : undefined,
        select: {
          id: true,
          endpointId: true,
          ruleId: true,
          requestId: true,
          targetUrl: true,
          status: true,
          latencyMs: true,
          attempt: true,
          error: true,
          createdAt: true,
        },
      });

      const hasMore = rows.length === parsedQuery.data.limit;
      const nextCursor = hasMore ? (rows.at(-1)?.id ?? null) : null;

      return reply.status(200).send({
        data: rows.map((row) => toDelivery(row)),
        meta: {
          total,
          limit: parsedQuery.data.limit,
          nextCursor,
          hasMore,
        },
      });
    },
  );
};

export default apiRoute;
