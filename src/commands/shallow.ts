import { fetchHistory, getVisibleSnapshotHistory, pruneVisibleHistory, updateShallowConfig } from "../core/shallow.js";
import { readState } from "../core/state.js";

interface RunShallowCommandOptions {
  action: "config" | "enable" | "disable";
  depth?: number;
}

export async function runShallowCommand(targetPath: string, options: RunShallowCommandOptions): Promise<void> {
  if (options.action === "config") {
    const state = await readState(targetPath);
    process.stdout.write(`${JSON.stringify(state.shallowConfig ?? { shallow: false }, null, 2)}\n`);
    process.stdout.write(`visibleHistory: ${(getVisibleSnapshotHistory(state)).length}\n`);
    return;
  }

  if (options.action === "enable") {
    await updateShallowConfig(targetPath, { shallow: true, depth: options.depth ?? 10 });
    await pruneVisibleHistory(targetPath);
    process.stdout.write(`Đã bật shallow depth=${options.depth ?? 10}\n`);
    return;
  }

  await updateShallowConfig(targetPath, { shallow: false, depth: undefined });
  process.stdout.write("Đã tắt shallow.\n");
}

export async function runFetchHistoryCommand(): Promise<void> {
  await fetchHistory();
}
