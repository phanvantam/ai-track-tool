import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { getEffectiveStorageBaseDir, getLegacyStorageRoot, getManagedStorageRoot, readAppConfig } from "./config.js";
import { isLockInfoActive, readLockInfo, releaseLock } from "./lock.js";
import { atomicWriteFile, recoverIncompleteTransactions } from "./transaction.js";
import type { SnapshotManifest, TrackState } from "../types.js";

export async function resolveStorageRoot(targetPath: string): Promise<string> {
  const normalizedTargetPath = await normalizeStorageTargetPath(targetPath);
  const config = await readAppConfig();
  const configuredStorageRoot = getManagedStorageRoot(getEffectiveStorageBaseDir(config), normalizedTargetPath);

  if (await hasStateAtStorage(configuredStorageRoot)) {
    return configuredStorageRoot;
  }

  const legacyStorageRoot = getLegacyStorageRoot(normalizedTargetPath);

  if (await hasStateAtStorage(legacyStorageRoot)) {
    return legacyStorageRoot;
  }

  return configuredStorageRoot;
}

async function normalizeStorageTargetPath(targetPath: string): Promise<string> {
  try {
    return await realpath(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

export function getStateFilePath(storagePath: string): string {
  return path.join(storagePath, "state.json");
}

export function getSnapshotRoot(storagePath: string, snapshotId: string): string {
  return path.join(storagePath, "snapshots", snapshotId);
}

export async function writeState(state: TrackState): Promise<void> {
  const stateFilePath = getStateFilePath(state.storagePath);
  await atomicWriteFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`);
}

export async function readState(targetPath: string): Promise<TrackState> {
  const storagePath = await resolveStorageRoot(targetPath);
  const lockInfo = await readLockInfo(storagePath);

  if (!isLockInfoActive(lockInfo)) {
    if (lockInfo) {
      await releaseLock(storagePath, lockInfo.lockId);
    }

    await recoverIncompleteTransactions(storagePath);
  }

  const stateFilePath = getStateFilePath(storagePath);
  const content = await readFile(stateFilePath, "utf8");
  return JSON.parse(content) as TrackState;
}

export async function readStateIfExists(targetPath: string): Promise<TrackState | null> {
  try {
    return await readState(targetPath);
  } catch {
    return null;
  }
}

export async function hasState(targetPath: string): Promise<boolean> {
  try {
    await access(getStateFilePath(await resolveStorageRoot(targetPath)));
    return true;
  } catch {
    return false;
  }
}

export async function hasStateAtStorage(storagePath: string): Promise<boolean> {
  try {
    await access(getStateFilePath(storagePath));
    return true;
  } catch {
    return false;
  }
}

export async function writeManifest(storagePath: string, manifest: SnapshotManifest): Promise<void> {
  const manifestPath = path.join(getSnapshotRoot(storagePath, manifest.snapshotId), "manifest.json");
  await atomicWriteFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export async function readManifest(storagePath: string, snapshotId: string): Promise<SnapshotManifest> {
  const manifestPath = path.join(getSnapshotRoot(storagePath, snapshotId), "manifest.json");
  const content = await readFile(manifestPath, "utf8");
  return JSON.parse(content) as SnapshotManifest;
}
