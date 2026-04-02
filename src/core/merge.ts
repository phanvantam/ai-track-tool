import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import type { ConflictChunk, MergeConflict, MergeResult, MergeStrategy, SnapshotFileEntry } from "../types.js";
import { readSnapshotFileBuffer } from "./delta.js";
import { readManifest, readState, resolveStorageRoot } from "./state.js";
import { resolveTrackedPath } from "./snapshot.js";
import { appendReflogEntry } from "./reflog.js";
import { atomicWriteFile, backupFileForTransaction, recoverIncompleteTransactions, runInTransaction } from "./transaction.js";
import { withStorageLock } from "./lock.js";

interface ThreeWayMergeOptions {
  strategy?: MergeStrategy;
  conflictOnDivergence?: boolean;
}

function isBinaryText(content: string | null): boolean {
  return content !== null && content.includes("\u0000");
}

function splitLines(content: string | null): string[] {
  return (content ?? "").split("\n");
}

function buildConflictChunk(base: string | null, ours: string | null, theirs: string | null): ConflictChunk {
  const baseLines = splitLines(base);
  const oursLines = splitLines(ours);
  const theirsLines = splitLines(theirs);
  const maxLines = Math.max(baseLines.length, oursLines.length, theirsLines.length);

  return {
    startLine: 0,
    endLine: maxLines,
    oursLines,
    theirsLines,
  };
}

function mergeWithConflictMarkers(conflict: MergeConflict): string {
  return [
    "<<<<<<< ours (workspace)",
    conflict.ours,
    "=======",
    conflict.theirs,
    ">>>>>>> theirs (snapshot)",
  ].join("\n");
}

function buildConflict(
  filePath: string,
  type: MergeConflict["type"],
  base: string | null,
  ours: string | null,
  theirs: string | null,
): MergeConflict {
  return {
    path: filePath,
    type,
    base: base ?? "",
    ours: ours ?? "",
    theirs: theirs ?? "",
    conflicts: [buildConflictChunk(base, ours, theirs)],
  };
}

function applyStrategy(strategy: MergeStrategy, ours: string | null, theirs: string | null, conflict: MergeConflict): MergeResult {
  if (strategy === "ours") {
    return {
      status: "success",
      conflicts: [conflict],
      merged: ours ?? "",
      strategy,
      resolution: "Giữ nội dung workspace.",
    };
  }

  if (strategy === "theirs") {
    return {
      status: "success",
      conflicts: [conflict],
      merged: theirs ?? "",
      strategy,
      resolution: "Giữ nội dung snapshot.",
    };
  }

  const merged = mergeWithConflictMarkers(conflict);
  return {
    status: "conflict",
    conflicts: [conflict],
    merged: strategy === "combined" ? merged : merged,
    strategy,
    resolution: "Cần xử lý conflict thủ công.",
  };
}

export function threeWayMerge(
  filePath: string,
  base: string | null,
  ours: string | null,
  theirs: string | null,
  options: ThreeWayMergeOptions = {},
): MergeResult {
  const strategy = options.strategy ?? "manual";

  if (ours === theirs) {
    return {
      status: "success",
      conflicts: [],
      merged: ours ?? "",
      strategy,
      resolution: "Nội dung đã giống nhau.",
    };
  }

  if (isBinaryText(ours) || isBinaryText(theirs)) {
    return applyStrategy(strategy, ours, theirs, buildConflict(filePath, "binary", base, ours, theirs));
  }

  if (ours === null && theirs !== null) {
    return applyStrategy(strategy, ours, theirs, buildConflict(filePath, "delete_modify", base, ours, theirs));
  }

  if (theirs === null) {
    return applyStrategy(strategy, ours, theirs, buildConflict(filePath, "delete_modify", base, ours, theirs));
  }

  if (base === ours) {
    return {
      status: "success",
      conflicts: [],
      merged: theirs,
      strategy,
      resolution: "Workspace chưa đổi, dùng snapshot.",
    };
  }

  if (base === theirs && !options.conflictOnDivergence) {
    return {
      status: "success",
      conflicts: [],
      merged: ours ?? "",
      strategy,
      resolution: "Snapshot chưa đổi, giữ workspace.",
    };
  }

  return applyStrategy(strategy, ours, theirs, buildConflict(filePath, "content", base, ours, theirs));
}

