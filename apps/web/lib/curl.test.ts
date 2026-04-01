import { describe, expect, it } from 'vitest';

import { toCurl } from './curl';

describe('toCurl', () => {
  it('builds curl command from captured request', () => {
    const curl = toCurl({
      id: 'req_1',
      endpointId: 'ep_1',
      method: 'POST',
      path: '/hooks',
      query: { source: 'stripe' },
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      bodyType: 'application/json',
      status: null,
      latencyMs: null,
      receivedAt: new Date().toISOString(),
    });

    expect(curl).toContain('curl -X POST');
    expect(curl).toContain('/hooks?source=stripe');
    expect(curl).toContain("-H 'content-type: application/json'");
    expect(curl).toContain(`--data '{"ok":true}'`);
  });
});
