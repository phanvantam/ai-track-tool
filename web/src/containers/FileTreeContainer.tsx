import { useState } from "react";
import { notifications } from "../lib/notify";
import { 
  type FsckReport,
  type GarbageCollectionReport,
  resetSnapshot as apiResetSnapshot,
  rollback as apiRollback,
  type SessionState,
} from "../api";
import { FileTree } from "../components/FileTree";
import type { useHistoryManager } from "../hooks";

interface FileTreeContainerProps {
  session: SessionState | null;
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  onSelectPath: (path: string, type: "file" | "folder") => void;
  onLoadSessions: () => Promise<void>;
  historyManager: ReturnType<typeof useHistoryManager>;
  fsckReport: FsckReport | null;
  gcReport: GarbageCollectionReport | null;
  onRunFsck: (repair: boolean) => Promise<void>;
  onRunGc: (dryRun: boolean) => Promise<void>;
}

/**
 * Container wrapper FileTree với state management.
 * Quản lý file selection, reset, rollback operations.
 */
export function FileTreeContainer({
  session,
  selectedPath,
  selectedPathType,
  onSelectPath,
  onLoadSessions,
  historyManager,
  fsckReport,
  gcReport,
  onRunFsck,
  onRunGc,
}: FileTreeContainerProps) {
  const [loading, setLoading] = useState(false);
  const [rollbackAllProgress, setRollbackAllProgress] = useState(0);

  if (!session) {
    return null;
  }

  const selectedFolderChanges =
    selectedPathType === "folder" && selectedPath
      ? session.changes.filter(
          (change) =>
            change.path === selectedPath ||
            change.path.startsWith(`${selectedPath}/`) ||
            change.oldPath === selectedPath ||
            change.oldPath?.startsWith(`${selectedPath}/`),
        )
      : [];

  async function handleResetSnapshot() {
    if (!session) return;
    setLoading(true);
    try {
      await apiResetSnapshot(session.id);
      await onLoadSessions();
      notifications.show({
        color: "green",
        message: "Đã đặt lại snapshot.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi đặt lại snapshot.",
      });
    } finally {
      setLoading(false);
    }
  }

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

  async function handleRollbackAll() {
    if (!session) return;
    setLoading(true);
    setRollbackAllProgress(0);
    try {
      const changes = session.changes;
      for (let i = 0; i < changes.length; i += 1) {
        await apiRollback(session.id, changes[i]!.path);
        setRollbackAllProgress(Math.round(((i + 1) / changes.length) * 100));
      }
      await onLoadSessions();
      notifications.show({
        color: "green",
        message: "Đã khôi phục tất cả changes.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi khôi phục.",
      });
    } finally {
      setLoading(false);
      setRollbackAllProgress(0);
    }
  }

  async function handleRollbackFolder() {
    if (!selectedPath || !session || selectedPathType !== "folder") return;
    setLoading(true);
    try {
      for (const change of selectedFolderChanges) {
        await apiRollback(session.id, change.path);
      }
      await onLoadSessions();
      notifications.show({
        color: "green",
        message: `Đã khôi phục folder ${selectedPath}`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi khôi phục folder.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <FileTree
      session={session}
      changes={session.changes}
      selectedPath={selectedPath}
      selectedPathType={selectedPathType}
      selectedFolderChangeCount={0}
      onSelect={onSelectPath}
      onResetSnapshot={handleResetSnapshot}
      onRollbackAll={handleRollbackAll}
      onRollbackFolder={() => {}}
      loading={loading}
      rollbackAllProgress={rollbackAllProgress}
      historyManager={historyManager}
      fsckReport={fsckReport}
      gcReport={gcReport}
      onRunFsck={onRunFsck}
      onRunGc={onRunGc}
    />
  );
}
