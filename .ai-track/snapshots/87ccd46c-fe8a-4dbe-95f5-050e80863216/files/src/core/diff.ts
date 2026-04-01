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
    return `${change.path}\n[binary] ${change.type}`;
  }

  const beforeText = await readText(change.beforeAbsolutePath);
  const afterText = await readText(change.afterAbsolutePath);

  return createPatch(change.path, beforeText, afterText, "snapshot", "current");
}

export async function renderDiffReport(changes: ChangeEntry[]): Promise<string> {
  if (changes.length === 0) {
    return "Khong co thay doi.";
  }

  const rendered = await Promise.all(
    changes.map(async (change) => {
      const header = `=== ${change.type.toUpperCase()} ${change.path} ===`;
      const diffText = await renderChangeDiff(change);
      return `${header}\n${diffText}`;
    }),
  );

  return rendered.join("\n\n");
}
