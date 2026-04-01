import { describe, expect, it } from 'vitest';

import { diffJson, parseJsonBody } from './json-diff';

describe('parseJsonBody', () => {
  it('returns parsed JSON object when body is valid JSON', () => {
    expect(parseJsonBody('{"hello":"world"}')).toEqual({ hello: 'world' });
  });

  it('returns null when body is invalid JSON', () => {
    expect(parseJsonBody('not-json')).toBeNull();
  });
});

describe('diffJson', () => {
  it('returns changed/added/removed entries for differing objects', () => {
    const entries = diffJson(
      { id: 1, metadata: { status: 'pending' }, removeMe: true },
      { id: 2, metadata: { status: 'processed' }, addMe: 'yes' },
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'id', status: 'changed' }),
        expect.objectContaining({ path: 'metadata.status', status: 'changed' }),
        expect.objectContaining({ path: 'removeMe', status: 'removed' }),
        expect.objectContaining({ path: 'addMe', status: 'added' }),
      ]),
    );
  });
});
