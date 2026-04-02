import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
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
  onRemoveSession: (sessionId: string) => void;
}

/**
 * Container quản lý session list + toolbar.
 * Xử lý refresh, pause, resume session operations.
 */
export function SessionContainer({
  sessions,
  activeSessionId,
  onSwitchSession,
  onAddProject,
  onSettings,
  onRemoveSession,
}: SessionContainerProps) {
  const [loading, setLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

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

  async function handlePause() {
    if (!activeSession) return;
    setLoading(true);
    try {
      await apiPauseSession(activeSession.id);
      notifications.show({
        color: "green",
        message: "Đã tạm dừng session.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tạm dừng session.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    if (!activeSession) return;
    setLoading(true);
    try {
      await apiResumeSession(activeSession.id);
      notifications.show({
        color: "green",
        message: "Đã tiếp tục session.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tiếp tục session.",
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
      onPause={handlePause}
      onResume={handleResume}
      onRemove={handleRemove}
    />
  );
}
