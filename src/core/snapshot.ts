import { mkdir, readFile, realpath, rm, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { detectBinaryContentInfo } from "./binary-detector.js";
import { detectFilesystemConfig } from "./case-sensitivity.js";
import { computeDelta, getDeltaFilePath, readSnapshotFileBuffer } from "./delta.js";
import { createMetadataCache, getMetadataCachePath, METADATA_CACHE_VERSION, readMetadataCache, scanCurrentFilesWithCache, writeMetadataCache } from "./incremental-scan.js";
import { DEFAULT_IGNORE_RULES, loadIgnoreRules } from "./ignore.js";
import { withStorageLock } from "./lock.js";
import { appendReflogEntry } from "./reflog.js";
import { filterSparseFiles } from "./shallow.js";
import { getSnapshotRoot, getStateFilePath, readManifest, readStateIfExists, resolveStorageRoot, writeManifest, writeState } from "./state.js";
import { atomicWriteFile, backupFileForTransaction, recordDeleteDirectory, recoverIncompleteTransactions, runInTransaction } from "./transaction.js";
import type { CurrentFileEntry, SnapshotFileEntry, SnapshotManifest, TrackState } from "../types.js";

export async function normalizeTargetPath(inputPath: string): Promise<string> {
  const absolutePath = path.resolve(inputPath);
  const realTargetPath = await realpath(absolutePath);
  const targetStats = await stat(realTargetPath);

  if (!targetStats.isDirectory()) {
    throw new Error(`Đường dẫn không phải thư mục: ${inputPath}`);
  }

  return realTargetPath;
}

export function resolveTrackedPath(targetPath: string, relativePath: string): string {
  const normalizedRelativePath = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  const resolvedPath = path.resolve(targetPath, normalizedRelativePath);
  const relativeToTarget = path.relative(targetPath, resolvedPath);

  if (relativeToTarget.startsWith("..") || path.isAbsolute(relativeToTarget)) {
    throw new Error(`Path nam ngoai --path: ${relativePath}`);
  }

  return resolvedPath;
}

export function createSnapshotId(): string {
  return randomUUID();
}

export function hashBuffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function detectBinaryContent(content: Buffer): boolean {
  return detectBinaryContentInfo("unknown", content).isBinary;
}

export async function scanCurrentFiles(targetPath: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<CurrentFileEntry[]> {
  const storagePath = await resolveStorageRoot(targetPath);
  const metadataCache = await readMetadataCache(storagePath);
  const state = await readStateIfExists(targetPath);
  return filterSparseFiles(await scanCurrentFilesWithCache(targetPath, metadataCache, ignoreRules), state?.shallowConfig);
}

function toSnapshotFileEntries(files: CurrentFileEntry[]): SnapshotFileEntry[] {
  return files.map((file) => ({
    path: file.path,
    hash: file.hash,
    size: file.size,
    mtimeMs: file.mtimeMs,
    isBinary: file.isBinary,
    inode: file.inode,
    uid: file.uid,
    gid: file.gid,
    mode: file.mode,
  }));
}

function calculateSnapshotChecksum(snapshotFiles: SnapshotFileEntry[]): string {
  const digest = createHash("sha256");

  for (const file of [...snapshotFiles].sort((left, right) => left.path.localeCompare(right.path))) {
    digest.update(file.path);
    digest.update(file.hash);
  }

  return digest.digest("hex");
}

async function createSnapshotInternal(
  targetPath: string,
  mergedIgnoreRules: string[],
  storagePath: string,
  action: "create" | "reset",
): Promise<TrackState> {
  const snapshotId = createSnapshotId();
  const timestamp = new Date().toISOString();
  const snapshotRoot = getSnapshotRoot(storagePath, snapshotId);
  const snapshotFilesRoot = path.join(snapshotRoot, "files");
  const metadataCachePath = getMetadataCachePath(storagePath);
  const existingState = await readStateIfExists(targetPath);
  const parentSnapshotId = existingState?.activeSnapshotId ?? null;
  const parentManifest = parentSnapshotId ? await readManifest(storagePath, parentSnapshotId) : null;
  const parentFiles = new Map(parentManifest?.files.map((file) => [file.path, file]) ?? []);
  const metadataCache = await readMetadataCache(storagePath);
  const currentFiles = filterSparseFiles(await scanCurrentFilesWithCache(targetPath, metadataCache, mergedIgnoreRules), existingState?.shallowConfig);
  const filesystemConfig = existingState?.filesystemConfig ?? (await detectFilesystemConfig(targetPath));

  const { result: state, transaction } = await runInTransaction(storagePath, `snapshot:${snapshotId}`, async (tx) => {
    await recordDeleteDirectory(storagePath, tx, snapshotRoot);
    await backupFileForTransaction(storagePath, tx, getStateFilePath(storagePath));
    await backupFileForTransaction(storagePath, tx, metadataCachePath);
    await mkdir(snapshotFilesRoot, { recursive: true });

    const snapshotFiles: SnapshotFileEntry[] = [];

    for (const file of currentFiles) {
      const parentFile = parentFiles.get(file.path);
      const baseEntry: SnapshotFileEntry = {
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
      };

      if (file.symlink) {
        if (parentSnapshotId && parentFile && parentFile.hash === file.hash) {
          snapshotFiles.push({
            ...baseEntry,
            storageKind: "reference",
            baseSnapshotId: parentSnapshotId,
          });
        } else {
          snapshotFiles.push({
            ...baseEntry,
            storageKind: "symlink",
          });
        }

        continue;
      }

      if (parentSnapshotId && parentFile) {
        if (parentFile.hash === file.hash) {
          snapshotFiles.push({
            ...baseEntry,
            storageKind: "reference",
            baseSnapshotId: parentSnapshotId,
          });
          continue;
        }

        if (!file.isBinary && !parentFile.isBinary) {
          const previousText = (await readSnapshotFileBuffer(storagePath, parentSnapshotId, file.path)).toString("utf8");
          const currentText = (file.content ?? await readFile(file.absolutePath)).toString("utf8");
          const deltaBuffer = computeDelta(file.path, previousText, currentText);
          const currentSize = Buffer.byteLength(currentText, "utf8");

          if (deltaBuffer.length < currentSize) {
            const deltaAbsolutePath = getDeltaFilePath(storagePath, snapshotId, file.path);
            const relativeDeltaPath = path.relative(storagePath, deltaAbsolutePath).replaceAll(path.sep, "/");
            await atomicWriteFile(deltaAbsolutePath, deltaBuffer);
            snapshotFiles.push({
              ...baseEntry,
              storageKind: "delta",
              baseSnapshotId: parentSnapshotId,
              deltaPath: relativeDeltaPath,
              compressedSize: deltaBuffer.length,
              uncompressedSize: currentSize,
            });
            continue;
          }
        }
      }

      const destinationPath = path.join(snapshotFilesRoot, file.path);
      await mkdir(path.dirname(destinationPath), { recursive: true });
      // Dùng buffer đã hash để snapshot khớp tuyệt đối với manifest nếu file đổi giữa scan và ghi.
      await atomicWriteFile(destinationPath, file.content ?? await readFile(file.absolutePath));
      snapshotFiles.push({
        ...baseEntry,
        storageKind: "full",
      });
    }

    const manifest: SnapshotManifest = {
      snapshotId,
      parentSnapshotId,
      createdAt: timestamp,
      targetPath,
      ignoreRules: [...mergedIgnoreRules],
      files: snapshotFiles,
      metadata: {
        scannedAt: timestamp,
        osType: process.platform,
        filesMetadata: Object.fromEntries(snapshotFiles.map((file) => [file.path, { ...file }])),
      },
      lastTransactionId: tx.transactionId,
      author: process.env.USER || process.env.USERNAME || "system",
      summary: action === "reset" ? "Reset snapshot" : "Create snapshot",
      tags: [],
      checksum: calculateSnapshotChecksum(snapshotFiles),
    };

    const state: TrackState = {
      activeSnapshotId: snapshotId,
      targetPath,
      storagePath,
      updatedAt: timestamp,
      metadataCacheVersion: METADATA_CACHE_VERSION,
      lastTransactionId: tx.transactionId,
      previousSnapshotId: parentSnapshotId ?? undefined,
      snapshotHistory: [snapshotId, ...(existingState?.snapshotHistory ?? (parentSnapshotId ? [parentSnapshotId] : []))],
      filesystemConfig,
      shallowConfig: existingState?.shallowConfig,
    };

    await writeManifest(storagePath, manifest);
    await writeState(state);
    await writeMetadataCache(storagePath, createMetadataCache(targetPath, currentFiles));

    return state;
  });

  if (state.lastTransactionId !== transaction.transactionId) {
    throw new Error(`Transaction mismatch khi tạo snapshot: ${snapshotId}`);
  }

  await appendReflogEntry(storagePath, {
    action,
    fromSnapshotId: parentSnapshotId ?? undefined,
    toSnapshotId: snapshotId,
    author: process.env.USER || process.env.USERNAME || "system",
    filesAffected: currentFiles.length,
    reason: action === "reset" ? "user reset snapshot" : "create snapshot",
  });

  return state;
}

export async function createSnapshot(targetPathInput: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<TrackState> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  const mergedIgnoreRules = ignoreRules === DEFAULT_IGNORE_RULES ? await loadIgnoreRules(targetPath) : ignoreRules;
  const storagePath = await resolveStorageRoot(targetPath);

  await recoverIncompleteTransactions(storagePath);

  return withStorageLock(storagePath, "create-snapshot", async () => {
    return createSnapshotInternal(targetPath, mergedIgnoreRules, storagePath, "create");
  });
}

export async function ensureSnapshot(targetPathInput: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<TrackState> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  const mergedIgnoreRules = ignoreRules === DEFAULT_IGNORE_RULES ? await loadIgnoreRules(targetPath) : ignoreRules;
  const storagePath = await resolveStorageRoot(targetPath);

  await recoverIncompleteTransactions(storagePath);

  return withStorageLock(storagePath, "ensure-snapshot", async () => {
    const existingState = await readStateIfExists(targetPath);

    if (existingState) {
      return existingState;
    }

    return createSnapshotInternal(targetPath, mergedIgnoreRules, storagePath, "create");
  });
}

export async function resetSnapshot(targetPathInput: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<TrackState> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  const mergedIgnoreRules = ignoreRules === DEFAULT_IGNORE_RULES ? await loadIgnoreRules(targetPath) : ignoreRules;
  const storagePath = await resolveStorageRoot(targetPath);

  await recoverIncompleteTransactions(storagePath);

  return withStorageLock(storagePath, "reset-snapshot", async () => {
    return createSnapshotInternal(targetPath, mergedIgnoreRules, storagePath, "reset");
  });
}
