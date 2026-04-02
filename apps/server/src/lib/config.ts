import { z } from 'zod';

export const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default(''),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1024 * 1024),
  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().int().positive().default(100),
  WAIT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  DELIVERY_QUEUE_NAME: z.string().min(1).default('delivery-forwarding'),
  ENABLE_DELIVERY_WORKER: z.coerce.boolean().default(false),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 30),
  APP_URL: z.string().url().default('http://localhost:3000'),
});

export type AppConfig = Readonly<z.infer<typeof configSchema>>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
