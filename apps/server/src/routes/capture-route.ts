import type { FastifyPluginAsync } from 'fastify';

import { db } from '../lib/db.js';
import { normalizeBody, normalizeHeaders, normalizeQuery } from '../lib/normalize.js';
import { tokenParamsSchema } from '../lib/schemas.js';
import { toCapturedRequest } from '../lib/serializers.js';
import { wsHub } from '../ws/hub.js';

const captureRoute: FastifyPluginAsync = async (fastify) => {
  fastify.route<{ Params: { token: string } }>({
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    url: '/h/:token',
    config: {
      rateLimit: {
        max: fastify.config.RATE_LIMIT_MAX_PER_MINUTE,
        timeWindow: '1 minute',
        keyGenerator: (request) => {
          const parsed = tokenParamsSchema.safeParse(request.params);
          return parsed.success ? parsed.data.token : request.ip;
        },
      },
    },
    handler: async (request, reply) => {
      const parsedParams = tokenParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(422).send({
          error: 'Validation failed',
          details: parsedParams.error.flatten(),
        });
      }

      const { token } = parsedParams.data;
      const endpoint = await db.endpoint.upsert({
        where: { token },
        update: {},
        create: { token },
        select: { id: true, token: true },
      });

      const normalizedHeaders = normalizeHeaders(request.headers);
      const normalizedQuery = normalizeQuery(request.query);
      const normalizedBody = normalizeBody(request.body);
      const requestPath = request.url.split('?', 1)[0] ?? request.url;

      const createdRequest = await db.capturedRequest.create({
        data: {
          endpointId: endpoint.id,
          method: request.method,
          path: requestPath,
          query: normalizedQuery,
          headers: normalizedHeaders,
          body: normalizedBody.body,
          bodyType: normalizedBody.bodyType,
        },
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

      const serialized = toCapturedRequest(createdRequest);

      wsHub.broadcast(token, { type: 'request_captured', request: serialized });
      wsHub.notifyCaptured(token, serialized.id);
      try {
        await fastify.deliveryWorker.enqueueCapture({
          endpointId: endpoint.id,
          requestId: createdRequest.id,
        });
      } catch (error: unknown) {
        request.log.error({ err: error, requestId: createdRequest.id }, 'failed to enqueue delivery job');
      }

      request.log.info(
        { endpointId: endpoint.id, token, requestId: createdRequest.id, method: request.method },
        'request captured',
      );

      return reply.status(200).send({ ok: true, requestId: createdRequest.id });
    },
  });
};

export default captureRoute;
