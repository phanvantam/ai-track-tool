import { copyFile, mkdir, readdir, readFile, realpath, rm, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { DEFAULT_IGNORE_RULES, shouldIgnorePath } from "./ignore.js";
import { getStorageRoot, getSnapshotRoot, readStateIfExists, writeManifest, writeState } from "./state.js";
import type { CurrentFileEntry, SnapshotFileEntry, SnapshotManifest, TrackState } from "../types.js";

export async function normalizeTargetPath(inputPath: string): Promise<string> {
  const absolutePath = path.resolve(inputPath);
  const realTargetPath = await realpath(absolutePath);
  const targetStats = await stat(realTargetPath);

  if (!targetStats.isDirectory()) {
    throw new Error(`Duong dan khong phai thu muc: ${inputPath}`);
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
  if (content.length === 0) {
    return false;
  }

  const sampleSize = Math.min(content.length, 8000);

  for (let index = 0; index < sampleSize; index += 1) {
    if (content[index] === 0) {
      return true;
    }
  }

  return false;
}

async function collectFilesRecursive(targetPath: string, currentPath: string, ignoreRules: string[]): Promise<CurrentFileEntry[]> {
  const directoryEntries = await readdir(currentPath, { withFileTypes: true });
  const files: CurrentFileEntry[] = [];

  for (const entry of directoryEntries) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(targetPath, absolutePath).replaceAll(path.sep, "/");

    if (shouldIgnorePath(relativePath, ignoreRules)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursive(targetPath, absolutePath, ignoreRules)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const content = await readFile(absolutePath);
    const fileStats = await stat(absolutePath);

    files.push({
      path: relativePath,
      absolutePath,
      hash: hashBuffer(content),
      size: fileStats.size,
      mtimeMs: fileStats.mtimeMs,
      isBinary: detectBinaryContent(content),
    });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function scanCurrentFiles(targetPath: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<CurrentFileEntry[]> {
  return collectFilesRecursive(targetPath, targetPath, ignoreRules);
}

function toSnapshotFileEntries(files: CurrentFileEntry[]): SnapshotFileEntry[] {
  return files.map((file) => ({
    path: file.path,
    hash: file.hash,
    size: file.size,
    mtimeMs: file.mtimeMs,
    isBinary: file.isBinary,
  }));
}

export async function createSnapshot(targetPathInput: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<TrackState> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  const snapshotId = createSnapshotId();
  const currentFiles = await scanCurrentFiles(targetPath, ignoreRules);
  const snapshotRoot = getSnapshotRoot(targetPath, snapshotId);
  const snapshotFilesRoot = path.join(snapshotRoot, "files");

  await mkdir(snapshotFilesRoot, { recursive: true });

  for (const file of currentFiles) {
    const destinationPath = path.join(snapshotFilesRoot, file.path);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await copyFile(file.absolutePath, destinationPath);
  }

  const manifest: SnapshotManifest = {
    snapshotId,
    createdAt: new Date().toISOString(),
    targetPath,
    ignoreRules: [...ignoreRules],
    files: toSnapshotFileEntries(currentFiles),
  };

  const state: TrackState = {
    activeSnapshotId: snapshotId,
    targetPath,
    storagePath: path.join(targetPath, ".ai-track"),
    updatedAt: new Date().toISOString(),
  };

  await writeManifest(targetPath, manifest);
  await writeState(targetPath, state);

  return state;
}

export async function ensureSnapshot(targetPathInput: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<TrackState> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  const existingState = await readStateIfExists(targetPath);

  if (existingState) {
    return existingState;
  }

  return createSnapshot(targetPath, ignoreRules);
}

export async function resetSnapshot(targetPathInput: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): Promise<TrackState> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  const existingState = await readStateIfExists(targetPath);

  if (existingState) {
    await rm(getSnapshotRoot(targetPath, existingState.activeSnapshotId), { recursive: true, force: true });
    await mkdir(getStorageRoot(targetPath), { recursive: true });
  }

  return createSnapshot(targetPath, ignoreRules);
}
