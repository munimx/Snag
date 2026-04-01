import { describe, expect, it } from 'vitest';

import { extractBodyValue, matchesRule } from './delivery-worker.js';

describe('extractBodyValue', () => {
  it('returns string value for key from JSON body', () => {
    expect(extractBodyValue('{"event":"order.created","count":2}', 'event')).toBe('order.created');
    expect(extractBodyValue('{"event":"order.created","count":2}', 'count')).toBe('2');
  });

  it('returns null for invalid body or missing key', () => {
    expect(extractBodyValue(null, 'event')).toBeNull();
    expect(extractBodyValue('not-json', 'event')).toBeNull();
    expect(extractBodyValue('{"x":"y"}', 'event')).toBeNull();
  });
});

describe('matchesRule', () => {
  it('matches method + body key/value filters correctly', () => {
    const request = {
      method: 'POST',
      body: '{"type":"order.created","source":"stripe"}',
    };

    expect(
      matchesRule(request, {
        enabled: true,
        filterMethod: 'POST',
        filterBodyKey: 'type',
        filterBodyVal: 'order.created',
      }),
    ).toBe(true);

    expect(
      matchesRule(request, {
        enabled: true,
        filterMethod: 'GET',
        filterBodyKey: 'type',
        filterBodyVal: 'order.created',
      }),
    ).toBe(false);
  });
});
