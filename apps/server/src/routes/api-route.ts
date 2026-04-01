import type { FastifyPluginAsync } from 'fastify';

import { getHistoryCutoff, getSessionFromRequest } from '../lib/auth.js';
import { db } from '../lib/db.js';
import {
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

    const existing = await db.capturedRequest.findUnique({
      where: { id: parsedParams.data.id },
      select: { id: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Request not found' });
    }

    await db.capturedRequest.delete({
      where: { id: parsedParams.data.id },
    });

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

      const startedAt = Date.now();
      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let responseHeaders: Record<string, string> | null = null;

      try {
        const replayResponse = await fetch(parsedBody.data.targetUrl, {
          method: row.method,
          headers: row.headers as Record<string, string>,
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
          responseHeaders: responseHeaders ?? undefined,
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
