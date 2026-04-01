import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

interface CliConfig {
  token?: string;
  serverUrl?: string;
  authToken?: string | null;
}

function getSnagDir(): string {
  return join(os.homedir(), '.snag');
}

function getResolvedConfigPath(): string {
  return join(getSnagDir(), 'config.json');
}

export function getConfigPath(): string {
  return getResolvedConfigPath();
}

export function loadConfig(): CliConfig {
  const configPath = getResolvedConfigPath();

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  const snagDir = getSnagDir();
  const configPath = getResolvedConfigPath();

  if (!existsSync(snagDir)) {
    mkdirSync(snagDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function getOrCreateToken(): string {
  const config = loadConfig();
  if (config.token) {
    return config.token;
  }

  const token = `cli_${randomBytes(8).toString('hex')}`;
  saveConfig({ ...config, token });
  return token;
}
