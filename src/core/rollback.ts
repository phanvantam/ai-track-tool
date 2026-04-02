import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { MergeStrategy, MetadataCache, SnapshotFileEntry, TrackState } from "../types.js";
import { getChanges } from "./compare.js";
import { readSnapshotFileBuffer } from "./delta.js";
import { getMetadataCachePath, METADATA_CACHE_VERSION, writeMetadataCache } from "./incremental-scan.js";
import { threeWayMerge } from "./merge.js";
import { withStorageLock } from "./lock.js";
import { appendReflogEntry } from "./reflog.js";
import { getStateFilePath, readManifest, readState, resolveStorageRoot, writeState } from "./state.js";
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

async function buildSnapshotHistory(storagePath: string, snapshotId: string): Promise<string[]> {
  const history: string[] = [];
  let currentSnapshotId: string | null | undefined = snapshotId;

  while (currentSnapshotId) {
    history.push(currentSnapshotId);
    const manifest = await readManifest(storagePath, currentSnapshotId);
    currentSnapshotId = manifest.parentSnapshotId ?? null;
  }

  return history;
}

function buildMetadataCache(targetPath: string, snapshot: { createdAt: string; files: SnapshotFileEntry[] }): MetadataCache {
  return {
    version: METADATA_CACHE_VERSION,
    targetPath,
    scannedAt: snapshot.createdAt,
    osType: process.platform,
    files: Object.fromEntries(snapshot.files.map((file) => [file.path, {
      path: file.path,
      hash: file.hash,
      size: file.size,
      mtimeMs: file.mtimeMs,
      isBinary: file.isBinary,
      binaryType: file.binaryType,
      symlink: file.symlink,
      inode: file.inode,
      uid: file.uid,
      gid: file.gid,
      mode: file.mode,
    }])),
  };
}

async function restoreSnapshotFile(targetPath: string, storagePath: string, snapshotId: string, file: SnapshotFileEntry): Promise<void> {
  const liveFilePath = resolveTrackedPath(targetPath, file.path);

  if (file.symlink) {
    await restoreSymlink(targetPath, file.path, file.symlink);
    return;
  }

  const snapshotContent = await verifySnapshotFile(storagePath, snapshotId, file.path, file.size);
  await mkdir(path.dirname(liveFilePath), { recursive: true });
  await atomicWriteFile(liveFilePath, snapshotContent);
}

export async function rollbackToSnapshot(targetPathInput: string, snapshotId: string): Promise<TrackState> {
  const storagePath = await resolveStorageRoot(targetPathInput);

  return withStorageLock(storagePath, `restore-snapshot:${snapshotId}`, async () => {
    await recoverIncompleteTransactions(storagePath);

    const state = await readState(targetPathInput);

    if (state.activeSnapshotId === snapshotId) {
      return state;
    }

    const [activeManifest, targetManifest, changes] = await Promise.all([
      readManifest(state.storagePath, state.activeSnapshotId),
      readManifest(state.storagePath, snapshotId),
      getChanges(targetPathInput),
    ]);
    const targetPaths = new Set(targetManifest.files.map((file) => file.path));
    const renamedPaths = new Map(changes.filter((change) => change.type === "renamed" && change.oldPath).map((change) => [change.oldPath!, change.path]));
    const pathsToRemove = new Set<string>();

    for (const file of activeManifest.files) {
      if (!targetPaths.has(file.path)) {
        pathsToRemove.add(renamedPaths.get(file.path) ?? file.path);
      }
    }

    for (const change of changes) {
      if (change.type === "added" || change.type === "renamed") {
        if (!targetPaths.has(change.path)) {
          pathsToRemove.add(change.path);
        }
      }
    }

    const timestamp = new Date().toISOString();
    const nextState: TrackState = {
      ...state,
      activeSnapshotId: snapshotId,
      previousSnapshotId: targetManifest.parentSnapshotId ?? undefined,
      snapshotHistory: await buildSnapshotHistory(state.storagePath, snapshotId),
      updatedAt: timestamp,
    };

    await runInTransaction(state.storagePath, `restore-snapshot:${snapshotId}`, async (transaction) => {
      const backedUpPaths = new Set<string>();

      async function backupOnce(filePath: string): Promise<void> {
        if (backedUpPaths.has(filePath)) {
          return;
        }

        backedUpPaths.add(filePath);
        await backupFileForTransaction(state.storagePath, transaction, filePath);
      }

      await backupOnce(getStateFilePath(state.storagePath));
      await backupOnce(getMetadataCachePath(state.storagePath));

      for (const relativePath of pathsToRemove) {
        const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);
        await backupOnce(liveFilePath);
        await rm(liveFilePath, { recursive: true, force: true });
        await cleanupEmptyParentDirs(state.targetPath, liveFilePath);
      }

      for (const file of targetManifest.files) {
        const liveFilePath = resolveTrackedPath(state.targetPath, file.path);
        await backupOnce(liveFilePath);
        await restoreSnapshotFile(state.targetPath, state.storagePath, snapshotId, file);
      }

      await writeState(nextState);
      await writeMetadataCache(state.storagePath, buildMetadataCache(state.targetPath, targetManifest));
    });

    await appendReflogEntry(state.storagePath, {
      action: "restore",
      fromSnapshotId: state.activeSnapshotId,
      toSnapshotId: snapshotId,
      reason: `restore workspace to snapshot ${snapshotId}`,
      filesAffected: targetManifest.files.length,
    });

    return nextState;
  });
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
