import path from "node:path";

import { normalizePathForComparison } from "./case-sensitivity.js";
import { materializeSnapshotFile } from "./delta.js";
import { collapseBulkDirectoryChanges } from "./directory-rename.js";
import { readAppConfig } from "./config.js";
import { countDiffLines, parseDiffSkipped, renderChangeDiff } from "./diff.js";
import { readManifest, readState } from "./state.js";
import { scanCurrentFiles } from "./snapshot.js";
import type { ChangeEntry, CurrentFileEntry, FilesystemConfig, SnapshotFileEntry } from "../types.js";

function mapCurrentFiles(files: CurrentFileEntry[], filesystemConfig?: FilesystemConfig): Map<string, CurrentFileEntry> {
  return new Map(files.map((file) => [normalizePathForComparison(file.path, filesystemConfig), file]));
}

function mapSnapshotFiles(files: SnapshotFileEntry[], filesystemConfig?: FilesystemConfig): Map<string, SnapshotFileEntry> {
  return new Map(files.map((file) => [normalizePathForComparison(file.path, filesystemConfig), file]));
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

/**
 * Lấy top-level directory segment từ path.
 * Trả về null nếu file ở root (không có '/').
 */
function getTopLevelDir(filePath: string): string | null {
  const firstSlash = filePath.indexOf("/");
  return firstSlash === -1 ? null : filePath.substring(0, firstSlash);
}

/**
 * Materialize snapshot file, trả null nếu file bị thiếu trên disk (snapshot hỏng).
 * Giúp getChanges() không crash khi snapshot data bị corrupt.
 */
async function safeMaterialize(storagePath: string, snapshotId: string, filePath: string): Promise<string | null> {
  try {
    return await materializeSnapshotFile(storagePath, snapshotId, filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`[compare] Snapshot file bị thiếu, skip: ${filePath} (chạy fsck --repair để sửa)`);
      return null;
    }
    throw error;
  }
}

