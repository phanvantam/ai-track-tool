import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { MergeStrategy } from "../types.js";
import { getChanges } from "./compare.js";
import { readSnapshotFileBuffer } from "./delta.js";
import { threeWayMerge } from "./merge.js";
import { withStorageLock } from "./lock.js";
import { appendReflogEntry } from "./reflog.js";
import { readManifest, readState, resolveStorageRoot } from "./state.js";
import { resolveTrackedPath } from "./snapshot.js";
import { restoreSymlink } from "./symlink.js";
import { atomicWriteFile, backupFileForTransaction, recoverIncompleteTransactions, runInTransaction } from "./transaction.js";

async function verifySnapshotFile(storagePath: string, snapshotId: string, relativePath: string, expectedSize: number): Promise<Buffer> {
  const content = await readSnapshotFileBuffer(storagePath, snapshotId, relativePath);

  if (content.length !== expectedSize) {
    throw new Error(`Snapshot file bị sai kích thước: ${relativePath}`);
  }

  return content;
}

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
  return rollbackFileWithStrategy(targetPathInput, relativePath, "theirs");
}

async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function rollbackFileWithStrategy(
  targetPathInput: string,
  relativePath: string,
  strategy: MergeStrategy = "theirs",
): Promise<"restored" | "removed" | "moved"> {
  const storagePath = await resolveStorageRoot(targetPathInput);

  return withStorageLock(storagePath, `rollback:${relativePath}`, async () => {
    await recoverIncompleteTransactions(storagePath);

    const state = await readState(targetPathInput);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    const changes = await getChanges(targetPathInput);
    const change = changes.find((c) => c.path === relativePath);
    const snapshotFile = manifest.files.find((file) => file.path === relativePath);
    const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);

    if (change && change.type === "renamed" && change.oldPath) {
      const currentFilePath = resolveTrackedPath(state.targetPath, relativePath);
      const originalFilePath = resolveTrackedPath(state.targetPath, change.oldPath);

      const { result } = await runInTransaction(state.storagePath, `rollback:rename:${relativePath}`, async (transaction) => {
        await backupFileForTransaction(state.storagePath, transaction, originalFilePath);
        await backupFileForTransaction(state.storagePath, transaction, currentFilePath);
        await mkdir(path.dirname(originalFilePath), { recursive: true });
        await copyFile(currentFilePath, originalFilePath);
        await rm(currentFilePath);
        return "moved" as const;
      });

      await cleanupEmptyParentDirs(state.targetPath, currentFilePath);
      await appendReflogEntry(state.storagePath, {
        action: "rollback",
        fromSnapshotId: state.activeSnapshotId,
        toSnapshotId: state.activeSnapshotId,
        reason: `rollback renamed file ${relativePath}`,
        filesAffected: 1,
        metadata: { strategy },
      });
      return result;
    }

    if (snapshotFile) {
      const snapshotContent = await verifySnapshotFile(state.storagePath, manifest.snapshotId, relativePath, snapshotFile.size);

      const { result } = await runInTransaction(state.storagePath, `rollback:restore:${relativePath}`, async (transaction) => {
        await backupFileForTransaction(state.storagePath, transaction, liveFilePath);

        if (snapshotFile.symlink) {
          await restoreSymlink(state.targetPath, relativePath, snapshotFile.symlink);
          return "restored" as const;
        }

        if (strategy !== "theirs" && !snapshotFile.isBinary) {
          const baseContent = snapshotContent.toString("utf8");
          const oursContent = await readTextIfExists(liveFilePath);
          const mergeResult = threeWayMerge(relativePath, baseContent, oursContent, baseContent, {
            strategy,
            conflictOnDivergence: true,
          });
          await mkdir(path.dirname(liveFilePath), { recursive: true });
          await atomicWriteFile(liveFilePath, mergeResult.merged ?? baseContent ?? "");
          return "restored" as const;
        }

        await mkdir(path.dirname(liveFilePath), { recursive: true });
        await atomicWriteFile(liveFilePath, snapshotContent);
        return "restored" as const;
      });

      await appendReflogEntry(state.storagePath, {
        action: "rollback",
        fromSnapshotId: state.activeSnapshotId,
        toSnapshotId: state.activeSnapshotId,
        reason: `rollback file ${relativePath}`,
        filesAffected: 1,
        metadata: { strategy },
      });
      return result;
    }

    try {
      const fileStats = await stat(liveFilePath);

      if (fileStats.isFile()) {
        const { result } = await runInTransaction(state.storagePath, `rollback:remove:${relativePath}`, async (transaction) => {
          await backupFileForTransaction(state.storagePath, transaction, liveFilePath);
          await rm(liveFilePath);
          return "removed" as const;
        });

        await cleanupEmptyParentDirs(state.targetPath, liveFilePath);
        await appendReflogEntry(state.storagePath, {
          action: "rollback",
          fromSnapshotId: state.activeSnapshotId,
          toSnapshotId: state.activeSnapshotId,
          reason: `remove added file ${relativePath}`,
          filesAffected: 1,
          metadata: { strategy },
        });
        return result;
      }
    } catch {
      throw new Error(`Không tìm thấy file để rollback: ${relativePath}`);
    }

    throw new Error(`Không thể rollback đường dẫn này: ${relativePath}`);
  });
}
