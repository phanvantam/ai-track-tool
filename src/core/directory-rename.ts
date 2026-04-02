import type { ChangeEntry, ChangeType } from "../types.js";

/** Ngưỡng tối thiểu để gom nhóm files cùng folder */
const BULK_COLLAPSE_THRESHOLD = 10;


/**
 * Lấy top-level directory segment từ path.
 * Ví dụ: "node_modules2/@jridgewell/foo.js" → "node_modules2"
 * File ở root (không có '/') → null (không gom).
 */
function getTopLevelDir(filePath: string): string | null {
  const firstSlash = filePath.indexOf("/");
  return firstSlash === -1 ? null : filePath.substring(0, firstSlash);
}

/**
 * Detect các top-level directory có quá nhiều file changes.
 * Trả về Set chứa tên directory cần collapse.
 */
export function detectBulkDirectories(changes: ChangeEntry[], threshold = BULK_COLLAPSE_THRESHOLD): Set<string> {
  const counts = new Map<string, number>();

  for (const change of changes) {
    const dir = getTopLevelDir(change.path);
    if (!dir) continue;

    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }

  const bulkDirs = new Set<string>();
  for (const [dir, count] of counts) {
    if (count >= threshold) {
      bulkDirs.add(dir);
    }
  }

  return bulkDirs;
}

/**
 * Gom file cùng top-level directory thành 1 entry đại diện.
 * Chỉ gom khi folder có >= threshold files.
 * Mục đích: tránh sidebar hiển thị hàng nghìn file khi thêm/xóa/sửa folder lớn.
 */
export function collapseBulkDirectoryChanges(changes: ChangeEntry[], threshold = BULK_COLLAPSE_THRESHOLD): ChangeEntry[] {
  const bulkDirs = detectBulkDirectories(changes, threshold);

  if (bulkDirs.size === 0) {
    return changes;
  }

  // Group file theo (dir, type)
  const groups = new Map<string, ChangeEntry[]>();
  const kept: ChangeEntry[] = [];

  for (const change of changes) {
    const dir = getTopLevelDir(change.path);
    if (!dir || !bulkDirs.has(dir)) {
      kept.push(change);
      continue;
    }

    // Group theo "dir:type" — mỗi type tạo 1 entry riêng
    const groupKey = `${dir}:${change.type}`;
    const group = groups.get(groupKey) ?? [];
    group.push(change);
    groups.set(groupKey, group);
  }

  // Tạo entry đại diện cho mỗi group
  for (const [groupKey, groupChanges] of groups) {
    const separatorIdx = groupKey.lastIndexOf(":");
    const dirPath = groupKey.substring(0, separatorIdx);
    const changeType = groupKey.substring(separatorIdx + 1) as ChangeType;

    const totalInsertions = groupChanges.reduce((sum, c) => sum + (c.insertions ?? 0), 0);
    const totalDeletions = groupChanges.reduce((sum, c) => sum + (c.deletions ?? 0), 0);

    kept.push({
      path: dirPath,
      type: changeType,
      isBinary: false,
      beforeAbsolutePath: null,
      afterAbsolutePath: null,
      insertions: totalInsertions,
      deletions: totalDeletions,
      collapsedCount: groupChanges.length,
    });
  }

  return kept.sort((a, b) => a.path.localeCompare(b.path));
}


