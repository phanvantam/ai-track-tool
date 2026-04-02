import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  getHistory,
  getLock,
  getSnapshotDiff,
  getSnapshotFileDiff,
  type LockInfo,
  type SessionHistoryView,
  type SnapshotDiffEntry,
} from "../api";

interface UseHistoryManagerReturn {
  historyView: SessionHistoryView | null;
  selectedSnapshotId: string | null;
  snapshotDiffs: SnapshotDiffEntry[];
  selectedSnapshotDiffPath: string | null;
  snapshotDiffText: string;
  lockInfo: LockInfo | null;
  loadHistory: (sessionId: string) => Promise<void>;
  selectSnapshot: (snapshotId: string | null) => void;
  loadSnapshotDiff: (
    sessionId: string,
    fromSnapshotId: string,
    toSnapshotId: string,
  ) => Promise<void>;
  selectSnapshotDiffPath: (path: string | null) => void;
  loadSnapshotFileDiff: (
    sessionId: string,
    fromSnapshotId: string,
    toSnapshotId: string,
    filePath: string,
  ) => Promise<void>;
}

/**
 * Quản lý history, snapshots và diff view.
 * Xử lý việc tải history, chọn snapshot, và tải diff chi tiết.
 */
export function useHistoryManager(): UseHistoryManagerReturn {
  const [historyView, setHistoryView] = useState<SessionHistoryView | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [snapshotDiffs, setSnapshotDiffs] = useState<SnapshotDiffEntry[]>([]);
  const [selectedSnapshotDiffPath, setSelectedSnapshotDiffPath] = useState<string | null>(null);
  const [snapshotDiffText, setSnapshotDiffText] = useState("");
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);

  // Tải history và lock info
  async function handleLoadHistory(sessionId: string) {
    try {
      const [nextHistory, nextLock] = await Promise.all([
        getHistory(sessionId),
        getLock(sessionId),
      ]);
      setHistoryView(nextHistory);
      setLockInfo(nextLock);
      setSelectedSnapshotId((current) => {
        // Giữ snapshot hiện tại nếu vẫn còn
        if (current && nextHistory.snapshots.some((s) => s.snapshotId === current)) {
          return current;
        }
        // Nếu không, chọn snapshot đang active hoặc snapshot đầu tiên
        return (
          nextHistory.snapshots.find((s) => s.isActive)?.snapshotId ??
          nextHistory.snapshots[0]?.snapshotId ??
          null
        );
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tải history.",
      });
    }
  }

  // Chọn snapshot
  function handleSelectSnapshot(snapshotId: string | null) {
    setSelectedSnapshotId(snapshotId);
  }

  // Tải diff giữa 2 snapshots
  async function handleLoadSnapshotDiff(
    sessionId: string,
    fromSnapshotId: string,
    toSnapshotId: string,
  ) {
    try {
      const diffs = await getSnapshotDiff(sessionId, fromSnapshotId, toSnapshotId);
      setSnapshotDiffs(diffs);
      setSelectedSnapshotDiffPath((current) =>
        current && diffs.some((entry) => entry.path === current) ? current : diffs[0]?.path ?? null
      );
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tải snapshot diff.",
      });
      setSnapshotDiffs([]);
      setSelectedSnapshotDiffPath(null);
      setSnapshotDiffText("");
    }
  }

  // Chọn file diff path
  function handleSelectSnapshotDiffPath(path: string | null) {
    setSelectedSnapshotDiffPath(path);
  }

  // Tải diff text của 1 file trong snapshot
  async function handleLoadSnapshotFileDiff(
    sessionId: string,
    fromSnapshotId: string,
    toSnapshotId: string,
    filePath: string,
  ) {
    try {
      const diffText = await getSnapshotFileDiff(
        sessionId,
        fromSnapshotId,
        toSnapshotId,
        filePath,
      );
      setSnapshotDiffText(diffText);
    } catch (error) {
      setSnapshotDiffText(error instanceof Error ? error.message : "Lỗi tải file diff.");
    }
  }

  return {
    historyView,
    selectedSnapshotId,
    snapshotDiffs,
    selectedSnapshotDiffPath,
    snapshotDiffText,
    lockInfo,
    loadHistory: handleLoadHistory,
    selectSnapshot: handleSelectSnapshot,
    loadSnapshotDiff: handleLoadSnapshotDiff,
    selectSnapshotDiffPath: handleSelectSnapshotDiffPath,
    loadSnapshotFileDiff: handleLoadSnapshotFileDiff,
  };
}
