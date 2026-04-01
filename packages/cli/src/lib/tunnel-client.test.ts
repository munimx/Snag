import { describe, expect, it } from 'vitest';

import { ensureLocalPortReachable } from './tunnel-client.js';

describe('ensureLocalPortReachable', () => {
  it('can open and close a local ephemeral port', async () => {
    await expect(ensureLocalPortReachable(0)).resolves.toBeUndefined();
  });
});
