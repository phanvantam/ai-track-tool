import { createSnapshot } from "../core/snapshot.js";

export async function runStartCommand(targetPath: string): Promise<void> {
  const state = await createSnapshot(targetPath);
  process.stdout.write(`Da tao snapshot ${state.activeSnapshotId}\n`);
  process.stdout.write(`Target: ${state.targetPath}\n`);
}
