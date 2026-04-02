import { readdir } from "node:fs/promises";
import path from "node:path";

import type { SnapshotChain, SnapshotManifest } from "../types.js";
import { readSnapshotFileBuffer } from "./delta.js";
import { readManifest } from "./state.js";

export interface SnapshotDiffEntry {
  path: string;
  type: "added" | "modified" | "deleted";
  insertions?: number;
  deletions?: number;
  changeCount?: number;
}

export async function listSnapshotManifests(storagePath: string): Promise<SnapshotManifest[]> {
  const snapshotsRoot = path.join(storagePath, "snapshots");

  try {
    const entries = await readdir(snapshotsRoot, { withFileTypes: true });
    const results = await Promise.allSettled(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readManifest(storagePath, entry.name)),
    );

    // Chỉ giữ lại manifest đọc thành công, skip snapshot hỏng (thiếu manifest.json)
    const manifests = results
      .filter((result): result is PromiseFulfilledResult<SnapshotManifest> => result.status === "fulfilled")
      .map((result) => result.value);

    return manifests.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function buildSnapshotChain(storagePath: string): Promise<SnapshotChain[]> {
  const manifests = await listSnapshotManifests(storagePath);
  const childrenMap = new Map<string, string[]>();

  for (const manifest of manifests) {
    if (!manifest.parentSnapshotId) {
      continue;
    }

    const children = childrenMap.get(manifest.parentSnapshotId) ?? [];
    children.push(manifest.snapshotId);
    childrenMap.set(manifest.parentSnapshotId, children);
  }

  return manifests.map((manifest) => ({
    snapshotId: manifest.snapshotId,
    parentSnapshotId: manifest.parentSnapshotId ?? null,
    childSnapshotIds: childrenMap.get(manifest.snapshotId) ?? [],
    createdAt: manifest.createdAt,
    summary: manifest.summary,
  }));
}

export async function getSnapshotManifestById(storagePath: string, snapshotId: string): Promise<SnapshotManifest> {
  return readManifest(storagePath, snapshotId);
}

export async function findSnapshotByTimestamp(storagePath: string, timestamp: string): Promise<SnapshotManifest | null> {
  const manifests = await listSnapshotManifests(storagePath);
  const targetTime = Date.parse(timestamp);

  if (Number.isNaN(targetTime)) {
    throw new Error(`Timestamp không hợp lệ: ${timestamp}`);
  }

  let bestMatch: SnapshotManifest | null = null;

  for (const manifest of manifests) {
    const manifestTime = Date.parse(manifest.createdAt);

    if (manifestTime <= targetTime && (!bestMatch || manifestTime > Date.parse(bestMatch.createdAt))) {
      bestMatch = manifest;
    }
  }

  return bestMatch;
}

export async function getSnapshotFileContent(storagePath: string, snapshotId: string, relativePath: string): Promise<string> {
  return (await readSnapshotFileBuffer(storagePath, snapshotId, relativePath)).toString("utf8");
}

export function diffSnapshotManifests(previous: SnapshotManifest, next: SnapshotManifest): SnapshotDiffEntry[] {
  const previousMap = new Map(previous.files.map((file) => [file.path, file]));
  const nextMap = new Map(next.files.map((file) => [file.path, file]));
  const diffs: SnapshotDiffEntry[] = [];

  for (const file of previous.files) {
    const current = nextMap.get(file.path);

    if (!current) {
      diffs.push({ path: file.path, type: "deleted" });
      continue;
    }

    if (current.hash !== file.hash) {
      diffs.push({ path: file.path, type: "modified" });
    }
  }

  for (const file of next.files) {
    if (!previousMap.has(file.path)) {
      diffs.push({ path: file.path, type: "added" });
    }
  }

  return diffs.sort((left, right) => left.path.localeCompare(right.path));
}

export function renderSnapshotGraph(nodes: SnapshotChain[], activeSnapshotId?: string): string {
  const nodeMap = new Map(nodes.map((node) => [node.snapshotId, node]));
  const roots = nodes.filter((node) => !node.parentSnapshotId);
  const lines: string[] = [];

  function walk(node: SnapshotChain, prefix: string): void {
    const marker = node.snapshotId === activeSnapshotId ? "*" : "o";
    lines.push(`${prefix}${marker} ${node.snapshotId}${node.summary ? ` ${node.summary}` : ""}`);
    const children = [...node.childSnapshotIds].sort((left, right) => left.localeCompare(right));

    for (const childId of children) {
      const child = nodeMap.get(childId);

      if (!child) {
        continue;
      }

      walk(child, `${prefix}  `);
    }
  }

  for (const root of roots.sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    walk(root, "");
  }

  return lines.join("\n");
}
