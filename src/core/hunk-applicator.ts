import { applyPatch } from "diff";

import type { CherryPickResult, HunkInfo } from "../types.js";

function buildPatch(filePath: string, hunks: HunkInfo[]): string {
  const header = [`Index: ${filePath}`, "===================================================================", `--- ${filePath}`, `+++ ${filePath}`];

  const body = hunks.map((hunk) => {
    const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
    return [hunkHeader, ...hunk.lines].join("\n");
  });

  return [...header, ...body].join("\n");
}

export function applySelectedHunks(
  currentText: string,
  filePath: string,
  hunks: HunkInfo[],
  selectedIndices: number[],
): CherryPickResult & { content?: string } {
  const selectedHunks = hunks.filter((_, index) => selectedIndices.includes(index));

  if (selectedHunks.length === 0) {
    return {
      success: true,
      appliedHunks: 0,
      conflicts: [],
      content: currentText,
    };
  }

  const patchText = buildPatch(filePath, selectedHunks);
  const nextText = applyPatch(currentText, patchText);

  if (nextText === false) {
    return {
      success: false,
      appliedHunks: 0,
      conflicts: ["Context không khớp, không apply được hunk."],
    };
  }

  return {
    success: true,
    appliedHunks: selectedHunks.length,
    conflicts: [],
    content: nextText,
  };
}
