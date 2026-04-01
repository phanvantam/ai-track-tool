import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { getChanges } from "./compare.js";
import { readManifest, readState } from "./state.js";
import { resolveTrackedPath } from "./snapshot.js";

async function cleanupEmptyParentDirs(targetPath: string, filePath: string): Promise<void> {
  let currentDir = path.dirname(filePath);

  while (currentDir !== targetPath && currentDir.startsWith(targetPath)) {
    try {
      const entries = await readdir(currentDir);
      if (entries.length === 0) {
        await rm(currentDir, { recursive: false });
        currentDir = path.dirname(currentDir);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

export async function rollbackFile(targetPathInput: string, relativePath: string): Promise<"restored" | "removed" | "moved"> {
  const state = await readState(targetPathInput);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const changes = await getChanges(targetPathInput);
  const change = changes.find((c) => c.path === relativePath);
  
  // Handle renamed files - move back to original location
  if (change && change.type === "renamed" && change.oldPath) {
    const currentFilePath = resolveTrackedPath(state.targetPath, relativePath);
    const originalFilePath = resolveTrackedPath(state.targetPath, change.oldPath);
    
    await mkdir(path.dirname(originalFilePath), { recursive: true });
    await copyFile(currentFilePath, originalFilePath);
    await rm(currentFilePath);
    await cleanupEmptyParentDirs(state.targetPath, currentFilePath);
    
    return "moved";
  }
  
  const snapshotFile = manifest.files.find((file) => file.path === relativePath);
  const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);

  if (snapshotFile) {
    const snapshotAbsolutePath = path.join(state.storagePath, "snapshots", manifest.snapshotId, "files", relativePath);
    await mkdir(path.dirname(liveFilePath), { recursive: true });
    await copyFile(snapshotAbsolutePath, liveFilePath);
    return "restored";
  }

  try {
    const fileStats = await stat(liveFilePath);

    if (fileStats.isFile()) {
      await rm(liveFilePath);
      await cleanupEmptyParentDirs(state.targetPath, liveFilePath);
      return "removed";
    }
  } catch {
    throw new Error(`Không tìm thấy file để rollback: ${relativePath}`);
  }

  throw new Error(`Không thể rollback đường dẫn này: ${relativePath}`);
}
