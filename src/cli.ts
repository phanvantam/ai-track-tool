#!/usr/bin/env node
import { Command } from "commander";

import { runCherryPickCommand } from "./commands/cherry-pick.js";
import { runDiffCommand } from "./commands/diff.js";
import { runDiffSnapshotsCommand } from "./commands/diff-snapshots.js";
import { runDeltaInfoCommand } from "./commands/delta-info.js";
import { runFsckCommand } from "./commands/fsck.js";
import { runGcCommand } from "./commands/gc.js";
import { runIgnoreValidateCommand } from "./commands/ignore-validate.js";
import { runLockCommand } from "./commands/lock.js";
import { runLogCommand } from "./commands/log.js";
import { runMergeCommand } from "./commands/merge.js";
import { runNoteCommand } from "./commands/note.js";
import { runPatchExportCommand } from "./commands/patch-export.js";
import { runPatchImportCommand } from "./commands/patch-import.js";
import { runReflogCommand } from "./commands/reflog.js";
import { runRollbackCommand } from "./commands/rollback.js";
import { runFetchHistoryCommand, runShallowCommand } from "./commands/shallow.js";
import { runSparseCommand } from "./commands/sparse.js";
import { runStartCommand } from "./commands/start.js";
import { runStashCommand } from "./commands/stash.js";
import { runTagCommand } from "./commands/tag.js";
import { runUiCommand } from "./commands/ui.js";
import { runWatchCommand } from "./commands/watch.js";
import { runWebCommand } from "./commands/web.js";
import type { MergeStrategy } from "./types.js";

const program = new Command();

program.name("ai-track").description("Theo dõi thay đổi file do AI gây ra mà không cần git.");

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
  .command("delta-info")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .action(async (options: { path: string }) => {
    await runDeltaInfoCommand(options.path);
  });

program
  .command("cherry-pick")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--hunks <list>", "Danh sach hunk index, vd: 0,2", parseIndexList)
  .option("--list", "Chi liet ke hunk")
  .argument("<file>", "Duong dan file tu root --path")
  .action(async (file: string, options: { path: string; hunks?: number[]; list?: boolean }) => {
    await runCherryPickCommand(options.path, file, { hunks: options.hunks, list: options.list });
  });

program
  .command("diff-snapshots")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<from>", "Snapshot ID goc")
  .argument("<to>", "Snapshot ID dich")
  .action(async (from: string, to: string, options: { path: string }) => {
    await runDiffSnapshotsCommand(options.path, from, to);
  });

program
  .command("patch-export")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<from>", "Snapshot ID goc")
  .argument("<to>", "Snapshot ID dich")
  .action(async (from: string, to: string, options: { path: string }) => {
    await runPatchExportCommand(options.path, from, to);
  });

program
  .command("patch-import")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--reverse", "Apply patch theo huong nguoc")
  .option("--3way", "Thu 3-way merge khi patch fail")
  .argument("<patchFile>", "Duong dan patch file")
  .action(async (patchFile: string, options: { path: string; reverse?: boolean; ['3way']?: boolean }) => {
    await runPatchImportCommand(options.path, patchFile, { reverse: options.reverse, threeWay: options['3way'] });
  });

program
  .command("fsck")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--repair", "Thu sua cac loi co the tu dong sua")
  .action(async (options: { path: string; repair?: boolean }) => {
    await runFsckCommand(options.path, { repair: options.repair });
  });

program
  .command("gc")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--dry-run", "Chi hien thi cac buoc se don")
  .action(async (options: { path: string; dryRun?: boolean }) => {
    await runGcCommand(options.path, { dryRun: options.dryRun });
  });

