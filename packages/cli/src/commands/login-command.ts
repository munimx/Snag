import { Command } from 'commander';

import { loadConfig, saveConfig } from '../lib/config.js';
import { requestMagicLink, verifyMagicLinkToken } from '../lib/http-client.js';
import { resolveServerUrl } from '../lib/server-url.js';

interface LoginOptions {
  server?: string;
  email: string;
  token?: string;
}

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Login using a magic link flow')
    .requiredOption('-e, --email <email>', 'email to receive magic link')
    .option('-s, --server <url>', 'snag server URL')
    .option('--token <magicToken>', 'verify using magic token directly')
    .action(async (options: LoginOptions) => {
      const serverUrl = resolveServerUrl(options.server);

      const magicToken = options.token
        ? options.token
        : (() => {
            console.log(`Requesting magic link for ${options.email}...`);
            return null;
          })();

      if (!magicToken) {
        const response = await requestMagicLink(serverUrl, options.email);
        console.log('Open this URL in your browser to complete login:');
        console.log(response.magicLinkUrl);

        const parsed = new URL(response.magicLinkUrl);
        const tokenFromUrl = parsed.searchParams.get('token');
        if (!tokenFromUrl) {
          throw new Error('Magic link did not include token');
        }

        console.log('\nCLI shortcut: verifying token directly for local setup...');
        const verified = await verifyMagicLinkToken(serverUrl, tokenFromUrl);
        saveConfig({
          ...loadConfig(),
          serverUrl,
          authToken: verified.token,
        });
        console.log(`Logged in as ${verified.user.email}`);
        return;
      }

      const verified = await verifyMagicLinkToken(serverUrl, magicToken);
      saveConfig({
        ...loadConfig(),
        serverUrl,
        authToken: verified.token,
      });
      console.log(`Logged in as ${verified.user.email}`);
    });
}
