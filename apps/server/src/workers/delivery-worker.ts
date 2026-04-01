import { Queue, Worker, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

import { db } from '../lib/db.js';

interface DeliveryJobData {
  endpointId: string;
  requestId: string;
}

interface MatchableRequest {
  method: string;
  body: string | null;
}

export interface DeliveryWorkerRuntime {
  enqueueCapture: (data: DeliveryJobData) => Promise<void>;
  stop: () => Promise<void>;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

export function extractBodyValue(body: string | null, key: string | null): string | null {
  if (!body || !key) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const value = (parsed as Record<string, unknown>)[key];
    if (value === undefined || value === null) {
      return null;
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return null;
  }
}

export function matchesRule(
  request: MatchableRequest,
  rule: {
    enabled: boolean;
    filterMethod: string | null;
    filterBodyKey: string | null;
    filterBodyVal: string | null;
  },
): boolean {
  if (!rule.enabled) {
    return false;
  }

  if (rule.filterMethod && request.method.toUpperCase() !== rule.filterMethod.toUpperCase()) {
    return false;
  }

  if (rule.filterBodyKey) {
    const bodyValue = extractBodyValue(request.body, rule.filterBodyKey);
    if (bodyValue === null) {
      return false;
    }

    if (rule.filterBodyVal !== null && bodyValue !== rule.filterBodyVal) {
      return false;
    }
  }

  return true;
}

async function deliverToTarget(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
): Promise<{ status: number | null; latencyMs: number | null; error: string | null }> {
  const startedAt = Date.now();
  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: body ?? undefined,
    });
    return {
      status: response.status,
      latencyMs: Date.now() - startedAt,
      error: null,
    };
  } catch (error: unknown) {
    return {
      status: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown delivery error',
    };
  }
}

export function createDeliveryWorker(config: {
  redisUrl: string;
  queueName: string;
  logger: { error: (context: object, message: string) => void };
}): DeliveryWorkerRuntime {
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const queue = new Queue<DeliveryJobData>(config.queueName, {
    connection: redis,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  const worker = new Worker<DeliveryJobData>(
    config.queueName,
    async (job) => {
      const requestRecord = await db.capturedRequest.findUnique({
        where: { id: job.data.requestId },
        select: {
          id: true,
          endpointId: true,
          method: true,
          headers: true,
          body: true,
        },
      });

      if (!requestRecord || requestRecord.endpointId !== job.data.endpointId) {
        return;
      }

      const rules = await db.forwardRule.findMany({
        where: { endpointId: job.data.endpointId, enabled: true },
        select: {
          id: true,
          endpointId: true,
          enabled: true,
          filterMethod: true,
          filterBodyKey: true,
          filterBodyVal: true,
          destinationUrl: true,
          retries: true,
        },
      });

      for (const rule of rules) {
        if (
          !matchesRule(
            {
              method: requestRecord.method,
              body: requestRecord.body,
            },
            rule,
          )
        ) {
          continue;
        }

        let attempt = 1;
        let delivered = false;
        while (attempt <= Math.max(1, rule.retries)) {
          const result = await deliverToTarget(
            rule.destinationUrl,
            requestRecord.method,
            (requestRecord.headers as Record<string, string>) ?? {},
            requestRecord.body,
          );

          await db.delivery.create({
            data: {
              endpointId: job.data.endpointId,
              ruleId: rule.id,
              requestId: requestRecord.id,
              targetUrl: rule.destinationUrl,
              status: result.status,
              latencyMs: result.latencyMs,
              attempt,
              error: result.error,
            },
          });

          if (!result.error && result.status !== null && result.status < 500) {
            delivered = true;
            break;
          }

          attempt += 1;
        }

        if (!delivered) {
          config.logger.error(
            { requestId: requestRecord.id, ruleId: rule.id, targetUrl: rule.destinationUrl },
            'delivery exhausted all retry attempts',
          );
        }
      }
    },
    {
      connection: redis,
    },
  );

  worker.on('error', (error: Error) => {
    config.logger.error({ err: error }, 'delivery worker encountered an error');
  });

  return {
    enqueueCapture: async (data: DeliveryJobData): Promise<void> => {
      await queue.add('request-captured', data);
    },
    stop: async (): Promise<void> => {
      await worker.close();
      await queue.close();
      await redis.quit();
    },
  };
}
