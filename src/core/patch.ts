import { readFile } from "node:fs/promises";
import path from "node:path";

import { applyPatch, createPatch, parsePatch } from "diff";

import type { PatchMetadata } from "../types.js";
import { getSnapshotFileContent, getSnapshotManifestById } from "./snapshot-chain.js";
import { readState } from "./state.js";
import { resolveTrackedPath } from "./snapshot.js";
import { threeWayMerge } from "./merge.js";
import { atomicWriteFile, backupFileForTransaction, runInTransaction } from "./transaction.js";
import { withStorageLock } from "./lock.js";

function stripPrefix(fileName: string): string {
  return fileName.replace(/^(a|b)\//, "");
}

function encodeMetadata(metadata: PatchMetadata): string {
  return `# ai-track-meta ${JSON.stringify(metadata)}`;
}

function decodeMetadata(patchText: string): { metadata: PatchMetadata | null; patchBody: string } {
  const lines = patchText.split(/\r?\n/);
  const firstLine = lines[0] ?? "";

  if (!firstLine.startsWith("# ai-track-meta ")) {
    return {
      metadata: null,
      patchBody: patchText,
    };
  }

  return {
    metadata: JSON.parse(firstLine.slice("# ai-track-meta ".length)) as PatchMetadata,
    patchBody: lines.slice(1).join("\n").trimStart(),
  };
}

function reversePatchText(patchText: string): string {
  const patches = parsePatch(patchText);

  return patches
    .map((patch) => {
      const lines = [
        `Index: ${stripPrefix(patch.newFileName)}`,
        "===================================================================",
        `--- ${patch.newFileName}`,
        `+++ ${patch.oldFileName}`,
      ];

      for (const hunk of patch.hunks) {
        lines.push(`@@ -${hunk.newStart},${hunk.newLines} +${hunk.oldStart},${hunk.oldLines} @@`);
        lines.push(
          ...hunk.lines.map((line) => {
            if (line.startsWith("+")) {
              return `-${line.slice(1)}`;
            }

            if (line.startsWith("-")) {
              return `+${line.slice(1)}`;
            }

            return line;
          }),
        );
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function countStats(patchText: string): PatchMetadata["stats"] {
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
    { filesChanged: 0, insertions: 0, deletions: 0 },
  );
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

export async function exportPatchBetweenSnapshots(targetPath: string, fromSnapshotId: string, toSnapshotId: string): Promise<{
  metadata: PatchMetadata;
  patchText: string;
}> {
  const state = await readState(targetPath);
  const fromManifest = await getSnapshotManifestById(state.storagePath, fromSnapshotId);
  const toManifest = await getSnapshotManifestById(state.storagePath, toSnapshotId);
  const paths = [...new Set([...fromManifest.files.map((file) => file.path), ...toManifest.files.map((file) => file.path)])].sort();
  const patches: string[] = [];

  for (const relativePath of paths) {
    const fromExists = fromManifest.files.some((file) => file.path === relativePath);
    const toExists = toManifest.files.some((file) => file.path === relativePath);
    const beforeText = fromExists ? await getSnapshotFileContent(state.storagePath, fromSnapshotId, relativePath) : "";
    const afterText = toExists ? await getSnapshotFileContent(state.storagePath, toSnapshotId, relativePath) : "";

    if (beforeText === afterText) {
      continue;
    }

    patches.push(createPatch(relativePath, beforeText, afterText, `a/${relativePath}`, `b/${relativePath}`));
  }

  const patchBody = patches.join("\n");
  const stats = countStats(patchBody);
  stats.filesChanged = patches.length;
  const metadata: PatchMetadata = {
    sourceSnapshot: fromSnapshotId,
    targetSnapshot: toSnapshotId,
    timestamp: new Date().toISOString(),
    filesAffected: paths.filter((relativePath) => patches.some((patch) => patch.includes(`Index: ${relativePath}`))),
    stats,
  };

  return {
    metadata,
    patchText: `${encodeMetadata(metadata)}\n${patchBody}`,
  };
}

export async function applyPatchToWorkspace(
  targetPath: string,
  patchText: string,
  options: { reverse?: boolean; threeWay?: boolean } = {},
): Promise<{ appliedFiles: string[]; conflicts: string[] }> {
  const state = await readState(targetPath);
  const decoded = decodeMetadata(patchText);
  const effectivePatchText = options.reverse ? reversePatchText(decoded.patchBody) : decoded.patchBody;
  const patches = parsePatch(effectivePatchText);
  const conflicts: string[] = [];
  const appliedFiles: string[] = [];

  await withStorageLock(state.storagePath, "patch-import", async () => {
    await runInTransaction(state.storagePath, "patch-import", async (transaction) => {
      for (const patch of patches) {
        const relativePath = stripPrefix(patch.newFileName === "/dev/null" ? patch.oldFileName : patch.newFileName);
        const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);
        const currentText = await readWorkspaceText(liveFilePath);
        const patchForFile = [
          `Index: ${relativePath}`,
          "===================================================================",
          `--- ${patch.oldFileName}`,
          `+++ ${patch.newFileName}`,
          ...patch.hunks.flatMap((hunk) => [`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`, ...hunk.lines]),
        ].join("\n");
        const applied = applyPatch(currentText, patchForFile);

        await backupFileForTransaction(state.storagePath, transaction, liveFilePath);

        if (applied !== false) {
          await atomicWriteFile(liveFilePath, applied);
          appliedFiles.push(relativePath);
          continue;
        }

        if (!options.threeWay || !decoded.metadata) {
          conflicts.push(relativePath);
          continue;
        }

        const baseText = await getSnapshotFileContent(state.storagePath, decoded.metadata.sourceSnapshot, relativePath).catch(() => "");
        const targetText = await getSnapshotFileContent(state.storagePath, decoded.metadata.targetSnapshot, relativePath).catch(() => "");
        const mergeResult = threeWayMerge(relativePath, baseText, currentText || null, targetText || null, {
          strategy: "manual",
          conflictOnDivergence: true,
        });

        await atomicWriteFile(liveFilePath, mergeResult.merged ?? currentText);

        if (mergeResult.status === "conflict") {
          conflicts.push(relativePath);
        } else {
          appliedFiles.push(relativePath);
        }
      }
    });
  });

  return { appliedFiles, conflicts };
}
