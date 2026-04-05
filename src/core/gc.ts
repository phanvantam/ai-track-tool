import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import { readAppConfig } from "./config.js";
import { computeDelta, getDeltaFilePath, readSnapshotFileBuffer } from "./delta.js";
import { runFsck } from "./fsck.js";
import { getMetadataCachePath, readMetadataCache, writeMetadataCache } from "./incremental-scan.js";
import { withStorageLock } from "./lock.js";
import { appendReflogEntry } from "./reflog.js";
import { listSnapshotManifests } from "./snapshot-chain.js";
import { readManifest, readState, resolveStorageRoot, writeManifest } from "./state.js";
import type { SnapshotFileEntry, SnapshotManifest } from "../types.js";
import { atomicWriteFile, recoverIncompleteTransactions } from "./transaction.js";

interface GarbageCollectionOptions {
  dryRun?: boolean;
}

interface GarbageCollectionAction {
  type: "remove_snapshot" | "compact_metadata_cache" | "repair_snapshot" | "compress_snapshot" | "skip_delta";
  path?: string;
  details: string;
}

export interface GarbageCollectionReport {
  actions: GarbageCollectionAction[];
  removedSnapshots: string[];
  compactedMetadataEntries: number;
  repairedItems: number;
  dryRun: boolean;
}

interface SnapshotDirectoryEntry {
  snapshotId: string;
  createdAt: number;
}

async function getReachableSnapshotIds(storagePath: string, activeSnapshotId: string): Promise<Set<string>> {
  const reachableSnapshotIds = new Set<string>();
  let currentSnapshotId: string | undefined = activeSnapshotId;

  while (currentSnapshotId && !reachableSnapshotIds.has(currentSnapshotId)) {
    reachableSnapshotIds.add(currentSnapshotId);
    const manifest = await readManifest(storagePath, currentSnapshotId);
    currentSnapshotId = manifest.parentSnapshotId ?? undefined;
  }

  return reachableSnapshotIds;
}

function isOlderThanRetention(createdAt: string, retentionDays: number): boolean {
  if (retentionDays <= 0) {
    return true;
  }

  return Date.now() - Date.parse(createdAt) >= retentionDays * 24 * 60 * 60 * 1000;
}

function updateManifestMetadataFiles(manifest: SnapshotManifest, files: SnapshotFileEntry[]): SnapshotManifest {
  if (!manifest.metadata?.filesMetadata) {
    return {
      ...manifest,
      files,
    };
  }

  return {
    ...manifest,
    files,
    metadata: {
      ...manifest.metadata,
      filesMetadata: Object.fromEntries(files.map((file) => [file.path, { ...file }])),
    },
  };
}