async function readBufferIfExists(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function buildBinaryMergeResult(filePath: string, strategy: MergeStrategy, ours: Buffer | null, theirs: Buffer): MergeResult {
  const conflict = buildConflict(filePath, "binary", "[binary]", ours ? "[workspace binary]" : "", "[snapshot binary]");

  if (strategy === "ours") {
    return {
      status: "success",
      conflicts: [conflict],
      strategy,
      resolution: "Giữ file nhị phân ở workspace.",
    };
  }

  if (strategy === "theirs") {
    return {
      status: "success",
      conflicts: [conflict],
      strategy,
      resolution: "Khôi phục file nhị phân từ snapshot.",
    };
  }

  return {
    status: "conflict",
    conflicts: [conflict],
    strategy,
    resolution: "File nhị phân không hỗ trợ conflict marker, hãy chọn ours hoặc theirs.",
  };
}

async function applyMergedContent(
  targetPath: string,
  relativePath: string,
  merged: string | undefined,
): Promise<void> {
  const liveFilePath = resolveTrackedPath(targetPath, relativePath);

  if (merged === undefined) {
    await rm(liveFilePath, { force: true });
    return;
  }

  await mkdir(path.dirname(liveFilePath), { recursive: true });
  await atomicWriteFile(liveFilePath, merged);
}

export async function mergeTrackedFile(
  targetPathInput: string,
  relativePath: string,
  strategy: MergeStrategy = "manual",
): Promise<MergeResult> {
  const storagePath = await resolveStorageRoot(targetPathInput);

  return withStorageLock(storagePath, `merge:${relativePath}`, async () => {
    await recoverIncompleteTransactions(storagePath);

    const state = await readState(targetPathInput);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    const snapshotFile = manifest.files.find((file) => file.path === relativePath);

    if (!snapshotFile) {
      throw new Error(`Không tìm thấy file trong snapshot để merge: ${relativePath}`);
    }

    const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);
    const snapshotBuffer = await readSnapshotFileBuffer(state.storagePath, manifest.snapshotId, relativePath);
    const oursBuffer = await readBufferIfExists(liveFilePath);

    if (snapshotFile.isBinary || (oursBuffer && oursBuffer.includes(0))) {
      const mergeResult = buildBinaryMergeResult(relativePath, strategy, oursBuffer, snapshotBuffer);

      if (strategy === "theirs") {
        await runInTransaction(state.storagePath, `merge:${relativePath}`, async (transaction) => {
          await backupFileForTransaction(state.storagePath, transaction, liveFilePath);
          await mkdir(path.dirname(liveFilePath), { recursive: true });
          await atomicWriteFile(liveFilePath, snapshotBuffer);
        });
      }

      await appendReflogEntry(state.storagePath, {
        action: "merge",
        fromSnapshotId: state.activeSnapshotId,
        toSnapshotId: state.activeSnapshotId,
        reason: `merge file ${relativePath}`,
        filesAffected: 1,
        metadata: {
          strategy,
          status: mergeResult.status,
        },
      });

      return mergeResult;
    }

    const baseContent = snapshotBuffer.toString("utf8");
    const oursContent = oursBuffer ? oursBuffer.toString("utf8") : null;
    const mergeResult = threeWayMerge(relativePath, baseContent, oursContent, baseContent, {
      strategy,
      conflictOnDivergence: true,
    });

    await runInTransaction(state.storagePath, `merge:${relativePath}`, async (transaction) => {
      await backupFileForTransaction(state.storagePath, transaction, liveFilePath);
      await applyMergedContent(state.targetPath, relativePath, mergeResult.merged);
    });

    await appendReflogEntry(state.storagePath, {
      action: "merge",
      fromSnapshotId: state.activeSnapshotId,
      toSnapshotId: state.activeSnapshotId,
      reason: `merge file ${relativePath}`,
      filesAffected: 1,
      metadata: {
        strategy,
        status: mergeResult.status,
      },
    });

    return mergeResult;
  });
}

export function resolveSnapshotFile(manifestFiles: SnapshotFileEntry[], relativePath: string): SnapshotFileEntry | undefined {
  return manifestFiles.find((file) => file.path === relativePath);
}
