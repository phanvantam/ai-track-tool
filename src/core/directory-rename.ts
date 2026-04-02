import path from "node:path";

import type { ChangeEntry, DirectoryRename } from "../types.js";

function deriveDirectoryRename(oldPath: string, newPath: string): { oldPath: string; newPath: string } | null {
  const oldDirs = path.posix.dirname(oldPath).split("/").filter(Boolean);
  const newDirs = path.posix.dirname(newPath).split("/").filter(Boolean);

  if (oldDirs.length === 0 || newDirs.length === 0) {
    return null;
  }

  let suffixLength = 0;
  while (
    suffixLength < oldDirs.length &&
    suffixLength < newDirs.length &&
    oldDirs[oldDirs.length - 1 - suffixLength] === newDirs[newDirs.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const oldRoot = oldDirs.slice(0, Math.max(1, oldDirs.length - suffixLength)).join("/");
  const newRoot = newDirs.slice(0, Math.max(1, newDirs.length - suffixLength)).join("/");

  if (!oldRoot || !newRoot || oldRoot === newRoot) {
    return null;
  }

  return { oldPath: oldRoot, newPath: newRoot };
}

export function detectDirectoryRenames(changes: ChangeEntry[]): DirectoryRename[] {
  const groups = new Map<string, DirectoryRename>();

  for (const change of changes) {
    if (change.type !== "renamed" || !change.oldPath) {
      continue;
    }

    const candidate = deriveDirectoryRename(change.oldPath, change.path);

    if (!candidate) {
      continue;
    }

    const key = `${candidate.oldPath}->${candidate.newPath}`;
    const existing = groups.get(key);

    if (existing) {
      existing.filesAffected += 1;
      existing.confidence = Math.min(1, 0.6 + existing.filesAffected * 0.2);
      continue;
    }

    groups.set(key, {
      ...candidate,
      filesAffected: 1,
      confidence: 0.6,
      detection: "path_pattern",
    });
  }

  return [...groups.values()]
    .filter((group) => group.filesAffected >= 2)
    .sort((left, right) => left.oldPath.localeCompare(right.oldPath));
}

export function attachDirectoryRenames(changes: ChangeEntry[]): ChangeEntry[] {
  const directoryRenames = detectDirectoryRenames(changes);

  if (directoryRenames.length === 0) {
    return changes;
  }

  return changes.map((change) => {
    if (change.type !== "renamed" || !change.oldPath) {
      return change;
    }

    const directoryRename = directoryRenames.find(
      (group) => change.oldPath!.startsWith(`${group.oldPath}/`) && change.path.startsWith(`${group.newPath}/`),
    );

    if (!directoryRename) {
      return change;
    }

    return {
      ...change,
      directoryRename,
    };
  });
}
