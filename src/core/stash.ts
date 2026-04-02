import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createPatch } from "diff";

import type { StashEntry } from "../types.js";
import { getChanges } from "./compare.js";
import { readSnapshotFileBuffer } from "./delta.js";
import { applyPatchToWorkspace } from "./patch.js";
import { resolveTrackedPath } from "./snapshot.js";
import { readManifest, readState } from "./state.js";
import { atomicWriteFile } from "./transaction.js";

function getStashFilePath(storagePath: string): string {
  return path.join(storagePath, ".stashes.json");
}

async function readWorkspaceText(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function readStashes(storagePath: string): Promise<StashEntry[]> {
  try {
    const content = await readFile(getStashFilePath(storagePath), "utf8");
    return JSON.parse(content) as StashEntry[];
  } catch {
    return [];
  }
}

async function writeStashes(storagePath: string, stashes: StashEntry[]): Promise<void> {
  await atomicWriteFile(getStashFilePath(storagePath), `${JSON.stringify(stashes, null, 2)}\n`);
}

function buildStats(patchText: string): StashEntry["stats"] {
  return patchText.split(/\r?\n/).reduce(
    (stats, line) => {
      if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
        return stats;
      }

      if (line.startsWith("+")) {
        stats.insertions += 1;
      }

      if (line.startsWith("-")) {
        stats.deletions += 1;
      }

      return stats;
    },
    { filesAffected: 0, insertions: 0, deletions: 0 },
  );
}

export async function listStashes(targetPath: string): Promise<StashEntry[]> {
  const state = await readState(targetPath);
  return readStashes(state.storagePath);
}

export async function createStash(targetPath: string, message = "WIP"): Promise<StashEntry> {
  const state = await readState(targetPath);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const changes = await getChanges(targetPath);
  const patches: string[] = [];

  for (const change of changes) {
    if (change.isBinary) {
      continue;
    }

    const snapshotFile = manifest.files.find((file) => file.path === (change.oldPath ?? change.path));
    const beforeText = snapshotFile ? (await readSnapshotFileBuffer(state.storagePath, manifest.snapshotId, snapshotFile.path)).toString("utf8") : "";
    const workspaceText = change.afterAbsolutePath ? await readWorkspaceText(change.afterAbsolutePath) : "";

    if (beforeText !== workspaceText) {
      patches.push(createPatch(change.path, beforeText, workspaceText, `a/${change.path}`, `b/${change.path}`));
    }
  }

  const patchText = patches.join("\n");
  const stats = buildStats(patchText);
  stats.filesAffected = patches.length;
  const stash: StashEntry = {
    stashId: randomUUID(),
    message,
    createdAt: new Date().toISOString(),
    baseSnapshotId: state.activeSnapshotId,
    patch: patchText,
    stats,
  };
  const stashes = await readStashes(state.storagePath);
  await writeStashes(state.storagePath, [stash, ...stashes]);
  return stash;
}

export async function getStash(targetPath: string, stashId?: string): Promise<StashEntry | null> {
  const stashes = await listStashes(targetPath);

  if (!stashId) {
    return stashes[0] ?? null;
  }

  return stashes.find((stash) => stash.stashId === stashId) ?? null;
}

export async function applyStash(targetPath: string, stashId?: string, removeAfterApply = false): Promise<{ appliedFiles: string[]; conflicts: string[]; removed: boolean }> {
  const state = await readState(targetPath);
  const stash = await getStash(targetPath, stashId);

  if (!stash) {
    throw new Error("Không tìm thấy stash.");
  }

  const result = await applyPatchToWorkspace(targetPath, stash.patch, { threeWay: true });

  if (removeAfterApply && result.conflicts.length === 0) {
    const stashes = await readStashes(state.storagePath);
    await writeStashes(state.storagePath, stashes.filter((entry) => entry.stashId !== stash.stashId));
    return {
      ...result,
      removed: true,
    };
  }

  return {
    ...result,
    removed: false,
  };
}

export async function dropStash(targetPath: string, stashId?: string): Promise<void> {
  const state = await readState(targetPath);
  const stash = await getStash(targetPath, stashId);

  if (!stash) {
    throw new Error("Không tìm thấy stash.");
  }

  const stashes = await readStashes(state.storagePath);
  await writeStashes(state.storagePath, stashes.filter((entry) => entry.stashId !== stash.stashId));
}

export async function clearStashes(targetPath: string): Promise<void> {
  const state = await readState(targetPath);
  await writeStashes(state.storagePath, []);
}
