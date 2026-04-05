import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { applyPatch, createPatch } from "diff";

import type { SnapshotFileEntry, SnapshotManifest } from "../types.js";
import { listSnapshotManifests } from "./snapshot-chain.js";
import { readManifest } from "./state.js";
import { atomicWriteFile } from "./transaction.js";

function hashBuffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function getSnapshotFilePath(storagePath: string, snapshotId: string, relativePath: string): string {
  return path.join(storagePath, "snapshots", snapshotId, "files", relativePath);
}

export function getDeltaRoot(storagePath: string): string {
  return path.join(storagePath, "deltas");
}

export function getDeltaFilePath(storagePath: string, snapshotId: string, relativePath: string): string {
  return path.join(getDeltaRoot(storagePath), snapshotId, `${relativePath}.patch`);
}

function getMaterializedFilePath(storagePath: string, snapshotId: string, relativePath: string): string {
  return path.join(storagePath, "materialized", snapshotId, relativePath);
}

export function computeDelta(filePath: string, sourceText: string, targetText: string): Buffer {
  return Buffer.from(createPatch(filePath, sourceText, targetText, "snapshot", "current"), "utf8");
}

export function applyDelta(sourceText: string, deltaBuffer: Buffer): Buffer {
  const patchText = deltaBuffer.toString("utf8");
  const applied = applyPatch(sourceText, patchText);

  if (applied === false) {
    throw new Error("Không apply được delta patch.");
  }

  return Buffer.from(applied, "utf8");
}

async function getManifestCached(
  storagePath: string,
  snapshotId: string,
  cache: Map<string, SnapshotManifest>,
): Promise<SnapshotManifest> {
  const cached = cache.get(snapshotId);

  if (cached) {
    return cached;
  }

  const manifest = await readManifest(storagePath, snapshotId);
  cache.set(snapshotId, manifest);
  return manifest;
}

async function readSnapshotFileBufferFromEntry(
  storagePath: string,
  manifest: SnapshotManifest,
  file: SnapshotFileEntry,
  cache: Map<string, SnapshotManifest>,
): Promise<Buffer> {
  if (file.storageKind === "symlink") {
    return Buffer.from(file.symlink?.target ?? "", "utf8");
  }

  if (file.storageKind === "reference") {
    if (!file.baseSnapshotId) {
      throw new Error(`Thiếu baseSnapshotId cho file reference: ${file.path}`);
    }

    return readSnapshotFileBuffer(storagePath, file.baseSnapshotId, file.path, cache);
  }

  if (file.storageKind === "delta") {
    if (!file.baseSnapshotId || !file.deltaPath) {
      throw new Error(`Thiếu metadata delta cho file: ${file.path}`);
    }

    const baseBuffer = await readSnapshotFileBuffer(storagePath, file.baseSnapshotId, file.path, cache);
    const deltaBuffer = await readFile(path.join(storagePath, file.deltaPath));
    return applyDelta(baseBuffer.toString("utf8"), deltaBuffer);
  }

  return readFile(getSnapshotFilePath(storagePath, manifest.snapshotId, file.path));
}

export async function readSnapshotFileBuffer(
  storagePath: string,
  snapshotId: string,
  relativePath: string,
  existingCache?: Map<string, SnapshotManifest>,
): Promise<Buffer> {
  const cache = existingCache ?? new Map<string, SnapshotManifest>();
  const manifest = await getManifestCached(storagePath, snapshotId, cache);
  const file = manifest.files.find((entry) => entry.path === relativePath);

  if (!file) {
    throw new Error(`Không tìm thấy file ${relativePath} trong snapshot ${snapshotId}`);
  }

  const content = await readSnapshotFileBufferFromEntry(storagePath, manifest, file, cache);

  if (hashBuffer(content) !== file.hash) {
    throw new Error(`Snapshot file không khớp hash sau khi reconstruct: ${relativePath}`);
  }

  return content;
}

export async function materializeSnapshotFile(storagePath: string, snapshotId: string, relativePath: string): Promise<string> {
  const materializedPath = getMaterializedFilePath(storagePath, snapshotId, relativePath);
  const content = await readSnapshotFileBuffer(storagePath, snapshotId, relativePath);
  await mkdir(path.dirname(materializedPath), { recursive: true });
  await atomicWriteFile(materializedPath, content);
  return materializedPath;
}

export async function getDeltaInfo(storagePath: string): Promise<{
  snapshots: number;
  deltaFiles: number;
  referenceFiles: number;
  fullFiles: number;
  deltaBytes: number;
  logicalBytes: number;
}> {
  const manifests = await listSnapshotManifests(storagePath);
  let deltaFiles = 0;
  let referenceFiles = 0;
  let fullFiles = 0;
  let deltaBytes = 0;
  let logicalBytes = 0;

  for (const manifest of manifests) {
    for (const file of manifest.files) {
      logicalBytes += file.size;

      if (file.storageKind === "delta") {
        deltaFiles += 1;
        deltaBytes += file.compressedSize ?? 0;
        continue;
      }

      if (file.storageKind === "reference") {
        referenceFiles += 1;
        continue;
      }

      fullFiles += 1;
      deltaBytes += file.size;
    }
  }

  return {
    snapshots: manifests.length,
    deltaFiles,
    referenceFiles,
    fullFiles,
    deltaBytes,
    logicalBytes,
  };
}
