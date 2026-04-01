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

export async function getChanges(targetPathInput: string): Promise<ChangeEntry[]> {
  const state = await readState(targetPathInput);
  const manifest = await readManifest(state.targetPath, state.activeSnapshotId);
  const currentFiles = await scanCurrentFiles(state.targetPath, manifest.ignoreRules);
  const currentMap = mapCurrentFiles(currentFiles);
  const snapshotMap = mapSnapshotFiles(manifest.files);
  const snapshotFilesRoot = path.join(state.targetPath, ".ai-track", "snapshots", manifest.snapshotId, "files");
  const changes: ChangeEntry[] = [];

  for (const snapshotFile of manifest.files) {
    const currentFile = currentMap.get(snapshotFile.path);

    if (!currentFile) {
      changes.push({
        path: snapshotFile.path,
        type: "deleted",
        isBinary: snapshotFile.isBinary,
        beforeAbsolutePath: path.join(snapshotFilesRoot, snapshotFile.path),
        afterAbsolutePath: null,
      });
      continue;
    }

    if (currentFile.hash !== snapshotFile.hash) {
      changes.push({
        path: snapshotFile.path,
        type: "modified",
        isBinary: snapshotFile.isBinary || currentFile.isBinary,
        beforeAbsolutePath: path.join(snapshotFilesRoot, snapshotFile.path),
        afterAbsolutePath: currentFile.absolutePath,
      });
    }
  }

  for (const currentFile of currentFiles) {
    if (snapshotMap.has(currentFile.path)) {
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
