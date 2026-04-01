#!/usr/bin/env node
import { Command } from "commander";

import { runDiffCommand } from "./commands/diff.js";
import { runRollbackCommand } from "./commands/rollback.js";
import { runStartCommand } from "./commands/start.js";
import { runUiCommand } from "./commands/ui.js";
import { runWatchCommand } from "./commands/watch.js";
import { runWebCommand } from "./commands/web.js";

const program = new Command();

program.name("ai-track").description("Theo doi thay doi file do AI gay ra ma khong can git.");

program
  .command("start")
  .requiredOption("--path <dir>", "Thu muc can theo doi")
  .action(async (options: { path: string }) => {
    await runStartCommand(options.path);
  });

program
  .command("diff")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .action(async (options: { path: string }) => {
    await runDiffCommand(options.path);
  });

program
  .command("ui")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .action(async (options: { path: string }) => {
    await runUiCommand(options.path);
  });

program
  .command("watch")
  .requiredOption("--path <dir>", "Thu muc can theo doi tu dong")
  .action(async (options: { path: string }) => {
    await runWatchCommand(options.path);
  });

program
  .command("web")
  .requiredOption("--path <dir>", "Thu muc can hien thi tren web", collectOption, [])
  .action(async (options: { path: string[] }) => {
    if (options.path.length === 0) {
      throw new Error("Can it nhat mot --path");
    }

    await runWebCommand(options.path);
  });

program
  .command("rollback")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<file>", "Duong dan file tu root --path")
  .action(async (file: string, options: { path: string }) => {
    await runRollbackCommand(options.path, file);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}
