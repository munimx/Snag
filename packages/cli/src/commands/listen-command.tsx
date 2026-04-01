import { render } from 'ink';
import React from 'react';
import { Command } from 'commander';

import { getOrCreateToken, loadConfig, saveConfig } from '../lib/config.js';
import { writeOutput } from '../lib/output.js';
import { TunnelClient } from '../lib/tunnel-client.js';
import { ListenScreen } from '../ui/listen-screen.js';
import type { CapturedRequest } from '@snag/shared/types';

interface ListenOptions {
  token?: string;
  server?: string;
  method?: string;
  search?: string;
  json?: boolean;
  silent?: boolean;
}

function resolveServerUrl(explicit?: string): string {
  if (explicit) {
    return explicit;
  }
  const config = loadConfig();
  if (config.serverUrl) {
    return config.serverUrl;
  }
  return process.env.SNAG_SERVER_URL ?? 'http://localhost:8080';
}

function toWsUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  return url.toString();
}

export function createListenCommand(): Command {
  return new Command('listen')
    .description('Listen for captured requests and open tunnel relay')
    .argument('<port>', 'local port to forward tunnel traffic to')
    .option('-t, --token <token>', 'reuse endpoint token')
    .option('-s, --server <url>', 'snag server URL')
    .option('--method <method>', 'filter method in UI list')
    .option('--search <text>', 'filter path/body text in UI list')
    .option('--json', 'machine-readable output')
    .option('--silent', 'suppress output')
    .action(async (portArg: string, options: ListenOptions) => {
      const localPort = Number(portArg);
      if (!Number.isInteger(localPort) || localPort <= 0) {
        throw new Error('Port must be a positive integer');
      }

      const token = options.token ?? getOrCreateToken();
      const serverUrl = resolveServerUrl(options.server);
      const wsUrl = toWsUrl(serverUrl);
      const publicUrl = `${serverUrl.replace(/\/$/, '')}/h/${token}`;

      saveConfig({
        ...loadConfig(),
        token,
        serverUrl,
      });

      writeOutput(options, { token, serverUrl, publicUrl, port: localPort }, `Listening on ${publicUrl} -> localhost:${localPort}`);

      const requests: CapturedRequest[] = [];
      const filtered = (): CapturedRequest[] =>
        requests.filter((request) => {
          const methodOk = options.method ? request.method.toLowerCase() === options.method.toLowerCase() : true;
          const searchOk = options.search
            ? `${request.path} ${request.body ?? ''}`.toLowerCase().includes(options.search.toLowerCase())
            : true;
          return methodOk && searchOk;
        });

      const client = new TunnelClient(wsUrl, token, localPort);
      const heartbeat = client.startHeartbeat();

      if (options.json || options.silent) {
        client.onCaptured((message) => {
          requests.unshift(message.request);
          if (options.json && !options.silent) {
            console.log(JSON.stringify(message.request));
          }
        });

        process.on('SIGINT', () => {
          clearInterval(heartbeat);
          client.close();
          process.exit(0);
        });
        return;
      }

      const app = render(<ListenScreen requests={filtered()} token={token} publicUrl={publicUrl} />);
      client.onCaptured((message) => {
        requests.unshift(message.request);
        app.rerender(<ListenScreen requests={filtered()} token={token} publicUrl={publicUrl} />);
      });

      app.waitUntilExit().then(() => {
        clearInterval(heartbeat);
        client.close();
      });
    });
}
