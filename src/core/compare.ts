import path from "node:path";

import { readManifest, readState } from "./state.js";
import { scanCurrentFiles } from "./snapshot.js";
import type { ChangeEntry, CurrentFileEntry, SnapshotFileEntry } from "../types.js";

function mapCurrentFiles(files: CurrentFileEntry[]): Map<string, CurrentFileEntry> {
  return new Map(files.map((file) => [file.path, file]));
}

function mapSnapshotFiles(files: SnapshotFileEntry[]): Map<string, SnapshotFileEntry> {
  return new Map(files.map((file) => [file.path, file]));
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
  const currentMap = mapCurrentFiles(currentFiles);
  const snapshotMap = mapSnapshotFiles(manifest.files);
  const currentHashMap = mapCurrentFilesByHash(currentFiles);
  const snapshotHashMap = mapSnapshotFilesByHash(manifest.files);
  const snapshotFilesRoot = path.join(state.storagePath, "snapshots", manifest.snapshotId, "files");
  const changes: ChangeEntry[] = [];
  const processedPaths = new Set<string>();

  // First pass: detect modifications and renames
  for (const snapshotFile of manifest.files) {
    const currentFile = currentMap.get(snapshotFile.path);

    // File exists at same path
    if (currentFile) {
      if (currentFile.hash !== snapshotFile.hash) {
        changes.push({
          path: snapshotFile.path,
          type: "modified",
          isBinary: snapshotFile.isBinary || currentFile.isBinary,
          beforeAbsolutePath: path.join(snapshotFilesRoot, snapshotFile.path),
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
      changes.push({
        path: renamedCandidate.path,
        type: "renamed",
        isBinary: snapshotFile.isBinary,
        beforeAbsolutePath: path.join(snapshotFilesRoot, snapshotFile.path),
        afterAbsolutePath: renamedCandidate.absolutePath,
        oldPath: snapshotFile.path,
      });
      processedPaths.add(snapshotFile.path);
      processedPaths.add(renamedCandidate.path);
      continue;
    }

    // File was deleted
    changes.push({
      path: snapshotFile.path,
      type: "deleted",
      isBinary: snapshotFile.isBinary,
      beforeAbsolutePath: path.join(snapshotFilesRoot, snapshotFile.path),
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

  return changes.sort((left, right) => left.path.localeCompare(right.path));
}