async function compressSnapshotToDelta(
  storagePath: string,
  manifest: SnapshotManifest,
  options: { dryRun: boolean; manifestCache: Map<string, SnapshotManifest> },
): Promise<number> {
  if (!manifest.parentSnapshotId) {
    return 0;
  }

  const parentManifest = options.manifestCache.get(manifest.parentSnapshotId) ?? await readManifest(storagePath, manifest.parentSnapshotId);
  options.manifestCache.set(parentManifest.snapshotId, parentManifest);
  const parentFiles = new Map(parentManifest.files.map((file) => [file.path, file]));
  const nextFiles = [...manifest.files];
  let compressedFiles = 0;

  for (let index = 0; index < manifest.files.length; index += 1) {
    const file = manifest.files[index];

    if (file.storageKind === "delta" || file.storageKind === "reference" || file.storageKind === "symlink" || file.isBinary) {
      continue;
    }

    const parentFile = parentFiles.get(file.path);

    if (!parentFile || parentFile.isBinary || parentFile.symlink) {
      continue;
    }

    const snapshotFilePath = path.join(storagePath, "snapshots", manifest.snapshotId, "files", file.path);

    if (parentFile.hash === file.hash) {
      nextFiles[index] = {
        ...file,
        storageKind: "reference",
        baseSnapshotId: manifest.parentSnapshotId,
        deltaPath: undefined,
        compressedSize: undefined,
        uncompressedSize: undefined,
      };

      if (!options.dryRun) {
        await rm(snapshotFilePath, { force: true });
      }

      compressedFiles += 1;
      continue;
    }

    const currentText = await readSnapshotFileBuffer(storagePath, manifest.snapshotId, file.path, options.manifestCache).then((content) => content.toString("utf8"));
    const parentText = await readSnapshotFileBuffer(storagePath, manifest.parentSnapshotId, file.path, options.manifestCache).then((content) => content.toString("utf8"));
    const deltaBuffer = computeDelta(file.path, parentText, currentText);
    const currentSize = Buffer.byteLength(currentText, "utf8");

    if (deltaBuffer.length >= currentSize) {
      continue;
    }

    const deltaAbsolutePath = getDeltaFilePath(storagePath, manifest.snapshotId, file.path);
    const relativeDeltaPath = path.relative(storagePath, deltaAbsolutePath).replaceAll(path.sep, "/");

    nextFiles[index] = {
      ...file,
      storageKind: "delta",
      baseSnapshotId: manifest.parentSnapshotId,
      deltaPath: relativeDeltaPath,
      compressedSize: deltaBuffer.length,
      uncompressedSize: currentSize,
    };

    if (!options.dryRun) {
      await atomicWriteFile(deltaAbsolutePath, deltaBuffer);
      await rm(snapshotFilePath, { force: true });
    }

    compressedFiles += 1;
  }

  if (compressedFiles > 0 && !options.dryRun) {
    const nextManifest = updateManifestMetadataFiles(manifest, nextFiles);
    await writeManifest(storagePath, nextManifest);
    options.manifestCache.set(manifest.snapshotId, nextManifest);
  }

  return compressedFiles;
}

