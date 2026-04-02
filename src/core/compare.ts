import path from "node:path";

import { normalizePathForComparison } from "./case-sensitivity.js";
import { materializeSnapshotFile } from "./delta.js";
import { attachDirectoryRenames } from "./directory-rename.js";
import { readManifest, readState } from "./state.js";
import { scanCurrentFiles } from "./snapshot.js";
import type { ChangeEntry, CurrentFileEntry, FilesystemConfig, SnapshotFileEntry } from "../types.js";

function mapCurrentFiles(files: CurrentFileEntry[], filesystemConfig?: FilesystemConfig): Map<string, CurrentFileEntry> {
  return new Map(files.map((file) => [normalizePathForComparison(file.path, filesystemConfig), file]));
}

function mapSnapshotFiles(files: SnapshotFileEntry[], filesystemConfig?: FilesystemConfig): Map<string, SnapshotFileEntry> {
  return new Map(files.map((file) => [normalizePathForComparison(file.path, filesystemConfig), file]));
}

function mapCurrentFilesByHash(files: CurrentFileEntry[]): Map<string, CurrentFileEntry[]> {
  const map = new Map<string, CurrentFileEntry[]>();
  for (const file of files) {
    const existing = map.get(file.hash) || [];
    existing.push(file);
    map.set(file.hash, existing);
  }
  return map;
}

function mapSnapshotFilesByHash(files: SnapshotFileEntry[]): Map<string, SnapshotFileEntry[]> {
  const map = new Map<string, SnapshotFileEntry[]>();
  for (const file of files) {
    const existing = map.get(file.hash) || [];
    existing.push(file);
    map.set(file.hash, existing);
  }
  return map;
}

export async function getChanges(targetPathInput: string): Promise<ChangeEntry[]> {
  const state = await readState(targetPathInput);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const currentFiles = await scanCurrentFiles(state.targetPath, manifest.ignoreRules);
  const currentMap = mapCurrentFiles(currentFiles, state.filesystemConfig);
  const snapshotMap = mapSnapshotFiles(manifest.files, state.filesystemConfig);
  const currentHashMap = mapCurrentFilesByHash(currentFiles);
  const snapshotHashMap = mapSnapshotFilesByHash(manifest.files);
  const changes: ChangeEntry[] = [];
  const processedPaths = new Set<string>();

  // First pass: detect modifications and renames
  for (const snapshotFile of manifest.files) {
    const normalizedSnapshotPath = normalizePathForComparison(snapshotFile.path, state.filesystemConfig);
    const currentFile = currentMap.get(normalizedSnapshotPath);

    // File exists at same path
    if (currentFile) {
      if (currentFile.path !== snapshotFile.path && currentFile.hash === snapshotFile.hash) {
        const beforeAbsolutePath = await materializeSnapshotFile(state.storagePath, manifest.snapshotId, snapshotFile.path);
        changes.push({
          path: currentFile.path,
          type: "renamed",
          isBinary: snapshotFile.isBinary || currentFile.isBinary,
          beforeAbsolutePath,
          afterAbsolutePath: currentFile.absolutePath,
          oldPath: snapshotFile.path,
        });
        processedPaths.add(snapshotFile.path);
        processedPaths.add(currentFile.path);
        continue;
      }

      if (currentFile.hash !== snapshotFile.hash) {
        const beforeAbsolutePath = await materializeSnapshotFile(state.storagePath, manifest.snapshotId, snapshotFile.path);
        changes.push({
          path: snapshotFile.path,
          type: "modified",
          isBinary: snapshotFile.isBinary || currentFile.isBinary,
          beforeAbsolutePath,
          afterAbsolutePath: currentFile.absolutePath,
        });
      }
      processedPaths.add(snapshotFile.path);
      continue;
    }

    // File doesn't exist at same path - check if it was renamed (same hash, different path)
    const candidatesWithSameHash = currentHashMap.get(snapshotFile.hash) || [];
    const renamedCandidate = candidatesWithSameHash.find((candidate) => !snapshotMap.has(candidate.path));

    if (renamedCandidate) {
      const beforeAbsolutePath = await materializeSnapshotFile(state.storagePath, manifest.snapshotId, snapshotFile.path);
      changes.push({
        path: renamedCandidate.path,
        type: "renamed",
        isBinary: snapshotFile.isBinary,
        beforeAbsolutePath,
        afterAbsolutePath: renamedCandidate.absolutePath,
        oldPath: snapshotFile.path,
      });
      processedPaths.add(snapshotFile.path);
      processedPaths.add(renamedCandidate.path);
      continue;
    }

    // File was deleted
    const beforeAbsolutePath = await materializeSnapshotFile(state.storagePath, manifest.snapshotId, snapshotFile.path);
    changes.push({
      path: snapshotFile.path,
      type: "deleted",
      isBinary: snapshotFile.isBinary,
      beforeAbsolutePath,
      afterAbsolutePath: null,
    });
    processedPaths.add(snapshotFile.path);
  }

  // Second pass: detect new files
  for (const currentFile of currentFiles) {
    if (processedPaths.has(currentFile.path)) {
      continue;
    }

    changes.push({
      path: currentFile.path,
      type: "added",
      isBinary: currentFile.isBinary,
      beforeAbsolutePath: null,
      afterAbsolutePath: currentFile.absolutePath,
    });
  }

  return attachDirectoryRenames(changes.sort((left, right) => left.path.localeCompare(right.path)));
}
