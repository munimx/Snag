import fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import { fileURLToPath } from 'node:url';
import type { FastifyError } from 'fastify';

import { configSchema, loadConfig, type AppConfig } from './lib/config.js';
import { db } from './lib/db.js';
import apiRoute from './routes/api-route.js';
import authRoute from './routes/auth-route.js';
import captureRoute from './routes/capture-route.js';
import healthRoute from './routes/health-route.js';
import wsRoute from './routes/ws-route.js';
import { createDeliveryWorker } from './workers/delivery-worker.js';

export async function buildApp(configOverride?: Partial<AppConfig>): Promise<FastifyInstance> {
  const resolvedConfig = configOverride ? configSchema.parse(configOverride) : loadConfig();
  const configuredOrigins = resolvedConfig.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const originAllowlist = new Set(configuredOrigins);
  const allowAnyOrigin = originAllowlist.size === 0 || originAllowlist.has('*');

  const app = fastify({
    logger: true,
    bodyLimit: resolvedConfig.BODY_LIMIT_BYTES,
  });

  app.config = resolvedConfig;
  app.deliveryWorker = app.config.ENABLE_DELIVERY_WORKER
    ? createDeliveryWorker({
        redisUrl: app.config.REDIS_URL,
        queueName: app.config.DELIVERY_QUEUE_NAME,
        logger: {
          error: (context: object, message: string) => {
            app.log.error(context, message);
          },
        },
      })
    : {
        enqueueCapture: async () => undefined,
        stop: async () => undefined,
      };

  await app.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) => {
      return {
        error: 'Rate limit exceeded',
        message: `Too many requests. Retry in ${context.after}.`,
        statusCode: 429,
      };
    },
  });

  await app.register(fastifyCors, {
    strictPreflight: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    origin: (origin, callback) => {
      if (allowAnyOrigin) {
        callback(null, true);
        return;
      }
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, originAllowlist.has(origin));
    },
  });

  await app.register(fastifyWebsocket);
  await app.register(fastifyCookie);
  await app.register(healthRoute);
  await app.register(captureRoute);
  await app.register(authRoute);
  await app.register(apiRoute);
  await app.register(wsRoute);

  app.setErrorHandler((error, request, reply) => {
    const typedError = error as FastifyError;

    if (typedError.statusCode === 413) {
      return reply.status(413).send({
        error: 'Payload too large',
        message: `Request body exceeds ${app.config.BODY_LIMIT_BYTES} bytes.`,
      });
    }

    request.log.error({ err: error }, 'unhandled route error');
    return reply.status(typedError.statusCode ?? 500).send({
      error: typedError.statusCode && typedError.statusCode < 500 ? typedError.message : 'Internal server error',
    });
  });

  app.addHook('onClose', async () => {
    await app.deliveryWorker.stop();
    await db.$disconnect();
  });

  return app;
}

export async function start(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'received shutdown signal');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    await app.listen({
      port: app.config.PORT,
      host: app.config.HOST,
    });
  } catch (error: unknown) {
    app.log.error({ err: error }, 'failed to start server');
    process.exit(1);
  }
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  void start();
}
