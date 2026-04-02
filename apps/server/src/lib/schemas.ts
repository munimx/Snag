import { z } from 'zod';

export const tokenParamsSchema = z.object({
  token: z.string().min(1).max(128),
});

export const requestIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createEndpointBodySchema = z.object({
  label: z.string().min(1).max(120).optional(),
  token: z.string().min(1).max(128).optional(),
});

export const listRequestsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  method: z.string().min(1).max(16).optional(),
  search: z.string().min(1).max(500).optional(),
});

export const replayBodySchema = z.object({
  targetUrl: z.string().url(),
});

export const ruleIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createRuleBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  filterMethod: z.string().min(1).max(16).optional(),
  filterBodyKey: z.string().min(1).max(120).optional(),
  filterBodyVal: z.string().min(1).max(2000).optional(),
  destinationUrl: z.string().url(),
  retries: z.coerce.number().int().min(0).max(10).optional(),
});

export const updateRuleBodySchema = z
  .object({
    name: z.string().min(1).max(120).nullable().optional(),
    enabled: z.boolean().optional(),
    filterMethod: z.string().min(1).max(16).nullable().optional(),
    filterBodyKey: z.string().min(1).max(120).nullable().optional(),
    filterBodyVal: z.string().min(1).max(2000).nullable().optional(),
    destinationUrl: z.string().url().optional(),
    retries: z.coerce.number().int().min(0).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const toggleRuleBodySchema = z.object({
  enabled: z.boolean(),
});

export const listDeliveriesQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const magicLinkBodySchema = z.object({
  email: z.string().email().max(320),
});

export const verifyMagicLinkQuerySchema = z.object({
  token: z.string().min(1).max(256),
  mode: z.enum(['web', 'token']).default('web'),
});

export const registerWsMessageSchema = z.object({
  type: z.literal('register'),
  token: z.string().min(1).max(128),
  clientType: z.enum(['browser', 'cli', 'sdk']),
});

export const pingWsMessageSchema = z.object({
  type: z.literal('ping'),
});

export const tunnelResponseWsMessageSchema = z.object({
  type: z.literal('tunnel_response'),
  requestId: z.string().min(1),
  status: z.number().int(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});

export const clientWsMessageSchema = z.union([
  registerWsMessageSchema,
  pingWsMessageSchema,
  tunnelResponseWsMessageSchema,
]);
