import { Command } from 'commander';

import { loadConfig } from '../lib/config.js';
import { replayRequest } from '../lib/http-client.js';
import { resolveServerUrl } from '../lib/server-url.js';
import { writeOutput } from '../lib/output.js';

interface ReplayOptions {
  target: string;
  server?: string;
  json?: boolean;
  silent?: boolean;
}

export function createReplayCommand(): Command {
  return new Command('replay')
    .description('Replay a captured request')
    .argument('<requestId>', 'captured request ID')
    .requiredOption('--target <url>', 'target URL for replay')
    .option('-s, --server <url>', 'snag server URL')
    .option('--json', 'machine-readable output')
    .option('--silent', 'suppress output')
    .action(async (requestId: string, options: ReplayOptions) => {
      const serverUrl = resolveServerUrl(options.server);
      const authToken = loadConfig().authToken ?? undefined;
      const replay = await replayRequest(serverUrl, requestId, options.target, authToken);
      writeOutput(
        options,
        replay,
        `Replay ${replay.id} -> ${replay.targetUrl} status=${replay.responseStatus ?? 'N/A'} latencyMs=${replay.latencyMs ?? 'N/A'}`,
      );
    });
}
