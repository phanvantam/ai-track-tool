import { getReflogStats, readReflog } from "../core/reflog.js";
import { readState } from "../core/state.js";

interface RunReflogCommandOptions {
  limit?: number;
  stats?: boolean;
}

export async function runReflogCommand(targetPath: string, options: RunReflogCommandOptions = {}): Promise<void> {
  const state = await readState(targetPath);

  if (options.stats) {
    const stats = await getReflogStats(state.storagePath);
    process.stdout.write(`total: ${stats.totalEntries}\n`);

    for (const [action, count] of Object.entries(stats.actionCounts)) {
      process.stdout.write(`- ${action}: ${count}\n`);
    }

    return;
  }

  const entries = await readReflog(state.storagePath, { limit: options.limit });

  if (entries.length === 0) {
    process.stdout.write("Reflog trống.\n");
    return;
  }

  for (const entry of entries) {
    process.stdout.write(`${entry.timestamp} ${entry.action} ${entry.fromSnapshotId ?? "-"} -> ${entry.toSnapshotId ?? "-"}`);
    if (entry.reason) {
      process.stdout.write(` ${entry.reason}`);
    }
    process.stdout.write("\n");
  }
}
