import { Command } from 'commander';

import { getRequestById } from '../lib/http-client.js';
import { loadConfig } from '../lib/config.js';
import { resolveServerUrl } from '../lib/server-url.js';
import { writeOutput } from '../lib/output.js';

interface InspectOptions {
  server?: string;
  json?: boolean;
  silent?: boolean;
}

export function createInspectCommand(): Command {
  return new Command('inspect')
    .description('Inspect a captured request by ID')
    .argument('<requestId>', 'captured request ID')
    .option('-s, --server <url>', 'snag server URL')
    .option('--json', 'machine-readable output')
    .option('--silent', 'suppress output')
    .action(async (requestId: string, options: InspectOptions) => {
      const serverUrl = resolveServerUrl(options.server);
      const authToken = loadConfig().authToken ?? undefined;
      const request = await getRequestById(serverUrl, requestId, authToken);
      writeOutput(
        options,
        request,
        [
          `ID: ${request.id}`,
          `Method: ${request.method}`,
          `Path: ${request.path}`,
          `Received: ${request.receivedAt}`,
          `Status: ${request.status ?? 'N/A'}`,
          `Headers: ${JSON.stringify(request.headers)}`,
          `Body: ${request.body ?? '<empty>'}`,
        ].join('\n'),
      );
    });
}
