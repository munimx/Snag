interface EndpointRecord {
  id: string;
  token: string;
  userId: string | null;
  expiresAt: Date | null;
}

interface CapturedRequestRecord {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  bodyType: string | null;
  status: number | null;
  latencyMs: number | null;
  receivedAt: Date;
  endpoint?: {
    userId: string | null;
  };
}

interface ReplayRecord {
  id: string;
  endpointId: string;
  capturedRequestId: string;
  targetUrl: string;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  latencyMs: number;
  createdAt: Date;
}

interface ForwardRuleRecord {
  id: string;
  endpointId: string;
  name: string | null;
  enabled: boolean;
  filterMethod: string | null;
  filterBodyKey: string | null;
  filterBodyVal: string | null;
  destinationUrl: string;
  retries: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DeliveryRecord {
  id: string;
  endpointId: string;
  ruleId: string;
  requestId: string;
  targetUrl: string;
  status: number | null;
  latencyMs: number | null;
  attempt: number;
  error: string | null;
  createdAt: Date;
}

interface UserRecord {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionRecord {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

interface MagicLinkRecord {
  id: string;
  token: string;
  email: string;
  userId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

type SelectShape<TRecord> = Record<keyof TRecord, boolean> | Partial<Record<keyof TRecord, boolean>> | undefined;

function pick<TRecord extends object>(
  record: TRecord,
  select: SelectShape<TRecord>,
): Partial<TRecord> {
  if (!select) {
    return record;
  }

  const output: Partial<TRecord> = {};
  for (const key of Object.keys(select) as Array<keyof TRecord>) {
    if (select[key]) {
      output[key] = record[key];
    }
  }
  return output;
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createMockDb() {
  const endpoints: EndpointRecord[] = [];
  const requests: CapturedRequestRecord[] = [];
  const replays: ReplayRecord[] = [];
  const rules: ForwardRuleRecord[] = [];
  const deliveries: DeliveryRecord[] = [];
  const users: UserRecord[] = [];
  const sessions: SessionRecord[] = [];
  const magicLinks: MagicLinkRecord[] = [];

  const reset = (): void => {
    endpoints.splice(0, endpoints.length);
    requests.splice(0, requests.length);
    replays.splice(0, replays.length);
    rules.splice(0, rules.length);
    deliveries.splice(0, deliveries.length);
    users.splice(0, users.length);
    sessions.splice(0, sessions.length);
    magicLinks.splice(0, magicLinks.length);
  };

  return {
    endpoint: {
      upsert: async ({
        where,
        create,
        update: _update,
        select,
      }: {
        where: { token: string };
        update: Record<string, unknown>;
        create: { token: string };
        select?: { id?: boolean; token?: boolean };
      }) => {
        void _update;
        let endpoint = endpoints.find((row) => row.token === where.token);
        if (!endpoint) {
          endpoint = { id: createId('ep'), token: create.token, userId: null, expiresAt: null };
          endpoints.push(endpoint);
        }
        return pick(endpoint, select);
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { token?: string; id?: string };
        select?: { id?: boolean; token?: boolean; userId?: boolean };
      }) => {
        const endpoint = endpoints.find((row) => row.token === where.token || row.id === where.id);
        return endpoint ? pick(endpoint, select) : null;
      },
    },
    capturedRequest: {
      create: async ({
        data,
        select,
      }: {
        data: Omit<CapturedRequestRecord, 'id' | 'status' | 'latencyMs' | 'receivedAt'>;
        select?: SelectShape<CapturedRequestRecord>;
      }) => {
        const record: CapturedRequestRecord = {
          id: createId('req'),
          ...data,
          status: null,
          latencyMs: null,
          receivedAt: new Date(),
        };
        requests.push(record);
        return pick(record, select);
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?:
          | SelectShape<CapturedRequestRecord>
          | {
              endpoint?: { select?: { userId?: boolean } };
            };
      }) => {
        const record = requests.find((row) => row.id === where.id);
        if (!record) {
          return null;
        }

        if (select && typeof select === 'object' && 'endpoint' in select && select.endpoint) {
          const endpointSelect = typeof select.endpoint === 'object' ? select.endpoint.select : undefined;
          const endpoint = endpoints.find((row) => row.id === record.endpointId);
          return {
            endpoint: endpoint
              ? {
                  ...(endpointSelect?.userId ? { userId: endpoint.userId } : {}),
                }
              : null,
          };
        }

        return pick(record, select as SelectShape<CapturedRequestRecord>);
      },
      findMany: async ({
        where,
        take,
        skip,
        cursor,
        select,
      }: {
        where: {
          endpointId: string;
          method?: string;
          receivedAt?: { gte: Date };
          OR?: Array<{ path?: { contains: string }; body?: { contains: string } }>;
        };
        orderBy: { receivedAt: 'desc' };
        take: number;
        skip: number;
        cursor?: { id: string };
        select?: SelectShape<CapturedRequestRecord>;
      }) => {
        let filtered = requests
          .filter((row) => row.endpointId === where.endpointId)
          .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

        if (where.method) {
          filtered = filtered.filter((row) => row.method === where.method);
        }
        if (where.receivedAt?.gte) {
          const cutoff = where.receivedAt.gte.getTime();
          filtered = filtered.filter((row) => row.receivedAt.getTime() >= cutoff);
        }
        if (where.OR && where.OR.length > 0) {
          const searchTerm = where.OR[0]?.path?.contains ?? where.OR[1]?.body?.contains ?? '';
          filtered = filtered.filter((row) => row.path.includes(searchTerm) || (row.body?.includes(searchTerm) ?? false));
        }

        if (cursor) {
          const index = filtered.findIndex((row) => row.id === cursor.id);
          if (index >= 0) {
            filtered = filtered.slice(index + skip);
          }
        } else if (skip > 0) {
          filtered = filtered.slice(skip);
        }

        return filtered.slice(0, take).map((row) => pick(row, select));
      },
      count: async ({
        where,
      }: {
        where: {
          endpointId: string;
          method?: string;
          receivedAt?: { gte: Date };
          OR?: Array<{ path?: { contains: string }; body?: { contains: string } }>;
        };
      }) => {
        return requests.filter((row) => {
          if (row.endpointId !== where.endpointId) {
            return false;
          }
          if (where.method && row.method !== where.method) {
            return false;
          }
          if (where.receivedAt?.gte && row.receivedAt.getTime() < where.receivedAt.gte.getTime()) {
            return false;
          }
          if (where.OR && where.OR.length > 0) {
            const searchTerm = where.OR[0]?.path?.contains ?? where.OR[1]?.body?.contains ?? '';
            return row.path.includes(searchTerm) || (row.body?.includes(searchTerm) ?? false);
          }
          return true;
        }).length;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = requests.findIndex((row) => row.id === where.id);
        if (index === -1) {
          return null;
        }
        const [deleted] = requests.splice(index, 1);
        return deleted;
      },
      deleteMany: async ({ where }: { where: { id: string } }) => {
        const before = requests.length;
        for (let index = requests.length - 1; index >= 0; index -= 1) {
          if (requests[index]?.id === where.id) {
            requests.splice(index, 1);
          }
        }
        return { count: before - requests.length };
      },
      updateMany: async ({ where, data }: { where: { id: string }; data: { status: number } }) => {
        const record = requests.find((row) => row.id === where.id);
        if (!record) {
          return { count: 0 };
        }
        record.status = data.status;
        return { count: 1 };
      },
    },
    replay: {
      create: async ({
        data,
        select,
      }: {
        data: Omit<ReplayRecord, 'id' | 'createdAt'>;
        select?: SelectShape<ReplayRecord>;
      }) => {
        const replay: ReplayRecord = {
          id: createId('rep'),
          ...data,
          createdAt: new Date(),
        };
        replays.push(replay);
        return pick(replay, select);
      },
    },
    forwardRule: {
      findMany: async ({
        where,
        select,
      }: {
        where: { endpointId?: string; enabled?: boolean };
        orderBy?: { createdAt: 'desc' };
        select?: SelectShape<ForwardRuleRecord>;
      }) => {
        let filtered = [...rules];
        if (where.endpointId) {
          filtered = filtered.filter((row) => row.endpointId === where.endpointId);
        }
        if (where.enabled !== undefined) {
          filtered = filtered.filter((row) => row.enabled === where.enabled);
        }
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return filtered.map((row) => pick(row, select));
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: SelectShape<ForwardRuleRecord>;
      }) => {
        const rule = rules.find((row) => row.id === where.id);
        return rule ? pick(rule, select) : null;
      },
      create: async ({
        data,
        select,
      }: {
        data: Omit<ForwardRuleRecord, 'id' | 'createdAt' | 'updatedAt'>;
        select?: SelectShape<ForwardRuleRecord>;
      }) => {
        const record: ForwardRuleRecord = {
          id: createId('rule'),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rules.push(record);
        return pick(record, select);
      },
      update: async ({
        where,
        data,
        select,
      }: {
        where: { id: string };
        data: Partial<Omit<ForwardRuleRecord, 'id' | 'createdAt' | 'endpointId'>>;
        select?: SelectShape<ForwardRuleRecord>;
      }) => {
        const record = rules.find((row) => row.id === where.id);
        if (!record) {
          return null;
        }
        Object.assign(record, data, { updatedAt: new Date() });
        return pick(record, select);
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = rules.findIndex((row) => row.id === where.id);
        if (index === -1) {
          return null;
        }
        const [deleted] = rules.splice(index, 1);
        return deleted;
      },
    },
    delivery: {
      count: async ({ where }: { where: { ruleId: string } }) => {
        return deliveries.filter((row) => row.ruleId === where.ruleId).length;
      },
      findMany: async ({
        where,
        take,
        skip,
        cursor,
        select,
      }: {
        where: { ruleId: string };
        orderBy: { createdAt: 'desc' };
        take: number;
        skip: number;
        cursor?: { id: string };
        select?: SelectShape<DeliveryRecord>;
      }) => {
        let filtered = deliveries
          .filter((row) => row.ruleId === where.ruleId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (cursor) {
          const index = filtered.findIndex((row) => row.id === cursor.id);
          if (index >= 0) {
            filtered = filtered.slice(index + skip);
          }
        } else if (skip > 0) {
          filtered = filtered.slice(skip);
        }
        return filtered.slice(0, take).map((row) => pick(row, select));
      },
      create: async ({
        data,
      }: {
        data: Omit<DeliveryRecord, 'id' | 'createdAt'>;
      }) => {
        const record: DeliveryRecord = {
          id: createId('del'),
          ...data,
          createdAt: new Date(),
        };
        deliveries.push(record);
        return record;
      },
    },
    user: {
      upsert: async ({
        where,
        create,
        select,
      }: {
        where: { email: string };
        create: { email: string };
        update: Record<string, unknown>;
        select?: SelectShape<UserRecord>;
      }) => {
        let record = users.find((row) => row.email === where.email);
        if (!record) {
          record = {
            id: createId('usr'),
            email: create.email,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.push(record);
        }
        return pick(record, select);
      },
      findUnique: async ({ where, select }: { where: { id?: string; email?: string }; select?: SelectShape<UserRecord> }) => {
        const record = users.find((row) => row.id === where.id || row.email === where.email);
        return record ? pick(record, select) : null;
      },
    },
    magicLink: {
      create: async ({
        data,
      }: {
        data: Omit<MagicLinkRecord, 'id' | 'createdAt' | 'consumedAt'>;
      }) => {
        const record: MagicLinkRecord = {
          id: createId('ml'),
          token: data.token,
          email: data.email,
          userId: data.userId,
          expiresAt: data.expiresAt,
          consumedAt: null,
          createdAt: new Date(),
        };
        magicLinks.push(record);
        return record;
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { token?: string; id?: string };
        select?: SelectShape<MagicLinkRecord>;
      }) => {
        const record = magicLinks.find((row) => row.token === where.token || row.id === where.id);
        return record ? pick(record, select) : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { consumedAt?: Date; userId?: string };
      }) => {
        const record = magicLinks.find((row) => row.id === where.id);
        if (!record) {
          return null;
        }
        if (data.consumedAt !== undefined) {
          record.consumedAt = data.consumedAt;
        }
        if (data.userId !== undefined) {
          record.userId = data.userId;
        }
        return record;
      },
    },
    session: {
      create: async ({
        data,
      }: {
        data: Omit<SessionRecord, 'id' | 'createdAt'>;
      }) => {
        const record: SessionRecord = {
          id: createId('sess'),
          token: data.token,
          userId: data.userId,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        };
        sessions.push(record);
        return record;
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { token: string };
        select?: {
          expiresAt?: boolean;
          user?: { select?: { id?: boolean; email?: boolean } };
        };
      }) => {
        const session = sessions.find((row) => row.token === where.token);
        if (!session) {
          return null;
        }
        const user = users.find((row) => row.id === session.userId);
        if (!select) {
          return { ...session, user };
        }
        return {
          ...(select.expiresAt ? { expiresAt: session.expiresAt } : {}),
          ...(select.user && user
            ? {
                user: pick(user, select.user.select),
              }
            : {}),
        };
      },
      deleteMany: async ({ where }: { where: { token: string } }) => {
        const before = sessions.length;
        for (let index = sessions.length - 1; index >= 0; index -= 1) {
          if (sessions[index]?.token === where.token) {
            sessions.splice(index, 1);
          }
        }
        return { count: before - sessions.length };
      },
    },
    $transaction: async <T>(operations: Array<Promise<T>>) => {
      return Promise.all(operations);
    },
    $disconnect: async () => undefined,
    __reset: reset,
  };
}
