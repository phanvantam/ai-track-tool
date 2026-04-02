import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  addSession as apiAddSession,
  getState,
  removeSession as apiRemoveSession,
  subscribeSessions,
  type SessionState,
} from "../api";

interface UseSessionManagerReturn {
  sessions: SessionState[];
  activeSessionId: string | null;
  loadSessions: () => Promise<void>;
  addSession: (path: string) => Promise<SessionState | null>;
  removeSession: (sessionId: string) => Promise<void>;
  switchSession: (sessionId: string) => void;
}

/**
 * Quản lý danh sách sessions và trạng thái session hiện tại.
 * Tự động cập nhật khi sessions thay đổi từ backend.
 */
export function useSessionManager(): UseSessionManagerReturn {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions từ backend
  async function loadSessions() {
    try {
      const payload = await getState();
      setSessions(payload.sessions);
      setActiveSessionId((current) => {
        // Giữ session hiện tại nếu vẫn còn
        if (current && payload.sessions.some((session) => session.id === current)) {
          return current;
        }
        // Nếu không, chọn session đầu tiên
        return payload.sessions[0]?.id ?? null;
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi tải danh sách sessions.",
      });
    }
  }

  // Thêm session mới
  async function handleAddSession(path: string): Promise<SessionState | null> {
    try {
      const session = await apiAddSession(path);
      await loadSessions();
      setActiveSessionId(session.id);
      notifications.show({
        color: "green",
        message: "Đã thêm project mới.",
      });
      return session;
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Không thêm được project.",
      });
      return null;
    }
  }

  // Xóa session
  async function handleRemoveSession(sessionId: string) {
    try {
      await apiRemoveSession(sessionId);
      await loadSessions();
      notifications.show({
        color: "green",
        message: "Đã xóa project.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Không xóa được project.",
      });
    }
  }

  // Chuyển sang session khác
  function handleSwitchSession(sessionId: string) {
    if (sessions.some((s) => s.id === sessionId)) {
      setActiveSessionId(sessionId);
    }
  }

  // Đăng ký subscribe sessions từ backend
  useEffect(() => {
    void loadSessions();
    const unsubscribe = subscribeSessions(
      () => {
        void loadSessions();
      },
      (message) => {
        notifications.show({ color: "red", message });
      },
    );

    return unsubscribe;
  }, []);

  return {
    sessions,
    activeSessionId,
    loadSessions,
    addSession: handleAddSession,
    removeSession: handleRemoveSession,
    switchSession: handleSwitchSession,
  };
}
