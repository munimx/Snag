import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { saveConfig } from './config.js';
import { DEFAULT_SERVER_URL, resolveServerUrl } from './server-url.js';

describe('resolveServerUrl', () => {
  const originalHome = process.env.HOME;
  const originalServerUrl = process.env.SNAG_SERVER_URL;
  let testHome: string | null = null;

  afterEach(() => {
    if (testHome) {
      rmSync(testHome, { recursive: true, force: true });
      testHome = null;
    }
    if (originalHome) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    if (originalServerUrl) {
      process.env.SNAG_SERVER_URL = originalServerUrl;
    } else {
      delete process.env.SNAG_SERVER_URL;
    }
  });

  function useEmptyHome(): void {
    testHome = mkdtempSync(join(tmpdir(), 'snag-cli-server-url-'));
    process.env.HOME = testHome;
    delete process.env.SNAG_SERVER_URL;
  }

  it('defaults to the hosted Snag server', () => {
    useEmptyHome();

    expect(resolveServerUrl()).toBe(DEFAULT_SERVER_URL);
  });

  it('uses SNAG_SERVER_URL when no config value exists', () => {
    useEmptyHome();
    process.env.SNAG_SERVER_URL = 'http://localhost:8080/';

    expect(resolveServerUrl()).toBe('http://localhost:8080');
  });

  it('prefers saved config over environment variables', () => {
    useEmptyHome();
    process.env.SNAG_SERVER_URL = 'https://env.example.com';
    saveConfig({ serverUrl: 'https://config.example.com/' });

    expect(resolveServerUrl()).toBe('https://config.example.com');
  });

  it('prefers explicit options over saved config', () => {
    useEmptyHome();
    saveConfig({ serverUrl: 'https://config.example.com' });

    expect(resolveServerUrl('https://explicit.example.com/')).toBe('https://explicit.example.com');
  });
});
