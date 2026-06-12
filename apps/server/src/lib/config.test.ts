import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('parses delivery worker env booleans explicitly', () => {
    expect(loadConfig({ ENABLE_DELIVERY_WORKER: 'false' }).ENABLE_DELIVERY_WORKER).toBe(false);
    expect(loadConfig({ ENABLE_DELIVERY_WORKER: '0' }).ENABLE_DELIVERY_WORKER).toBe(false);
    expect(loadConfig({ ENABLE_DELIVERY_WORKER: 'true' }).ENABLE_DELIVERY_WORKER).toBe(true);
    expect(loadConfig({ ENABLE_DELIVERY_WORKER: '1' }).ENABLE_DELIVERY_WORKER).toBe(true);
  });

  it('keeps the delivery worker disabled by default for local development', () => {
    expect(loadConfig({}).ENABLE_DELIVERY_WORKER).toBe(false);
  });
});
