/**
 * Helper functions cho Inspector components
 * Chứa formatter, utilities cho diff, snapshot display
 */

import type { SnapshotDiffEntry, SessionHistoryView } from "../../api";

/**
 * Format timestamp thành local date string
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("vi-VN");
}

/**
 * Rút gọn snapshot ID - lấy 8 ký tự đầu
 */
export function shortId(snapshotId: string): string {
  return snapshotId.slice(0, 8);
}

/**
 * Đếm số snapshot con của một snapshot
 */
export function countChildSnapshots(
  snapshots: SessionHistoryView["snapshots"],
  snapshotId: string
): number {
  return snapshots.filter(
    (snapshot) => snapshot.parentSnapshotId === snapshotId
  ).length;
}

/**
 * Đếm số branch nodes (snapshot có >1 child)
 */
export function countBranchNodes(
  snapshots: SessionHistoryView["snapshots"]
): number {
  return snapshots.filter(
    (snapshot) => countChildSnapshots(snapshots, snapshot.snapshotId) > 1
  ).length;
}

/**
 * Label người dùng cho diff type
 */
export function labelForDiffType(type: SnapshotDiffEntry["type"]): string {
  if (type === "added") return "thêm";
  if (type === "deleted") return "xóa";
  return "sửa";
}

/**
 * CSS class cho diff line dựa vào content
 * - @@ lines → is-meta
 * - + lines → is-added
 * - - lines → is-removed
 * - header lines → is-header
 */
export function getDiffLineClass(line: string): string {
  if (line.startsWith("@@")) return "is-meta";
  if (line.startsWith("+") && !line.startsWith("+++")) return "is-added";
  if (line.startsWith("-") && !line.startsWith("---")) return "is-removed";
  if (
    line.startsWith("Index:") ||
    line.startsWith("===") ||
    line.startsWith("+++") ||
    line.startsWith("---")
  ) {
    return "is-header";
  }
  return "";
}
