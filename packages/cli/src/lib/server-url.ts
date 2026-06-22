import { loadConfig } from './config.js';

export const DEFAULT_SERVER_URL = 'https://snag-server.fly.dev';

function cleanServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function resolveServerUrl(explicit?: string): string {
  if (explicit && explicit.trim().length > 0) {
    return cleanServerUrl(explicit);
  }

  const config = loadConfig();
  if (config.serverUrl && config.serverUrl.trim().length > 0) {
    return cleanServerUrl(config.serverUrl);
  }

  if (process.env.SNAG_SERVER_URL && process.env.SNAG_SERVER_URL.trim().length > 0) {
    return cleanServerUrl(process.env.SNAG_SERVER_URL);
  }

  return DEFAULT_SERVER_URL;
}
