import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import {
  Timestamp,
  getFirestore,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore';

interface EndpointRecord {
  id: string;
  token: string;
  label: string | null;
  userId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  } | null;
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

interface SessionWithUser extends SessionRecord {
  user: {
    id: string;
    email: string;
  };
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

interface ServiceAccountLike {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

type CapturedRequestWhere = {
  endpointId: string;
  method?: string;
  receivedAt?: { gte: Date };
  OR?: Array<{ path?: { contains?: string }; body?: { contains?: string } }>;
};

function createId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
}

function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function toNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toDate(value, new Date(0));
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') {
      output[key] = entry;
    }
  }
  return output;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readProjectIdFromFirebaserc(): string | undefined {
  const candidates = [
    resolve(process.cwd(), '.firebaserc'),
    resolve(process.cwd(), '../.firebaserc'),
    resolve(process.cwd(), '../../.firebaserc'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
        projects?: { default?: unknown };
      };
      if (typeof parsed.projects?.default === 'string' && parsed.projects.default.length > 0) {
        return parsed.projects.default;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    readProjectIdFromFirebaserc()
  );
}

function parseServiceAccount(raw: string): {
  projectId?: string;
  clientEmail: string;
  privateKey: string;
} {
  const parsed = JSON.parse(raw) as ServiceAccountLike;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Firebase service account JSON is missing client_email or private_key');
  }
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, '\n'),
  };
}

function getFirebaseApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = resolveProjectId();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

  if (emulatorHost) {
    return initializeApp({
      ...(projectId ? { projectId } : { projectId: 'snag-local' }),
    });
  }

  if (serviceAccountJson) {
    const account = parseServiceAccount(serviceAccountJson);
    return initializeApp({
      credential: cert({
        projectId: account.projectId,
        clientEmail: account.clientEmail,
        privateKey: account.privateKey,
      }),
      ...(projectId || account.projectId ? { projectId: projectId ?? account.projectId } : {}),
    });
  }

  if (serviceAccountPath) {
    const resolvedPath = resolve(serviceAccountPath);
    const account = parseServiceAccount(readFileSync(resolvedPath, 'utf8'));
    return initializeApp({
      credential: cert({
        projectId: account.projectId,
        clientEmail: account.clientEmail,
        privateKey: account.privateKey,
      }),
      ...(projectId || account.projectId ? { projectId: projectId ?? account.projectId } : {}),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
}

let firestoreClient: Firestore | null = null;

function getClient(): Firestore {
  if (firestoreClient) {
    return firestoreClient;
  }
  firestoreClient = getFirestore(getFirebaseApp());
  return firestoreClient;
}

function endpointFromDoc(id: string, data: DocumentData): EndpointRecord {
  return {
    id,
    token: typeof data.token === 'string' ? data.token : '',
    label: toNullableString(data.label),
    userId: toNullableString(data.userId),
    expiresAt: toNullableDate(data.expiresAt),
    createdAt: toDate(data.createdAt, new Date(0)),
    updatedAt: toDate(data.updatedAt, new Date(0)),
  };
}

function capturedRequestFromDoc(id: string, data: DocumentData): CapturedRequestRecord {
  return {
    id,
    endpointId: typeof data.endpointId === 'string' ? data.endpointId : '',
    method: typeof data.method === 'string' ? data.method : 'GET',
    path: typeof data.path === 'string' ? data.path : '/',
    query: toStringMap(data.query),
    headers: toStringMap(data.headers),
    body: toNullableString(data.body),
    bodyType: toNullableString(data.bodyType),
    status: toNullableNumber(data.status),
    latencyMs: toNullableNumber(data.latencyMs),
    receivedAt: toDate(data.receivedAt, new Date(0)),
  };
}

function forwardRuleFromDoc(id: string, data: DocumentData): ForwardRuleRecord {
  return {
    id,
    endpointId: typeof data.endpointId === 'string' ? data.endpointId : '',
    name: toNullableString(data.name),
    enabled: toBoolean(data.enabled, true),
    filterMethod: toNullableString(data.filterMethod),
    filterBodyKey: toNullableString(data.filterBodyKey),
    filterBodyVal: toNullableString(data.filterBodyVal),
    destinationUrl: typeof data.destinationUrl === 'string' ? data.destinationUrl : '',
    retries: typeof data.retries === 'number' ? data.retries : 3,
    createdAt: toDate(data.createdAt, new Date(0)),
    updatedAt: toDate(data.updatedAt, new Date(0)),
  };
}

function deliveryFromDoc(id: string, data: DocumentData): DeliveryRecord {
  return {
    id,
    endpointId: typeof data.endpointId === 'string' ? data.endpointId : '',
    ruleId: typeof data.ruleId === 'string' ? data.ruleId : '',
    requestId: typeof data.requestId === 'string' ? data.requestId : '',
    targetUrl: typeof data.targetUrl === 'string' ? data.targetUrl : '',
    status: toNullableNumber(data.status),
    latencyMs: toNullableNumber(data.latencyMs),
    attempt: typeof data.attempt === 'number' ? data.attempt : 1,
    error: toNullableString(data.error),
    createdAt: toDate(data.createdAt, new Date(0)),
  };
}

function userFromDoc(id: string, data: DocumentData): UserRecord {
  return {
    id,
    email: typeof data.email === 'string' ? data.email : '',
    createdAt: toDate(data.createdAt, new Date(0)),
    updatedAt: toDate(data.updatedAt, new Date(0)),
  };
}

function sessionFromDoc(id: string, data: DocumentData): SessionRecord {
  return {
    id,
    token: typeof data.token === 'string' ? data.token : '',
    userId: typeof data.userId === 'string' ? data.userId : '',
    expiresAt: toDate(data.expiresAt, new Date(0)),
    createdAt: toDate(data.createdAt, new Date(0)),
  };
}

function magicLinkFromDoc(id: string, data: DocumentData): MagicLinkRecord {
  return {
    id,
    token: typeof data.token === 'string' ? data.token : '',
    email: typeof data.email === 'string' ? data.email : '',
    userId: toNullableString(data.userId),
    expiresAt: toDate(data.expiresAt, new Date(0)),
    consumedAt: toNullableDate(data.consumedAt),
    createdAt: toDate(data.createdAt, new Date(0)),
  };
}

async function deleteCollectionByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<void> {
  const client = getClient();
  while (true) {
    const snapshot = await client
      .collection(collectionName)
      .where(field, '==', value)
      .limit(500)
      .get();
    if (snapshot.empty) {
      return;
    }

    const batch = client.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    if (snapshot.size < 500) {
      return;
    }
  }
}

function sortByDateDesc<T>(rows: T[], getter: (row: T) => Date): T[] {
  return [...rows].sort((left, right) => getter(right).getTime() - getter(left).getTime());
}

function applyCursor<T extends { id: string }>(
  rows: T[],
  cursor: { id: string } | undefined,
  skip: number,
  take: number,
): T[] {
  let current = [...rows];
  if (cursor) {
    const index = current.findIndex((row) => row.id === cursor.id);
    if (index >= 0) {
      current = current.slice(index + skip);
    }
  } else if (skip > 0) {
    current = current.slice(skip);
  }

  return current.slice(0, take);
}

function extractSearchTerm(where: CapturedRequestWhere): string | undefined {
  if (!where.OR || where.OR.length === 0) {
    return undefined;
  }
  return where.OR[0]?.path?.contains ?? where.OR[1]?.body?.contains;
}

async function findEndpointByToken(token: string): Promise<EndpointRecord | null> {
  const snapshot = await getClient()
    .collection('endpoints')
    .where('token', '==', token)
    .limit(1)
    .get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0]!;
  return endpointFromDoc(doc.id, doc.data());
}

async function findUserById(id: string): Promise<UserRecord | null> {
  const doc = await getClient().collection('users').doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return userFromDoc(doc.id, doc.data() ?? {});
}

function createFirestoreDb() {
  return {
    endpoint: {
      upsert: async ({
        where,
        create,
      }: {
        where: { token: string };
        update: Record<string, unknown>;
        create: { token: string };
        select?: unknown;
      }): Promise<EndpointRecord> => {
        const existing = await findEndpointByToken(where.token);
        if (existing) {
          return existing;
        }

        const now = new Date();
        const id = createId('ep');
        const record: EndpointRecord = {
          id,
          token: create.token,
          label: null,
          userId: null,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        };

        await getClient().collection('endpoints').doc(id).set(record);
        return record;
      },
      create: async ({
        data,
      }: {
        data: {
          token: string;
          label: string | null;
          userId: string | null;
          expiresAt: Date | null;
        };
        select?: unknown;
      }): Promise<EndpointRecord> => {
        const now = new Date();
        const id = createId('ep');
        const record: EndpointRecord = {
          id,
          token: data.token,
          label: data.label,
          userId: data.userId,
          expiresAt: data.expiresAt,
          createdAt: now,
          updatedAt: now,
        };

        await getClient().collection('endpoints').doc(id).set(record);
        return record;
      },
      findUnique: async ({
        where,
      }: {
        where: { token?: string; id?: string };
        select?: unknown;
      }): Promise<EndpointRecord | null> => {
        if (where.id) {
          const doc = await getClient().collection('endpoints').doc(where.id).get();
          if (!doc.exists) {
            return null;
          }
          return endpointFromDoc(doc.id, doc.data() ?? {});
        }
        if (where.token) {
          return findEndpointByToken(where.token);
        }
        return null;
      },
      findMany: async ({
        where,
      }: {
        where: { userId?: string | null };
        orderBy?: { createdAt: 'desc' };
        select?: unknown;
      }): Promise<EndpointRecord[]> => {
        const snapshot = await getClient().collection('endpoints').get();
        let rows = snapshot.docs.map((doc) => endpointFromDoc(doc.id, doc.data()));
        if (where.userId !== undefined) {
          rows = rows.filter((row) => row.userId === where.userId);
        }
        return sortByDateDesc(rows, (row) => row.createdAt);
      },
      delete: async ({ where }: { where: { id: string } }): Promise<EndpointRecord | null> => {
        const doc = await getClient().collection('endpoints').doc(where.id).get();
        if (!doc.exists) {
          return null;
        }

        const row = endpointFromDoc(doc.id, doc.data() ?? {});
        await doc.ref.delete();
        await Promise.all([
          deleteCollectionByField('capturedRequests', 'endpointId', where.id),
          deleteCollectionByField('replays', 'endpointId', where.id),
          deleteCollectionByField('forwardRules', 'endpointId', where.id),
          deleteCollectionByField('deliveries', 'endpointId', where.id),
        ]);
        return row;
      },
    },
    capturedRequest: {
      create: async ({
        data,
      }: {
        data: Omit<CapturedRequestRecord, 'id' | 'status' | 'latencyMs' | 'receivedAt' | 'endpoint'>;
        select?: unknown;
      }): Promise<CapturedRequestRecord> => {
        const id = createId('req');
        const record: CapturedRequestRecord = {
          id,
          endpointId: data.endpointId,
          method: data.method,
          path: data.path,
          query: data.query,
          headers: data.headers,
          body: data.body,
          bodyType: data.bodyType,
          status: null,
          latencyMs: null,
          receivedAt: new Date(),
        };

        await getClient().collection('capturedRequests').doc(id).set(record);
        return record;
      },
      findUnique: async ({
        where,
      }: {
        where: { id: string };
        select?: unknown;
      }): Promise<CapturedRequestRecord | null> => {
        const doc = await getClient().collection('capturedRequests').doc(where.id).get();
        if (!doc.exists) {
          return null;
        }

        const row = capturedRequestFromDoc(doc.id, doc.data() ?? {});
        const endpoint = await getClient().collection('endpoints').doc(row.endpointId).get();
        row.endpoint = endpoint.exists
          ? { userId: toNullableString((endpoint.data() ?? {}).userId) }
          : null;
        return row;
      },
      findMany: async ({
        where,
        take,
        skip,
        cursor,
      }: {
        where: CapturedRequestWhere;
        orderBy: { receivedAt: 'desc' };
        take: number;
        skip: number;
        cursor?: { id: string };
        select?: unknown;
      }): Promise<CapturedRequestRecord[]> => {
        const snapshot = await getClient()
          .collection('capturedRequests')
          .where('endpointId', '==', where.endpointId)
          .get();

        const searchTerm = extractSearchTerm(where);
        let rows = snapshot.docs
          .map((doc) => capturedRequestFromDoc(doc.id, doc.data()))
          .filter((row) => {
            if (where.method && row.method !== where.method) {
              return false;
            }
            if (where.receivedAt?.gte && row.receivedAt.getTime() < where.receivedAt.gte.getTime()) {
              return false;
            }
            if (searchTerm) {
              const pathMatch = row.path.toLowerCase().includes(searchTerm.toLowerCase());
              const bodyMatch = row.body?.includes(searchTerm) ?? false;
              return pathMatch || bodyMatch;
            }
            return true;
          });

        rows = sortByDateDesc(rows, (row) => row.receivedAt);
        return applyCursor(rows, cursor, skip, take);
      },
      count: async ({ where }: { where: CapturedRequestWhere }): Promise<number> => {
        const snapshot = await getClient()
          .collection('capturedRequests')
          .where('endpointId', '==', where.endpointId)
          .get();
        const searchTerm = extractSearchTerm(where);
        return snapshot.docs
          .map((doc) => capturedRequestFromDoc(doc.id, doc.data()))
          .filter((row) => {
            if (where.method && row.method !== where.method) {
              return false;
            }
            if (where.receivedAt?.gte && row.receivedAt.getTime() < where.receivedAt.gte.getTime()) {
              return false;
            }
            if (searchTerm) {
              const pathMatch = row.path.toLowerCase().includes(searchTerm.toLowerCase());
              const bodyMatch = row.body?.includes(searchTerm) ?? false;
              return pathMatch || bodyMatch;
            }
            return true;
          }).length;
      },
      deleteMany: async ({ where }: { where: { id: string } }): Promise<{ count: number }> => {
        const ref = getClient().collection('capturedRequests').doc(where.id);
        const doc = await ref.get();
        if (!doc.exists) {
          return { count: 0 };
        }
        await ref.delete();
        return { count: 1 };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: number };
      }): Promise<{ count: number }> => {
        const ref = getClient().collection('capturedRequests').doc(where.id);
        const doc = await ref.get();
        if (!doc.exists) {
          return { count: 0 };
        }
        await ref.update({ status: data.status });
        return { count: 1 };
      },
    },
    replay: {
      create: async ({
        data,
      }: {
        data: Omit<ReplayRecord, 'id' | 'createdAt'>;
        select?: unknown;
      }): Promise<ReplayRecord> => {
        const id = createId('rep');
        const record: ReplayRecord = {
          id,
          endpointId: data.endpointId,
          capturedRequestId: data.capturedRequestId,
          targetUrl: data.targetUrl,
          responseStatus: data.responseStatus,
          responseHeaders: data.responseHeaders,
          responseBody: data.responseBody,
          latencyMs: data.latencyMs,
          createdAt: new Date(),
        };
        await getClient().collection('replays').doc(id).set(record);
        return record;
      },
    },
    forwardRule: {
      findMany: async ({
        where,
      }: {
        where: { endpointId?: string; enabled?: boolean };
        orderBy?: { createdAt: 'desc' };
        select?: unknown;
      }): Promise<ForwardRuleRecord[]> => {
        const snapshot = where.endpointId
          ? await getClient().collection('forwardRules').where('endpointId', '==', where.endpointId).get()
          : await getClient().collection('forwardRules').get();

        let rows = snapshot.docs.map((doc) => forwardRuleFromDoc(doc.id, doc.data()));
        if (where.enabled !== undefined) {
          rows = rows.filter((row) => row.enabled === where.enabled);
        }
        return sortByDateDesc(rows, (row) => row.createdAt);
      },
      findUnique: async ({
        where,
      }: {
        where: { id: string };
        select?: unknown;
      }): Promise<ForwardRuleRecord | null> => {
        const doc = await getClient().collection('forwardRules').doc(where.id).get();
        if (!doc.exists) {
          return null;
        }
        return forwardRuleFromDoc(doc.id, doc.data() ?? {});
      },
      create: async ({
        data,
      }: {
        data: Omit<ForwardRuleRecord, 'id' | 'createdAt' | 'updatedAt'>;
        select?: unknown;
      }): Promise<ForwardRuleRecord> => {
        const now = new Date();
        const id = createId('rule');
        const record: ForwardRuleRecord = {
          id,
          endpointId: data.endpointId,
          name: data.name,
          enabled: data.enabled,
          filterMethod: data.filterMethod,
          filterBodyKey: data.filterBodyKey,
          filterBodyVal: data.filterBodyVal,
          destinationUrl: data.destinationUrl,
          retries: data.retries,
          createdAt: now,
          updatedAt: now,
        };

        await getClient().collection('forwardRules').doc(id).set(record);
        return record;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Omit<ForwardRuleRecord, 'id' | 'endpointId' | 'createdAt'>>;
        select?: unknown;
      }): Promise<ForwardRuleRecord> => {
        const ref = getClient().collection('forwardRules').doc(where.id);
        const doc = await ref.get();
        if (!doc.exists) {
          throw new Error(`Forward rule ${where.id} not found`);
        }
        const existing = forwardRuleFromDoc(doc.id, doc.data() ?? {});
        const updated: ForwardRuleRecord = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        await ref.set(updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }): Promise<ForwardRuleRecord | null> => {
        const ref = getClient().collection('forwardRules').doc(where.id);
        const doc = await ref.get();
        if (!doc.exists) {
          return null;
        }
        const existing = forwardRuleFromDoc(doc.id, doc.data() ?? {});
        await ref.delete();
        await deleteCollectionByField('deliveries', 'ruleId', where.id);
        return existing;
      },
    },
    delivery: {
      count: async ({ where }: { where: { ruleId: string } }): Promise<number> => {
        const snapshot = await getClient()
          .collection('deliveries')
          .where('ruleId', '==', where.ruleId)
          .get();
        return snapshot.size;
      },
      findMany: async ({
        where,
        take,
        skip,
        cursor,
      }: {
        where: { ruleId: string };
        orderBy: { createdAt: 'desc' };
        take: number;
        skip: number;
        cursor?: { id: string };
        select?: unknown;
      }): Promise<DeliveryRecord[]> => {
        const snapshot = await getClient()
          .collection('deliveries')
          .where('ruleId', '==', where.ruleId)
          .get();
        const rows = sortByDateDesc(
          snapshot.docs.map((doc) => deliveryFromDoc(doc.id, doc.data())),
          (row) => row.createdAt,
        );
        return applyCursor(rows, cursor, skip, take);
      },
      create: async ({
        data,
      }: {
        data: Omit<DeliveryRecord, 'id' | 'createdAt'>;
      }): Promise<DeliveryRecord> => {
        const id = createId('del');
        const record: DeliveryRecord = {
          id,
          endpointId: data.endpointId,
          ruleId: data.ruleId,
          requestId: data.requestId,
          targetUrl: data.targetUrl,
          status: data.status,
          latencyMs: data.latencyMs,
          attempt: data.attempt,
          error: data.error,
          createdAt: new Date(),
        };
        await getClient().collection('deliveries').doc(id).set(record);
        return record;
      },
    },
    user: {
      upsert: async ({
        where,
        create,
      }: {
        where: { email: string };
        create: { email: string };
        update: Record<string, unknown>;
        select?: unknown;
      }): Promise<UserRecord> => {
        const existingSnapshot = await getClient()
          .collection('users')
          .where('email', '==', where.email)
          .limit(1)
          .get();
        if (!existingSnapshot.empty) {
          const existing = existingSnapshot.docs[0]!;
          return userFromDoc(existing.id, existing.data());
        }

        const now = new Date();
        const id = createId('usr');
        const record: UserRecord = {
          id,
          email: create.email,
          createdAt: now,
          updatedAt: now,
        };
        await getClient().collection('users').doc(id).set(record);
        return record;
      },
      findUnique: async ({
        where,
      }: {
        where: { id?: string; email?: string };
        select?: unknown;
      }): Promise<UserRecord | null> => {
        if (where.id) {
          const doc = await getClient().collection('users').doc(where.id).get();
          if (!doc.exists) {
            return null;
          }
          return userFromDoc(doc.id, doc.data() ?? {});
        }
        if (where.email) {
          const snapshot = await getClient()
            .collection('users')
            .where('email', '==', where.email)
            .limit(1)
            .get();
          if (snapshot.empty) {
            return null;
          }
          const doc = snapshot.docs[0]!;
          return userFromDoc(doc.id, doc.data());
        }
        return null;
      },
    },
    magicLink: {
      create: async ({
        data,
      }: {
        data: Omit<MagicLinkRecord, 'id' | 'createdAt' | 'consumedAt'>;
      }): Promise<MagicLinkRecord> => {
        const id = createId('ml');
        const record: MagicLinkRecord = {
          id,
          token: data.token,
          email: data.email,
          userId: data.userId,
          expiresAt: data.expiresAt,
          consumedAt: null,
          createdAt: new Date(),
        };
        await getClient().collection('magicLinks').doc(id).set(record);
        return record;
      },
      findUnique: async ({
        where,
      }: {
        where: { token?: string; id?: string };
        select?: unknown;
      }): Promise<MagicLinkRecord | null> => {
        if (where.id) {
          const doc = await getClient().collection('magicLinks').doc(where.id).get();
          if (!doc.exists) {
            return null;
          }
          return magicLinkFromDoc(doc.id, doc.data() ?? {});
        }
        if (where.token) {
          const snapshot = await getClient()
            .collection('magicLinks')
            .where('token', '==', where.token)
            .limit(1)
            .get();
          if (snapshot.empty) {
            return null;
          }
          const doc = snapshot.docs[0]!;
          return magicLinkFromDoc(doc.id, doc.data());
        }
        return null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { consumedAt?: Date; userId?: string };
      }): Promise<MagicLinkRecord | null> => {
        const ref = getClient().collection('magicLinks').doc(where.id);
        const doc = await ref.get();
        if (!doc.exists) {
          return null;
        }
        const existing = magicLinkFromDoc(doc.id, doc.data() ?? {});
        const updated: MagicLinkRecord = {
          ...existing,
          ...(data.consumedAt !== undefined ? { consumedAt: data.consumedAt } : {}),
          ...(data.userId !== undefined ? { userId: data.userId } : {}),
        };
        await ref.set(updated);
        return updated;
      },
    },
    session: {
      create: async ({
        data,
      }: {
        data: Omit<SessionRecord, 'id' | 'createdAt' | 'user'>;
      }): Promise<SessionRecord> => {
        const id = createId('sess');
        const record: SessionRecord = {
          id,
          token: data.token,
          userId: data.userId,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        };
        await getClient().collection('sessions').doc(id).set(record);
        return record;
      },
      findUnique: async ({
        where,
      }: {
        where: { token: string };
        select?: unknown;
      }): Promise<SessionWithUser | null> => {
        const snapshot = await getClient()
          .collection('sessions')
          .where('token', '==', where.token)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return null;
        }

        const sessionDoc = snapshot.docs[0]!;
        const session = sessionFromDoc(sessionDoc.id, sessionDoc.data());
        const user = await findUserById(session.userId);
        if (!user) {
          return null;
        }
        return {
          ...session,
          user: {
            id: user.id,
            email: user.email,
          },
        };
      },
      deleteMany: async ({ where }: { where: { token: string } }): Promise<{ count: number }> => {
        const snapshot = await getClient()
          .collection('sessions')
          .where('token', '==', where.token)
          .get();

        if (snapshot.empty) {
          return { count: 0 };
        }

        const batch = getClient().batch();
        for (const doc of snapshot.docs) {
          batch.delete(doc.ref);
        }
        await batch.commit();
        return { count: snapshot.size };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>): Promise<unknown[]> => {
      return Promise.all(operations);
    },
    $disconnect: async (): Promise<void> => undefined,
  };
}

export type DbClient = ReturnType<typeof createFirestoreDb>;

const globalForDb = globalThis as unknown as { db?: DbClient };

export const db: DbClient = globalForDb.db ?? createFirestoreDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
