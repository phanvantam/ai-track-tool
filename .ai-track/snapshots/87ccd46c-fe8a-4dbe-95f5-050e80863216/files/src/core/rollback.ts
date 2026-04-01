import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { readManifest, readState } from "./state.js";
import { resolveTrackedPath } from "./snapshot.js";

export async function rollbackFile(targetPathInput: string, relativePath: string): Promise<"restored" | "removed"> {
  const state = await readState(targetPathInput);
  const manifest = await readManifest(state.targetPath, state.activeSnapshotId);
  const snapshotFile = manifest.files.find((file) => file.path === relativePath);
  const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);

  if (snapshotFile) {
    const snapshotAbsolutePath = path.join(state.targetPath, ".ai-track", "snapshots", manifest.snapshotId, "files", relativePath);
    await mkdir(path.dirname(liveFilePath), { recursive: true });
    await copyFile(snapshotAbsolutePath, liveFilePath);
    return "restored";
  }

  try {
    const fileStats = await stat(liveFilePath);

    if (fileStats.isFile()) {
      await rm(liveFilePath);
      return "removed";
    }
  } catch {
    throw new Error(`Khong tim thay file de rollback: ${relativePath}`);
  }

  throw new Error(`Khong the rollback duong dan nay: ${relativePath}`);
}
