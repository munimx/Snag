#!/usr/bin/env node

import { Command } from 'commander';

import { createInspectCommand } from './commands/inspect-command.js';
import { createListenCommand } from './commands/listen-command.js';
import { createLoginCommand } from './commands/login-command.js';
import { createReplayCommand } from './commands/replay-command.js';

async function main(): Promise<void> {
  const program = new Command();

  program.name('snag').description('Snag CLI').version('0.0.1');

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
