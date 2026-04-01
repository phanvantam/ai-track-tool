import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SnapshotManifest, TrackState } from "../types.js";

export function getStorageRoot(targetPath: string): string {
  return path.join(targetPath, ".ai-track");
}

export function getStateFilePath(targetPath: string): string {
  return path.join(getStorageRoot(targetPath), "state.json");
}

export function getSnapshotRoot(targetPath: string, snapshotId: string): string {
  return path.join(getStorageRoot(targetPath), "snapshots", snapshotId);
}

export async function writeState(targetPath: string, state: TrackState): Promise<void> {
  const stateFilePath = getStateFilePath(targetPath);
  await mkdir(path.dirname(stateFilePath), { recursive: true });
  await writeFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readState(targetPath: string): Promise<TrackState> {
  const stateFilePath = getStateFilePath(targetPath);
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
    await access(getStateFilePath(targetPath));
    return true;
  } catch {
    return false;
  }
}

export async function writeManifest(targetPath: string, manifest: SnapshotManifest): Promise<void> {
  const manifestPath = path.join(getSnapshotRoot(targetPath, manifest.snapshotId), "manifest.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function readManifest(targetPath: string, snapshotId: string): Promise<SnapshotManifest> {
  const manifestPath = path.join(getSnapshotRoot(targetPath, snapshotId), "manifest.json");
  const content = await readFile(manifestPath, "utf8");
  return JSON.parse(content) as SnapshotManifest;
}
