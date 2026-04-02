import { useEffect, useState } from "react";
import { notifications } from "./lib/notify";
import { removeSession as apiRemoveSession, type SessionState } from "./api";

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
  const [removeConfirmOpened, setRemoveConfirmOpened] = useState(false);

  const activeSession = sessionManager.sessions.find(
    (session) => session.id === sessionManager.activeSessionId,
  ) ?? null;

  // Tải history khi active session thay đổi
  useEffect(() => {
    if (activeSession && historyManager.historyView === null) {
      void historyManager.loadHistory(activeSession.id);
    }
  }, [activeSession?.id]);

  // Tải diff khi selected path thay đổi
  useEffect(() => {
    if (
      activeSession &&
      diffManager.selectedPath &&
      diffManager.selectedPathType === "file"
    ) {
      void diffManager.loadCurrentDiff(activeSession, diffManager.selectedPath);
    }
  }, [activeSession?.id, diffManager.selectedPath]);

  // Tải snapshot diff khi snapshot selection thay đổi
  useEffect(() => {
    if (
      activeSession &&
      historyManager.selectedSnapshotId &&
      historyManager.selectedSnapshotId !== activeSession.snapshotId &&
      historyManager.snapshotDiffs.length === 0
    ) {
      void historyManager.loadSnapshotDiff(
        activeSession.id,
        historyManager.selectedSnapshotId,
        activeSession.snapshotId,
      );
    }
  }, [activeSession?.id, historyManager.selectedSnapshotId]);

  // Tải snapshot file diff khi path selection thay đổi
  useEffect(() => {
    if (
      activeSession &&
      historyManager.selectedSnapshotId &&
      historyManager.selectedSnapshotDiffPath &&
      historyManager.selectedSnapshotId !== activeSession.snapshotId
    ) {
      void historyManager.loadSnapshotFileDiff(
        activeSession.id,
        historyManager.selectedSnapshotId,
        activeSession.snapshotId,
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

  // Handle remove session
  async function handleConfirmRemove() {
    if (!activeSession) return;
    confirmDialog.setLoading(true);
    try {
      await apiRemoveSession(activeSession.id);
      await sessionManager.loadSessions();
      notifications.show({
        color: "green",
        message: "Đã xóa project.",
      });
      setRemoveConfirmOpened(false);
      confirmDialog.closeConfirm();
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Lỗi xóa project.",
      });
    } finally {
      confirmDialog.setLoading(false);
    }
  }

  function openRemoveConfirm() {
    if (!activeSession) return;
    setRemoveConfirmOpened(true);
    confirmDialog.openConfirm(
      "Xác nhận Xóa Project",
      `Bạn có chắc muốn xóa project: ${activeSession.targetPath}?`,
      handleConfirmRemove,
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
            historyManager={historyManager}
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
        onSave={(storageDir) => configManager.saveConfig(storageDir)}
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
