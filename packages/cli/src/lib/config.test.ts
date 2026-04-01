import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getConfigPath, getOrCreateToken, loadConfig, saveConfig } from './config.js';

describe('config module', () => {
  const originalHome = process.env.HOME;
  let testHome: string | null = null;

  afterEach(() => {
    if (testHome) {
      rmSync(testHome, { recursive: true, force: true });
      testHome = null;
    }
    if (originalHome) {
      process.env.HOME = originalHome;
    }
  });

  it('saves and loads cli config from ~/.snag/config.json', () => {
    testHome = mkdtempSync(join(tmpdir(), 'snag-cli-config-'));
    process.env.HOME = testHome;

    saveConfig({ token: 'abc', serverUrl: 'http://localhost:8080' });
    const loaded = loadConfig();

    expect(loaded.token).toBe('abc');
    expect(loaded.serverUrl).toBe('http://localhost:8080');
    expect(getConfigPath().endsWith('.snag/config.json')).toBe(true);
  });

  it('creates and persists a token when absent', () => {
    testHome = mkdtempSync(join(tmpdir(), 'snag-cli-token-'));
    process.env.HOME = testHome;

    const token = getOrCreateToken();
    expect(token.startsWith('cli_')).toBe(true);

    const loaded = loadConfig();
    expect(loaded.token).toBe(token);
  });
});
