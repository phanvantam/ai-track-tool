import { readFile } from "node:fs/promises";
import { createPatch } from "diff";

import type { ChangeEntry } from "../types.js";
import { getSnapshotManifestById, getSnapshotFileContent } from "./snapshot-chain.js";

export interface DiffLineStats {
  insertions: number;
  deletions: number;
  changeCount: number;
}

async function readText(filePath: string | null): Promise<string> {
  if (!filePath) {
    return "";
  }

  return readFile(filePath, "utf8");
}

/** Ngưỡng tối đa dòng — file vượt quá sẽ không tính diff chi tiết */
const MAX_DIFF_LINES = 1000;

/** Prefix đánh dấu kết quả diff bị bỏ qua vì file quá lớn */
const DIFF_SKIPPED_PREFIX = "DIFF_SKIPPED:";

function lineCount(text: string): number {
  if (text.length === 0) return 0;
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

export async function renderChangeDiff(change: ChangeEntry): Promise<string> {
  if (change.isBinary) {
    return `${change.path}\nBinary files differ`;
  }

  const beforeText = await readText(change.beforeAbsolutePath);
  const afterText = await readText(change.afterAbsolutePath);

  // File quá lớn → không tính diff chi tiết, trả về marker
  if (lineCount(beforeText) > MAX_DIFF_LINES || lineCount(afterText) > MAX_DIFF_LINES) {
    return `${DIFF_SKIPPED_PREFIX}File vượt quá ${MAX_DIFF_LINES} dòng — bỏ qua tính diff.`;
  }

  return createPatch(change.path, beforeText, afterText, "snapshot", "current");
}

export async function renderDiffForPath(changes: ChangeEntry[], relativePath: string): Promise<string> {
  const change = changes.find((item) => item.path === relativePath);

  if (!change) {
    throw new Error(`Không tìm thấy diff cho file: ${relativePath}`);
  }

  return renderChangeDiff(change);
}

export async function renderSnapshotDiffForPath(
  storagePath: string,
  fromSnapshotId: string,
  toSnapshotId: string,
  relativePath: string,
): Promise<string> {
  const [fromManifest, toManifest] = await Promise.all([
    getSnapshotManifestById(storagePath, fromSnapshotId),
    getSnapshotManifestById(storagePath, toSnapshotId),
  ]);
  const fromFile = fromManifest.files.find((file) => file.path === relativePath);
  const toFile = toManifest.files.find((file) => file.path === relativePath);

  if (!fromFile && !toFile) {
    throw new Error(`Không tìm thấy file trong hai snapshot: ${relativePath}`);
  }

  if (fromFile?.isBinary || toFile?.isBinary) {
    return `${relativePath}\nBinary files differ`;
  }

  const [beforeText, afterText] = await Promise.all([
    fromFile ? getSnapshotFileContent(storagePath, fromSnapshotId, relativePath) : Promise.resolve(""),
    toFile ? getSnapshotFileContent(storagePath, toSnapshotId, relativePath) : Promise.resolve(""),
  ]);

  // File quá lớn → không tính diff chi tiết, trả về marker
  if (lineCount(beforeText) > MAX_DIFF_LINES || lineCount(afterText) > MAX_DIFF_LINES) {
    return `${DIFF_SKIPPED_PREFIX}File vượt quá ${MAX_DIFF_LINES} dòng — bỏ qua tính diff.`;
  }

  return createPatch(relativePath, beforeText, afterText, `snapshot:${fromSnapshotId.slice(0, 8)}`, `snapshot:${toSnapshotId.slice(0, 8)}`);
}

export function countDiffLines(diffText: string): DiffLineStats {
  const stats = diffText.split(/\r?\n/).reduce<DiffLineStats>((currentStats, line) => {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@") || line.startsWith("Index:")) {
      return currentStats;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentStats.insertions += 1;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      currentStats.deletions += 1;
    }

    currentStats.changeCount = currentStats.insertions + currentStats.deletions;
    return currentStats;
  }, {
    insertions: 0,
    deletions: 0,
    changeCount: 0,
  });

  return stats;
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

/**
 * Kiểm tra diff text có phải marker bị skip không.
 * Trả về message lý do nếu bị skip, hoặc null nếu diff bình thường.
 */
export function parseDiffSkipped(diffText: string): string | null {
  if (diffText.startsWith(DIFF_SKIPPED_PREFIX)) {
    return diffText.slice(DIFF_SKIPPED_PREFIX.length);
  }
  return null;
}
