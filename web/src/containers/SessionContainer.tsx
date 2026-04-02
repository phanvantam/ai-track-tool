import { useState } from "react";
import { notifications } from "../lib/notify";
import {
  pauseSession as apiPauseSession,
  refreshSession as apiRefreshSession,
  resumeSession as apiResumeSession,
  type SessionState,
} from "../api";
import { ProjectToolbar } from "../components/ProjectToolbar";

interface SessionContainerProps {
  sessions: SessionState[];
  activeSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onAddProject: () => void;
  onSettings: () => void;
  /** Gọi khi bấm Pause — App sẽ mở confirm dialog rồi gọi lại executePause */
  onRequestPause: () => void;
  /** Gọi khi bấm Resume — App sẽ mở confirm dialog rồi gọi lại executeResume */
  onRequestResume: () => void;
  /** Gọi khi bấm Xóa — App sẽ mở confirm dialog */
  onRemoveSession: (sessionId: string) => void;
}

/**
 * Container quản lý session list + toolbar.
 * Xử lý refresh trực tiếp; pause, resume, xóa đi qua confirm ở App level.
 */
export function SessionContainer({
  sessions,
  activeSessionId,
  onSwitchSession,
  onAddProject,
  onSettings,
  onRequestPause,
  onRequestResume,
  onRemoveSession,
}: SessionContainerProps) {
  const [loading, setLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  /** Refresh không cần confirm — thao tác an toàn */
  async function handleRefresh() {
    if (!activeSession) return;
    setLoading(true);
    try {
      await apiRefreshSession(activeSession.id);
      notifications.show({
        color: "green",
        message: "Đã làm mới session.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi làm mới session.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    if (!activeSession) return;
    onRemoveSession(activeSession.id);
  }

  return (
    <ProjectToolbar
      sessions={sessions}
      activeSessionId={activeSessionId}
      loading={loading}
      onSessionChange={(sessionId: string | null) => {
        if (sessionId) onSwitchSession(sessionId);
      }}
      onAddProject={onAddProject}
      onSettings={onSettings}
      onRefresh={handleRefresh}
      onPause={onRequestPause}
      onResume={onRequestResume}
      onRemove={handleRemove}
    />
  );
}
