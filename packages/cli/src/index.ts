#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { Command } from 'commander';

import { createInspectCommand } from './commands/inspect-command.js';
import { createListenCommand } from './commands/listen-command.js';
import { createLoginCommand } from './commands/login-command.js';
import { createReplayCommand } from './commands/replay-command.js';

function getPackageVersion(): string {
  const rawPackageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  const packageJson = JSON.parse(rawPackageJson) as { version?: unknown };
  return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0';
}

async function main(): Promise<void> {
  const program = new Command();

  program.name('snag').description('Snag CLI').version(getPackageVersion());

  program.addCommand(createListenCommand());
  program.addCommand(createInspectCommand());
  program.addCommand(createReplayCommand());
  program.addCommand(createLoginCommand());

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`snag error: ${message}`);
  process.exit(1);
});
