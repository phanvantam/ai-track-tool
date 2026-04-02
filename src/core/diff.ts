import { readFile } from "node:fs/promises";
import { createPatch } from "diff";

import type { ChangeEntry } from "../types.js";

async function readText(filePath: string | null): Promise<string> {
  if (!filePath) {
    return "";
  }

  return readFile(filePath, "utf8");
}

export async function renderChangeDiff(change: ChangeEntry): Promise<string> {
  if (change.isBinary) {
    return `${change.path}\nBinary files differ`;
  }

  const beforeText = await readText(change.beforeAbsolutePath);
  const afterText = await readText(change.afterAbsolutePath);

  return createPatch(change.path, beforeText, afterText, "snapshot", "current");
}

export async function renderDiffForPath(changes: ChangeEntry[], relativePath: string): Promise<string> {
  const change = changes.find((item) => item.path === relativePath);

  if (!change) {
    throw new Error(`Không tìm thấy diff cho file: ${relativePath}`);
  }

  return renderChangeDiff(change);
}

export async function renderDiffReport(changes: ChangeEntry[]): Promise<string> {
  if (changes.length === 0) {
    return "Không có thay đổi.";
  }

  const rendered = await Promise.all(
    changes.map(async (change) => {
      const directoryNote = change.directoryRename ? ` [dir ${change.directoryRename.oldPath} -> ${change.directoryRename.newPath}]` : "";
      const header = `=== ${change.type.toUpperCase()} ${change.path}${directoryNote} ===`;
      const diffText = await renderChangeDiff(change);
      return `${header}\n${diffText}`;
    }),
  );

  return rendered.join("\n\n");
}
