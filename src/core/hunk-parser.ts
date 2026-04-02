import { parsePatch } from "diff";

import type { HunkInfo } from "../types.js";

export function parsePatchHunks(patchText: string): HunkInfo[] {
  const patches = parsePatch(patchText);
  const firstPatch = patches[0];

  if (!firstPatch) {
    return [];
  }

  return firstPatch.hunks.map((hunk) => ({
    oldStart: hunk.oldStart,
    oldLines: hunk.oldLines,
    newStart: hunk.newStart,
    newLines: hunk.newLines,
    lines: [...hunk.lines],
  }));
}