export async function getChanges(targetPathInput: string): Promise<ChangeEntry[]> {
  const state = await readState(targetPathInput);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const currentFiles = await scanCurrentFiles(state.targetPath, manifest.ignoreRules);
  const currentMap = mapCurrentFiles(currentFiles, state.filesystemConfig);
  const snapshotMap = mapSnapshotFiles(manifest.files, state.filesystemConfig);
  const currentHashMap = mapCurrentFilesByHash(currentFiles);
  const snapshotHashMap = mapSnapshotFilesByHash(manifest.files);
  const changes: ChangeEntry[] = [];
  const processedPaths = new Set<string>();

  // First pass: detect modifications and renames
  for (const snapshotFile of manifest.files) {
    const normalizedSnapshotPath = normalizePathForComparison(snapshotFile.path, state.filesystemConfig);
    const currentFile = currentMap.get(normalizedSnapshotPath);

    // File exists at same path
    if (currentFile) {
      if (currentFile.path !== snapshotFile.path && currentFile.hash === snapshotFile.hash) {
        const beforeAbsolutePath = await safeMaterialize(state.storagePath, manifest.snapshotId, snapshotFile.path);
        // Skip entry nếu snapshot file bị hỏng
        if (!beforeAbsolutePath) {
          processedPaths.add(snapshotFile.path);
          processedPaths.add(currentFile.path);
          continue;
        }
        changes.push({
          path: currentFile.path,
          type: "renamed",
          isBinary: snapshotFile.isBinary || currentFile.isBinary,
          beforeAbsolutePath,
          afterAbsolutePath: currentFile.absolutePath,
          oldPath: snapshotFile.path,
        });
        processedPaths.add(snapshotFile.path);
        processedPaths.add(currentFile.path);
        continue;
      }

      if (currentFile.hash !== snapshotFile.hash) {
        const beforeAbsolutePath = await safeMaterialize(state.storagePath, manifest.snapshotId, snapshotFile.path);
        // Skip nếu snapshot file bị hỏng — không thể tính diff
        if (beforeAbsolutePath) {
          changes.push({
            path: snapshotFile.path,
            type: "modified",
            isBinary: snapshotFile.isBinary || currentFile.isBinary,
            beforeAbsolutePath,
            afterAbsolutePath: currentFile.absolutePath,
          });
        }
      }
      processedPaths.add(snapshotFile.path);
      continue;
    }

    // File doesn't exist at same path - check if it was renamed (same hash, different path)
    const candidatesWithSameHash = currentHashMap.get(snapshotFile.hash) || [];
    const renamedCandidate = candidatesWithSameHash.find((candidate) => !snapshotMap.has(candidate.path));

    if (renamedCandidate) {
      const beforeAbsolutePath = await safeMaterialize(state.storagePath, manifest.snapshotId, snapshotFile.path);
      if (beforeAbsolutePath) {
        changes.push({
          path: renamedCandidate.path,
          type: "renamed",
          isBinary: snapshotFile.isBinary,
          beforeAbsolutePath,
          afterAbsolutePath: renamedCandidate.absolutePath,
          oldPath: snapshotFile.path,
        });
      }
      processedPaths.add(snapshotFile.path);
      processedPaths.add(renamedCandidate.path);
      continue;
    }

    // File was deleted
    const beforeAbsolutePath = await safeMaterialize(state.storagePath, manifest.snapshotId, snapshotFile.path);
    if (beforeAbsolutePath) {
      changes.push({
        path: snapshotFile.path,
        type: "deleted",
        isBinary: snapshotFile.isBinary,
        beforeAbsolutePath,
        afterAbsolutePath: null,
      });
    }
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

  const config = await readAppConfig();
  const threshold = state.bulkCollapseThreshold ?? config.bulkCollapseThreshold;

  // Gom folder nhiều file thành 1 entry per (dir, type)
  const collapsed = collapseBulkDirectoryChanges(changes, threshold);

  // Tính insertions/deletions CHỈ cho entries còn lại sau collapse
  // (tránh tính diff cho hàng ngàn file thuộc bulk directory)
  const withStats = await Promise.all(
    collapsed.map(async (change) => {
      // Entry đã collapse (gom nhóm) hoặc binary → không cần tính diff
      if (change.collapsedCount || change.isBinary) {
        return change;
      }

      try {
        const diffText = await renderChangeDiff(change);

        // Kiểm tra diff có bị skip vì file quá lớn không
        const skippedMsg = parseDiffSkipped(diffText);
        if (skippedMsg) {
          return { ...change, diffSkipped: skippedMsg };
        }

        const stats = countDiffLines(diffText);
        return { ...change, ...stats };
      } catch {
        return change;
      }
    }),
  );

  return withStats;
}

/**
 * So sánh manifest của snapshot đã chọn với filesystem hiện tại.
 * Trả về danh sách file khác biệt (added/modified/deleted) dưới dạng SnapshotDiffEntry.
 * "added" = file có trong snapshot nhưng không có trên disk (sẽ được phục hồi)
 * "deleted" = file có trên disk nhưng không có trong snapshot (sẽ bị xóa khi restore)
 * "modified" = file tồn tại ở cả hai nhưng hash khác nhau (sẽ bị ghi đè)
 */
export async function diffSnapshotVsCurrent(
  targetPathInput: string,
  snapshotId: string,
): Promise<{ path: string; type: "added" | "modified" | "deleted" }[]> {
  const state = await readState(targetPathInput);
  const manifest = await readManifest(state.storagePath, snapshotId);
  const currentFiles = await scanCurrentFiles(state.targetPath, manifest.ignoreRules);

  const currentMap = new Map(currentFiles.map((f) => [f.path, f]));
  const snapshotMap = new Map(manifest.files.map((f) => [f.path, f]));
  const diffs: { path: string; type: "added" | "modified" | "deleted" }[] = [];

  // File trong snapshot nhưng không có / khác trên disk
  for (const snapshotFile of manifest.files) {
    const currentFile = currentMap.get(snapshotFile.path);
    if (!currentFile) {
      // File sẽ được phục hồi khi restore
      diffs.push({ path: snapshotFile.path, type: "added" });
    } else if (currentFile.hash !== snapshotFile.hash) {
      diffs.push({ path: snapshotFile.path, type: "modified" });
    }
  }

  // File trên disk nhưng không có trong snapshot → sẽ bị xóa khi restore
  for (const currentFile of currentFiles) {
    if (!snapshotMap.has(currentFile.path)) {
      diffs.push({ path: currentFile.path, type: "deleted" });
    }
  }

  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}
