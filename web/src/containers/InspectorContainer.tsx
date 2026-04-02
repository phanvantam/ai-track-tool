import { useState } from "react";
import { notifications } from "../lib/notify";
import {
  createTag as apiCreateTag,
  deleteNote as apiDeleteNote,
  deleteTag as apiDeleteTag,
  restoreSnapshot as apiRestoreSnapshot,
  rollback as apiRollback,
  runFsck as apiRunFsck,
  runGarbageCollection as apiRunGarbageCollection,
  saveNote as apiSaveNote,
  type FsckReport,
  type GarbageCollectionReport,
  type SessionState,
} from "../api";
import { InspectorPanel } from "../components/InspectorPanel";
import type { useHistoryManager } from "../hooks/useHistoryManager";

type UseHistoryManagerReturn = ReturnType<typeof useHistoryManager>;

interface InspectorContainerProps {
  session: SessionState | null;
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  selectedChange: any; // ChangeEntry | null
  diffText: string;
  historyManager: UseHistoryManagerReturn;
  onLoadSessions: () => Promise<void>;
}

/**
 * Orchestrator container cho 5 tabs (Diff/History/Health/Reflog/Snapshot).
 * Quản lý interactions với inspector panel.
 */
export function InspectorContainer({
  session,
  selectedPath,
  selectedPathType,
  selectedChange,
  diffText,
  historyManager,
  onLoadSessions,
}: InspectorContainerProps) {
  const [loading, setLoading] = useState(false);
  const [fsckReport, setFsckReport] = useState<FsckReport | null>(null);
  const [gcReport, setGcReport] = useState<GarbageCollectionReport | null>(null);

  if (!session) {
    return null;
  }

  const canRollback = selectedPathType === "file" && selectedChange;

  async function handleRollback() {
    if (!selectedPath || !session) return;
    setLoading(true);
    try {
      await apiRollback(session.id, selectedPath);
      await onLoadSessions();
      notifications.show({
        color: "green",
        message: `Đã khôi phục ${selectedPath}`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi khôi phục file.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshHistory() {
    try {
      await historyManager.loadHistory(session!.id);
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tải lịch sử.",
      });
    }
  }

  async function handleRunFsck(repair: boolean) {
    setLoading(true);
    try {
      const report = await apiRunFsck(session!.id, repair);
      setFsckReport(report);
      notifications.show({
        color: report.isHealthy ? "green" : "yellow",
        message: report.isHealthy ? "Dữ liệu nguyên vẹn." : "Phát hiện vấn đề.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi kiểm tra health.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRunGc(dryRun: boolean) {
    setLoading(true);
    try {
      const report = await apiRunGarbageCollection(session!.id, dryRun);
      setGcReport(report);
      notifications.show({
        color: "green",
        message: dryRun ? "Xem trước GC hoàn thành." : "GC hoàn thành.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi garbage collection.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag(snapshotId: string, tagName: string) {
    try {
      await apiCreateTag(session!.id, snapshotId, tagName);
      await historyManager.loadHistory(session!.id);
      notifications.show({
        color: "green",
        message: "Đã tạo tag.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tạo tag.",
      });
    }
  }

  async function handleDeleteTag(tagName: string) {
    try {
      await apiDeleteTag(session!.id, tagName);
      await historyManager.loadHistory(session!.id);
      notifications.show({
        color: "green",
        message: "Đã xóa tag.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi xóa tag.",
      });
    }
  }

  async function handleSaveNote(snapshotId: string, content: string) {
    try {
      await apiSaveNote(session!.id, snapshotId, content);
      await historyManager.loadHistory(session!.id);
      notifications.show({
        color: "green",
        message: "Đã lưu ghi chú.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi lưu ghi chú.",
      });
    }
  }

  async function handleDeleteNote(snapshotId: string) {
    try {
      await apiDeleteNote(session!.id, snapshotId);
      await historyManager.loadHistory(session!.id);
      notifications.show({
        color: "green",
        message: "Đã xóa ghi chú.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi xóa ghi chú.",
      });
    }
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    setLoading(true);
    try {
      await apiRestoreSnapshot(session!.id, snapshotId);
      await onLoadSessions();
      await historyManager.loadHistory(session!.id);
      notifications.show({
        color: "green",
        message: "Đã khôi phục snapshot.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi khôi phục snapshot.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <InspectorPanel
      session={session}
      selectedChange={selectedChange}
      diff={diffText}
      onRollback={handleRollback}
      canRollback={canRollback}
      loading={loading}
      history={historyManager.historyView}
      historyLoading={false}
      selectedSnapshotId={historyManager.selectedSnapshotId}
      snapshotDiffs={historyManager.snapshotDiffs}
      selectedSnapshotDiffPath={historyManager.selectedSnapshotDiffPath}
      snapshotDiffText={historyManager.snapshotDiffText}
      lockInfo={historyManager.lockInfo}
      fsckReport={fsckReport}
      gcReport={gcReport}
      onSelectSnapshot={historyManager.selectSnapshot}
      onRefreshHistory={handleRefreshHistory}
      onRunFsck={handleRunFsck}
      onRunGc={handleRunGc}
      onCreateTag={handleCreateTag}
      onDeleteTag={handleDeleteTag}
      onSaveNote={handleSaveNote}
      onDeleteNote={handleDeleteNote}
      onRestoreSnapshot={handleRestoreSnapshot}
      onSelectSnapshotDiffPath={historyManager.selectSnapshotDiffPath}
    />
  );
}
