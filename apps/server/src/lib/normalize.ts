export function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'undefined') {
      continue;
    }

    normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }

  return normalized;
}

export function normalizeQuery(query: unknown): Record<string, string> {
  if (!query || typeof query !== 'object') {
    return {};
  }

  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'undefined') {
      continue;
    }

    normalized[key] = Array.isArray(value) ? value.join(',') : String(value);
  }

  return normalized;
}

export function normalizeBody(body: unknown): { body: string | null; bodyType: string | null } {
  if (typeof body === 'undefined') {
    return { body: null, bodyType: null };
  }

  if (body === null) {
    return { body: null, bodyType: 'null' };
  }

  if (typeof body === 'string') {
    return { body, bodyType: 'text' };
  }

  if (Buffer.isBuffer(body)) {
    return { body: body.toString('utf-8'), bodyType: 'buffer' };
  }

  try {
    return { body: JSON.stringify(body), bodyType: 'json' };
  } catch {
    return { body: String(body), bodyType: 'text' };
  }
}
