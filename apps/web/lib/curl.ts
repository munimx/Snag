import type { CapturedRequest } from '@snag/shared/types';

function escapeSingleQuotes(value: string): string {
  return value.replaceAll("'", "'\"'\"'");
}

export function toCurl(request: CapturedRequest): string {
  const url = new URL(request.path, 'http://localhost');
  Object.entries(request.query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const parts: string[] = [`curl -X ${request.method}`, `'${escapeSingleQuotes(url.pathname + url.search)}'`];

  Object.entries(request.headers).forEach(([key, value]) => {
    parts.push(`-H '${escapeSingleQuotes(`${key}: ${value}`)}'`);
  });

  if (request.body) {
    parts.push(`--data '${escapeSingleQuotes(request.body)}'`);
  }

  return parts.join(' ');
}

export async function copyText(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error('Clipboard API unavailable');
}
