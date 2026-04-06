import { useEffect, useState } from "react";
import { notifications } from "./lib/notify";
import { 
  pauseSession as apiPauseSession,
  resumeSession as apiResumeSession,
  removeSession as apiRemoveSession, 
  runFsck as apiRunFsck,
  runGarbageCollection as apiRunGarbageCollection,
  type SessionState 
} from "./api";

import {
  useSessionManager,
  useHistoryManager,
  useDiffManager,
  useConfigManager,
  useConfirmDialog,
  useCommandPalette,
} from "./hooks";
import {
  SessionContainer,
  FileTreeContainer,
  InspectorContainer,
  MainLayout,
} from "./containers";
import {
  ConfirmDialog,
  AddProjectModal,
  SettingsModal,
  GuideModal,
} from "./components/dialogs";
import { CommandPalette } from "./components/CommandPalette";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";

/**
 * App component - Main orchestrator.
 * Tải hooks, quản lý modal states, render layout containers.
 * Tích hợp CommandPalette + KeyboardShortcuts.
 */
export default function App() {
  // Custom hooks quản lý business logic
  const sessionManager = useSessionManager();
  const historyManager = useHistoryManager();
  const diffManager = useDiffManager();
  const configManager = useConfigManager();
  const confirmDialog = useConfirmDialog();

  // Command palette state
  const commandPalette = useCommandPalette(sessionManager.sessions);

  // Modal states
  const [addProjectOpened, setAddProjectOpened] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [guideOpened, setGuideOpened] = useState(false);
  const [addProgress, setAddProgress] = useState(12);
  const [addingSession, setAddingSession] = useState(false);
  const [fsckReport, setFsckReport] = useState<any>(null);
  const [gcReport, setGcReport] = useState<any>(null);

  const activeSession = sessionManager.sessions.find(
    (session) => session.id === sessionManager.activeSessionId,
  ) ?? null;

  // Tải history khi active session thay đổi
  useEffect(() => {
    if (activeSession && historyManager.historyView === null) {
      void historyManager.loadHistory(activeSession.id);
    }
  }, [activeSession?.id]);

  // Tải diff khi selected path hoặc fullContext thay đổi
  useEffect(() => {
    if (
      activeSession &&
      diffManager.selectedPath &&
      diffManager.selectedPathType === "file"
    ) {
      // Nếu file đã bị đánh dấu bỏ qua diff (quá lớn) → không cần gọi API
      const change = activeSession.changes.find((c) => c.path === diffManager.selectedPath);
      if (change?.diffSkipped) return;

      void diffManager.loadCurrentDiff(activeSession, diffManager.selectedPath, diffManager.fullContext);
    }
  }, [activeSession?.id, diffManager.selectedPath, diffManager.fullContext]);

  // So sánh mốc hiện tại → mốc chọn: cho thấy khi restore sẽ thay đổi gì
  // (from = active, to = selected) → added = file sẽ được thêm, deleted = file sẽ bị xóa
  useEffect(() => {
    if (
      activeSession &&
      historyManager.selectedSnapshotId &&
      historyManager.selectedSnapshotId !== activeSession.snapshotId &&
      historyManager.snapshotDiffs.length === 0
    ) {
      void historyManager.loadSnapshotDiff(
        activeSession.id,
        activeSession.snapshotId,
        historyManager.selectedSnapshotId,
      );
    }
  }, [activeSession?.id, historyManager.selectedSnapshotId]);

  // Tải diff text file: cùng chiều active → selected
  useEffect(() => {
    if (
      activeSession &&
      historyManager.selectedSnapshotId &&
      historyManager.selectedSnapshotDiffPath &&
      historyManager.selectedSnapshotId !== activeSession.snapshotId
    ) {
      void historyManager.loadSnapshotFileDiff(
        activeSession.id,
        activeSession.snapshotId,
        historyManager.selectedSnapshotId,
        historyManager.selectedSnapshotDiffPath,
      );
    }
  }, [
    activeSession?.id,
    historyManager.selectedSnapshotId,
    historyManager.selectedSnapshotDiffPath,
  ]);

  // Handle add session
  async function handleAddSession(path: string) {
    setAddingSession(true);
    const progressInterval = window.setInterval(() => {
      setAddProgress((prev) =>
        prev >= 92 ? prev : Math.min(prev + 9, 92),
      );
    }, 180);

    try {
      await sessionManager.addSession(path);
      setAddProgress(100);
      setAddProjectOpened(false);
    } finally {
      window.clearInterval(progressInterval);
      setAddingSession(false);
      setAddProgress(12);
    }
  }

  // Xác nhận dừng theo dõi
  function openPauseConfirm() {
    if (!activeSession) return;
    confirmDialog.openConfirm(
      "Dừng theo dõi?",
      "Hệ thống sẽ không tự động nhận diện thay đổi file nữa.",
      async () => {
        confirmDialog.setLoading(true);
        try {
          await apiPauseSession(activeSession.id);
          await sessionManager.loadSessions();
          notifications.show({ color: "green", message: "Đã dừng theo dõi." });
          confirmDialog.closeConfirm();
        } catch (error) {
          notifications.show({
            color: "red",
            message: error instanceof Error ? error.message : "Lỗi dừng theo dõi.",
          });
        } finally {
          confirmDialog.setLoading(false);
        }
      },
      "warning",
    );
  }

  // Xác nhận tiếp tục theo dõi
  function openResumeConfirm() {
    if (!activeSession) return;
    confirmDialog.openConfirm(
      "Tiếp tục theo dõi?",
      "Hệ thống sẽ bắt đầu theo dõi thay đổi file realtime.",
      async () => {
        confirmDialog.setLoading(true);
        try {
          await apiResumeSession(activeSession.id);
          await sessionManager.loadSessions();
          notifications.show({ color: "green", message: "Đã tiếp tục theo dõi." });
          confirmDialog.closeConfirm();
        } catch (error) {
          notifications.show({
            color: "red",
            message: error instanceof Error ? error.message : "Lỗi tiếp tục theo dõi.",
          });
        } finally {
          confirmDialog.setLoading(false);
        }
      },
      "success",
    );
  }

  // Xác nhận xóa project
  function openRemoveConfirm() {
    if (!activeSession) return;
    confirmDialog.openConfirm(
      "Xác nhận Xóa Project và Dữ liệu",
      `Bạn có chắc muốn xóa project "${activeSession.targetPath}" cùng toàn bộ dữ liệu .ai-track? Không thể hoàn tác.`,
      async () => {
        confirmDialog.setLoading(true);
        try {
          await apiRemoveSession(activeSession.id);
          await sessionManager.loadSessions();
          notifications.show({ color: "green", message: "Đã xóa project." });
          confirmDialog.closeConfirm();
        } catch (error) {
          notifications.show({
            color: "red",
            message: error instanceof Error ? error.message : "Lỗi xóa project.",
          });
        } finally {
          confirmDialog.setLoading(false);
        }
      },
      "error",
    );
  }

  // Select path và xác định type
  function handleSelectPath(path: string, type: "file" | "folder") {
    diffManager.selectFile(path, activeSession ?? undefined);
    diffManager.setPathType(type);
  }

  // Render
  return (
    <>
      <MainLayout
        sessionBar={
          <SessionContainer
            sessions={sessionManager.sessions}
            activeSessionId={sessionManager.activeSessionId}
            onSwitchSession={sessionManager.switchSession}
            onAddProject={() => setAddProjectOpened(true)}
            onSettings={() => setSettingsOpened(true)}
            onGuide={() => setGuideOpened(true)}
            onRequestPause={openPauseConfirm}
            onRequestResume={openResumeConfirm}
            onRemoveSession={openRemoveConfirm}
          />
        }
        fileTree={
          <FileTreeContainer
            session={activeSession}
            selectedPath={diffManager.selectedPath}
            selectedPathType={diffManager.selectedPathType}
            onSelectPath={handleSelectPath}
            onLoadSessions={sessionManager.loadSessions}
            historyManager={historyManager}
            fsckReport={fsckReport}
            gcReport={gcReport}
            onRunFsck={async (repair) => {
              if (!activeSession) return;
              const report = await apiRunFsck(activeSession.id, repair);
              setFsckReport(report);
            }}
            onRunGc={async (dryRun) => {
              if (!activeSession) return;
              const report = await apiRunGarbageCollection(activeSession.id, dryRun);
              setGcReport(report);
            }}
          />
        }
        inspector={
          <InspectorContainer
            session={activeSession}
            selectedPath={diffManager.selectedPath}
            selectedPathType={diffManager.selectedPathType}
            selectedChange={
              activeSession &&
              diffManager.selectedPathType === "file"
                ? activeSession.changes.find(
                    (c) => c.path === diffManager.selectedPath,
                  ) ?? null
                : null
            }
            diffText={diffManager.diffText}
            fullContext={diffManager.fullContext}
            onToggleFullContext={() => diffManager.setFullContext(!diffManager.fullContext)}
            onLoadSessions={sessionManager.loadSessions}
          />
        }
      />

      {/* Dialogs */}
      <AddProjectModal
        isOpen={addProjectOpened}
        onClose={() => {
          if (!addingSession) setAddProjectOpened(false);
        }}
        onAdd={handleAddSession}
        loading={addingSession}
        progress={addProgress}
      />

      <SettingsModal
        isOpen={settingsOpened}
        onClose={() => {
          if (!configManager.savingConfig) setSettingsOpened(false);
        }}
        config={configManager.config}
        onSave={(storageDir, bulkCollapseThreshold) => configManager.saveConfig(storageDir, bulkCollapseThreshold)}
        loading={configManager.savingConfig}
      />

      <GuideModal isOpen={guideOpened} onClose={() => setGuideOpened(false)} />

      <ConfirmDialog
        confirmState={confirmDialog.confirmState}
        onConfirm={async () => {
          confirmDialog.confirmState.onConfirm &&
            (await confirmDialog.confirmState.onConfirm());
        }}
        onCancel={() => confirmDialog.closeConfirm()}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={() => commandPalette.setIsOpen(false)}
        searchQuery={commandPalette.searchQuery}
        onSearchChange={commandPalette.setSearchQuery}
        results={commandPalette.results}
        selectedIndex={commandPalette.selectedIndex}
      />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onOpenCommandPalette={() => commandPalette.setIsOpen(true)}
        onOpenGuide={() => setGuideOpened(true)}
        onSaveConfig={() => {
          if (configManager.config) {
            void configManager.saveConfig(configManager.config.config.storageDir);
          }
        }}
        onRefreshSession={async () => {
          if (activeSession) {
            await sessionManager.loadSessions();
          }
        }}
        onDeleteSelected={() => {
          // TODO: Implement delete selected item
        }}
      />
    </>
  );
}