async function readSnapshotDirectories(storagePath: string): Promise<SnapshotDirectoryEntry[]> {
  const snapshotsRoot = path.join(storagePath, "snapshots");

  try {
    const entries = await readdir(snapshotsRoot, { withFileTypes: true });
    const snapshots = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const snapshotId = entry.name;
          const manifestPath = path.join(snapshotsRoot, snapshotId, "manifest.json");

          try {
            const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { createdAt?: string };
            return {
              snapshotId,
              createdAt: manifest.createdAt ? Date.parse(manifest.createdAt) : 0,
            };
          } catch {
            const stats = await stat(path.join(snapshotsRoot, snapshotId));
            return {
              snapshotId,
              createdAt: stats.mtimeMs,
            };
          }
        }),
    );

    return snapshots.sort((left, right) => right.createdAt - left.createdAt);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function runGarbageCollection(
  targetPathInput: string,
  options: GarbageCollectionOptions = {},
): Promise<GarbageCollectionReport> {
  const config = await readAppConfig();
  const storagePath = await resolveStorageRoot(targetPathInput);

  if (!config.gc.enabled) {
    return {
      actions: [{
        type: "skip_delta",
        details: "GC đang bị tắt trong config.",
      }],
      removedSnapshots: [],
      compactedMetadataEntries: 0,
      repairedItems: 0,
      dryRun: options.dryRun ?? false,
    };
  }

  return withStorageLock(storagePath, "gc", async () => {
    await recoverIncompleteTransactions(storagePath);

    const state = await readState(targetPathInput);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    const report: GarbageCollectionReport = {
      actions: [],
      removedSnapshots: [],
      compactedMetadataEntries: 0,
      repairedItems: 0,
      dryRun: options.dryRun ?? false,
    };
    const snapshots = await readSnapshotDirectories(state.storagePath);
    const reachableSnapshotIds = await getReachableSnapshotIds(state.storagePath, state.activeSnapshotId);
    const manifestCache = new Map<string, SnapshotManifest>();
    const reachableManifests = (await listSnapshotManifests(state.storagePath))
      .filter((currentManifest) => reachableSnapshotIds.has(currentManifest.snapshotId));

    for (const currentManifest of reachableManifests) {
      manifestCache.set(currentManifest.snapshotId, currentManifest);
    }

    const keepLimit = Math.max(1, config.gc.maxFullCopies);
    const keepFullSnapshotIds = new Set(reachableManifests.slice(0, keepLimit).map((currentManifest) => currentManifest.snapshotId));
    keepFullSnapshotIds.add(state.activeSnapshotId);
    const snapshotsToRemove = snapshots.filter((snapshot) => !reachableSnapshotIds.has(snapshot.snapshotId));

    for (const snapshot of snapshotsToRemove) {
      const snapshotPath = path.join(state.storagePath, "snapshots", snapshot.snapshotId);
      report.actions.push({
        type: "remove_snapshot",
        path: snapshot.snapshotId,
        details: `Xóa snapshot mồ côi ngoài history: ${snapshot.snapshotId}`,
      });

      if (!report.dryRun) {
        await rm(snapshotPath, { recursive: true, force: true });
        report.removedSnapshots.push(snapshot.snapshotId);
      }
    }

    const fsckReport = await runFsck(targetPathInput, { repair: !report.dryRun });
    const repairableErrors = fsckReport.errors.filter((error) => error.type === "missing_file" || error.type === "orphan_file");

    if (repairableErrors.length > 0) {
      report.actions.push({
        type: "repair_snapshot",
        details: report.dryRun
          ? `Sẽ sửa ${repairableErrors.length} orphan/missing entries trong snapshot active`
          : `Đã sửa ${repairableErrors.filter((error) => error.repaired).length} orphan/missing entries trong snapshot active`,
      });

      if (!report.dryRun) {
        report.repairedItems += repairableErrors.filter((error) => error.repaired).length;
      }
    }

    for (const currentManifest of reachableManifests) {
      if (keepFullSnapshotIds.has(currentManifest.snapshotId) || !isOlderThanRetention(currentManifest.createdAt, config.gc.retentionDays)) {
        continue;
      }

      try {
        const compressedFiles = await compressSnapshotToDelta(state.storagePath, currentManifest, {
          dryRun: report.dryRun,
          manifestCache,
        });

        if (compressedFiles > 0) {
          report.actions.push({
            type: "compress_snapshot",
            path: currentManifest.snapshotId,
            details: report.dryRun
              ? `Sẽ nén ${compressedFiles} file trong snapshot ${currentManifest.snapshotId} sang delta/reference`
              : `Đã nén ${compressedFiles} file trong snapshot ${currentManifest.snapshotId} sang delta/reference`,
          });
        }
      } catch (error) {
        report.actions.push({
          type: "skip_delta",
          path: currentManifest.snapshotId,
          details: `Bỏ qua nén snapshot ${currentManifest.snapshotId}: ${(error as Error).message}`,
        });
      }
    }

    const cache = await readMetadataCache(state.storagePath);

    if (cache) {
      const validPaths = new Set(manifest.files.map((file) => file.path));
      const compactedEntries = Object.fromEntries(Object.entries(cache.files).filter(([filePath]) => validPaths.has(filePath)));
      const removedEntries = Object.keys(cache.files).length - Object.keys(compactedEntries).length;

      if (removedEntries > 0) {
        report.actions.push({
          type: "compact_metadata_cache",
          path: getMetadataCachePath(state.storagePath),
          details: report.dryRun
            ? `Sẽ loại bỏ ${removedEntries} metadata entries cũ`
            : `Đã loại bỏ ${removedEntries} metadata entries cũ`,
        });

        if (!report.dryRun) {
          await writeMetadataCache(state.storagePath, {
            ...cache,
            scannedAt: new Date().toISOString(),
            files: compactedEntries,
          });
          report.compactedMetadataEntries = removedEntries;
        }
      }
    }

    if (!report.actions.some((action) => action.type === "compress_snapshot")) {
      report.actions.push({
        type: "skip_delta",
        details: "Không có snapshot cũ nào phù hợp để nén delta.",
      });
    }

    if (!report.dryRun && report.actions.length > 0) {
      await appendReflogEntry(state.storagePath, {
        action: "gc",
        toSnapshotId: state.activeSnapshotId,
        reason: "run garbage collection",
        metadata: {
          removedSnapshots: String(report.removedSnapshots.length),
          repairedItems: String(report.repairedItems),
        },
      });
    }

    return report;
  });
}
