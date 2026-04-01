export interface JsonDiffEntry {
  path: string;
  before: string;
  after: string;
  status: 'added' | 'removed' | 'changed';
}

function toPath(parent: string, key: string): string {
  if (parent === '') {
    return key;
  }

  return `${parent}.${key}`;
}

function stringifyValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonBody(body: string | null): unknown | null {
  if (!body || body.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function diffJson(before: unknown, after: unknown, parentPath = ''): JsonDiffEntry[] {
  if (before === after) {
    return [];
  }

  const beforeIsArray = Array.isArray(before);
  const afterIsArray = Array.isArray(after);

  if (beforeIsArray && afterIsArray) {
    const maxLength = Math.max(before.length, after.length);
    const entries: JsonDiffEntry[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const key = `[${index}]`;
      const nextPath = parentPath === '' ? key : `${parentPath}${key}`;
      const beforeValue = before[index];
      const afterValue = after[index];

      if (index >= before.length) {
        entries.push({
          path: nextPath,
          before: '—',
          after: stringifyValue(afterValue),
          status: 'added',
        });
        continue;
      }

      if (index >= after.length) {
        entries.push({
          path: nextPath,
          before: stringifyValue(beforeValue),
          after: '—',
          status: 'removed',
        });
        continue;
      }

      entries.push(...diffJson(beforeValue, afterValue, nextPath));
    }

    return entries;
  }

  if (isRecord(before) && isRecord(after)) {
    const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
    const entries: JsonDiffEntry[] = [];

    for (const key of keys) {
      const nextPath = toPath(parentPath, key);
      const hasBefore = key in before;
      const hasAfter = key in after;

      if (!hasBefore && hasAfter) {
        entries.push({
          path: nextPath,
          before: '—',
          after: stringifyValue(after[key]),
          status: 'added',
        });
        continue;
      }

      if (hasBefore && !hasAfter) {
        entries.push({
          path: nextPath,
          before: stringifyValue(before[key]),
          after: '—',
          status: 'removed',
        });
        continue;
      }

      entries.push(...diffJson(before[key], after[key], nextPath));
    }

    return entries;
  }

  return [
    {
      path: parentPath || '$',
      before: stringifyValue(before),
      after: stringifyValue(after),
      status: 'changed',
    },
  ];
}
