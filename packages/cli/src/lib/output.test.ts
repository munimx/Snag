import { describe, expect, it, vi } from 'vitest';

import { writeOutput } from './output.js';

describe('writeOutput', () => {
  it('prints text output by default', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    writeOutput({}, { ok: true }, 'hello');
    expect(spy).toHaveBeenCalledWith('hello');
    spy.mockRestore();
  });

  it('prints JSON output when json flag is true', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    writeOutput({ json: true }, { ok: true }, 'hello');
    expect(spy).toHaveBeenCalledWith('{"ok":true}');
    spy.mockRestore();
  });

  it('prints nothing when silent flag is true', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    writeOutput({ silent: true, json: true }, { ok: true }, 'hello');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
