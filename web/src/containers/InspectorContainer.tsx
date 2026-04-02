import { useState } from "react";
import { notifications } from "../lib/notify";
import {
  rollback as apiRollback,
  type SessionState,
} from "../api";
import { InspectorPanel } from "../components/InspectorPanel";

interface InspectorContainerProps {
  session: SessionState | null;
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  selectedChange: any; // ChangeEntry | null
  diffText: string;
  onLoadSessions: () => Promise<void>;
}

/**
 * Container cho Inspector — chỉ quản lý Diff + rollback.
 * History/Health/Reflog đã chuyển sang sidebar.
 */
export function InspectorContainer({
  session,
  selectedPath,
  selectedPathType,
  selectedChange,
  diffText,
  onLoadSessions,
}: InspectorContainerProps) {
  const [loading, setLoading] = useState(false);

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

  return (
    <InspectorPanel
      selectedPath={selectedPath}
      selectedChange={selectedChange}
      diff={diffText}
      onRollback={handleRollback}
      canRollback={canRollback}
      loading={loading}
    />
  );
}
