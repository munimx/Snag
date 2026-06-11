import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { ensureLocalPortReachable } from './tunnel-client.js';

describe('ensureLocalPortReachable', () => {
  it('resolves when a local service is listening on the port', async () => {
    const server = createServer((_req, res) => {
      res.end('ok');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    await expect(ensureLocalPortReachable(address.port)).resolves.toBeUndefined();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('rejects when no local service is listening on the port', async () => {
    const server = createServer();

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    await expect(ensureLocalPortReachable(address.port)).rejects.toThrow(
      `No service is listening on localhost:${address.port}`,
    );
  });
});