program
  .command("ignore-validate")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--file <name>", "Ten file ignore", ".ai-track-ignore")
  .option("--samples <list>", "Danh sach path mau", collectCsvOption)
  .action(async (options: { path: string; file?: string; samples?: string[] }) => {
    await runIgnoreValidateCommand(options.path, { fileName: options.file, samples: options.samples });
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
  .option("--path <dir>", "Thu muc can hien thi tren web", collectOption, [])
  .action(async (options: { path: string[] }) => {
    await runWebCommand(options.path);
  });

program
  .command("rollback")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--strategy <mode>", "theirs | ours | manual | combined", "theirs")
  .argument("<file>", "Duong dan file tu root --path")
  .action(async (file: string, options: { path: string; strategy: MergeStrategy }) => {
    await runRollbackCommand(options.path, file, options.strategy);
  });

program
  .command("merge")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--strategy <mode>", "theirs | ours | manual | combined", "manual")
  .argument("<file>", "Duong dan file tu root --path")
  .action(async (file: string, options: { path: string; strategy: MergeStrategy }) => {
    await runMergeCommand(options.path, file, options.strategy);
  });

program
  .command("lock")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--release", "Force release lock")
  .action(async (options: { path: string; release?: boolean }) => {
    await runLockCommand(options.path, { release: options.release });
  });

program
  .command("log")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--limit <n>", "So snapshot toi da", parseInteger)
  .option("--tag <name>", "Loc theo tag")
  .option("--since <iso>", "Loc tu thoi diem ISO")
  .option("--message <text>", "Loc theo summary")
  .option("--graph", "In do thi history")
  .action(async (options: { path: string; limit?: number; tag?: string; since?: string; message?: string; graph?: boolean }) => {
    await runLogCommand(options.path, {
      limit: options.limit,
      tag: options.tag,
      since: options.since,
      message: options.message,
      graph: options.graph,
    });
  });

program
  .command("reflog")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .option("--limit <n>", "So dong toi da", parseInteger)
  .option("--stats", "In thong ke reflog")
  .action(async (options: { path: string; limit?: number; stats?: boolean }) => {
    await runReflogCommand(options.path, { limit: options.limit, stats: options.stats });
  });

program
  .command("tag")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<action>", "create | delete | list")
  .argument("[name]", "Ten tag")
  .argument("[snapshotId]", "Snapshot ID")
  .action(async (action: "create" | "delete" | "list", name: string | undefined, snapshotId: string | undefined, options: { path: string }) => {
    await runTagCommand(options.path, { action, tagName: name, snapshotId });
  });

program
  .command("note")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<action>", "add | show | delete | list")
  .argument("[snapshotId]", "Snapshot ID")
  .argument("[content]", "Noi dung note")
  .action(async (action: "add" | "show" | "delete" | "list", snapshotId: string | undefined, content: string | undefined, options: { path: string }) => {
    await runNoteCommand(options.path, { action, snapshotId, content });
  });

program
  .command("stash")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<action>", "save | apply | pop | list | show | drop | clear")
  .argument("[value]", "Message hoac stashId")
  .action(
    async (
      action: "save" | "apply" | "pop" | "list" | "show" | "drop" | "clear",
      value: string | undefined,
      options: { path: string },
    ) => {
      await runStashCommand(options.path, {
        action,
        message: action === "save" ? value : undefined,
        stashId: action !== "save" ? value : undefined,
      });
    },
  );

program
  .command("shallow")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<action>", "config | enable | disable")
  .argument("[depth]", "Depth neu enable")
  .action(async (action: "config" | "enable" | "disable", depth: string | undefined, options: { path: string }) => {
    await runShallowCommand(options.path, { action, depth: depth ? parseInteger(depth) : undefined });
  });

program
  .command("sparse")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .argument("<action>", "config | add | remove | reset")
  .argument("[pattern]", "Pattern sparse")
  .action(async (action: "config" | "add" | "remove" | "reset", pattern: string | undefined, options: { path: string }) => {
    await runSparseCommand(options.path, { action, pattern });
  });

program
  .command("fetch-history")
  .requiredOption("--path <dir>", "Thu muc dang duoc theo doi")
  .action(async () => {
    await runFetchHistoryCommand();
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseInteger(value: string): number {
  return Number.parseInt(value, 10);
}

function parseIndexList(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item >= 0);
}

function collectCsvOption(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
