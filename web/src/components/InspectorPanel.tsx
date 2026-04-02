/**
 * InspectorPanel - Orchestrator component
 * Quản lý 5 tabs (Diff/History/Health/Reflog) + SnapshotDrawer
 * Xử lý tab selection, state chung (confirmState), props passing
 */

import { useState } from "react";
import { Button, Group, Modal, Stack, Tabs, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconDatabaseCog,
  IconHistory,
  IconPlaylistX,
  IconWand,
  IconX,
} from "@tabler/icons-react";

import type {
  ChangeEntry,
  FsckReport,
  GarbageCollectionReport,
  LockInfo,
  SessionHistoryView,
  SessionState,
  SnapshotDiffEntry,
} from "../api";
import {
  DiffTab,
  HistoryTab,
  HealthTab,
  ReflogTab,
  SnapshotDrawer,
  type ConfirmDialogState,
} from "./inspector";
import layoutStyles from "../styles/layout.module.css";

interface InspectorPanelProps {
  session: SessionState;
  selectedChange: ChangeEntry | null;
  diff: string;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
  history: SessionHistoryView | null;
  historyLoading: boolean;
  selectedSnapshotId: string | null;
  snapshotDiffs: SnapshotDiffEntry[];
  selectedSnapshotDiffPath: string | null;
  snapshotDiffText: string;
  lockInfo: LockInfo | null;
  fsckReport: FsckReport | null;
  gcReport: GarbageCollectionReport | null;
  onSelectSnapshot: (snapshotId: string) => void;
  onRefreshHistory: () => void;
  onRunFsck: (repair: boolean) => void;
  onRunGc: (dryRun: boolean) => void;
  onCreateTag: (snapshotId: string, tagName: string) => void;
  onDeleteTag: (tagName: string) => void;
  onSaveNote: (snapshotId: string, content: string) => void;
  onDeleteNote: (snapshotId: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onSelectSnapshotDiffPath: (relativePath: string) => void;
}

export function InspectorPanel({
  session,
  selectedChange,
  diff,
  onRollback,
  canRollback,
  loading,
  history,
  historyLoading,
  selectedSnapshotId,
  snapshotDiffs,
  selectedSnapshotDiffPath,
  snapshotDiffText,
  lockInfo,
  fsckReport,
  gcReport,
  onSelectSnapshot,
  onRefreshHistory,
  onRunFsck,
  onRunGc,
  onCreateTag,
  onDeleteTag,
  onSaveNote,
  onDeleteNote,
  onRestoreSnapshot,
  onSelectSnapshotDiffPath,
}: InspectorPanelProps) {
  // State chung cho tất cả tabs
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(
    null
  );
  const [drawerOpened, setDrawerOpened] = useState(false);

  // Lấy selected snapshot từ history
  const selectedSnapshot =
    history?.snapshots.find(
      (snapshot) => snapshot.snapshotId === selectedSnapshotId
    ) ??
    history?.snapshots.find((snapshot) => snapshot.isActive) ??
    null;

  function openConfirm(state: ConfirmDialogState) {
    setConfirmState(state);
  }

  function handleConfirm() {
    confirmState?.onConfirm();
    setConfirmState(null);
  }

  return (
    <div className={layoutStyles.inspectorContainer}>
      <Tabs defaultValue="diff" className={layoutStyles.inspectorTabs}>
        <Tabs.List className={layoutStyles.inspectorTabsList}>
          <Tabs.Tab value="diff" leftSection={<IconWand size={14} stroke={1.8} />}>
            Diff
          </Tabs.Tab>
          <Tabs.Tab
            value="history"
            leftSection={<IconHistory size={14} stroke={1.8} />}
          >
            History
          </Tabs.Tab>
          <Tabs.Tab
            value="health"
            leftSection={<IconDatabaseCog size={14} stroke={1.8} />}
          >
            Health
          </Tabs.Tab>
          <Tabs.Tab
            value="reflog"
            leftSection={<IconPlaylistX size={14} stroke={1.8} />}
          >
            Reflog
          </Tabs.Tab>
        </Tabs.List>

         {/* Diff Tab */}
        <Tabs.Panel value="diff" className={layoutStyles.inspectorPanelFill}>
          <DiffTab
            selectedChange={selectedChange}
            diff={diff}
            onRollback={onRollback}
            canRollback={canRollback}
            loading={loading}
          />
        </Tabs.Panel>

        {/* History Tab */}
        <Tabs.Panel value="history" className={layoutStyles.inspectorPanelFill}>
          <HistoryTab
            history={history}
            historyLoading={historyLoading}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={onSelectSnapshot}
            onRefreshHistory={onRefreshHistory}
            onOpenDrawer={() => setDrawerOpened(true)}
          />
        </Tabs.Panel>

        {/* Health Tab */}
        <Tabs.Panel value="health" className={layoutStyles.inspectorPanelFill}>
          <HealthTab
            lockInfo={lockInfo}
            fsckReport={fsckReport}
            gcReport={gcReport}
            loading={loading}
            onRunFsck={onRunFsck}
            onRunGc={onRunGc}
            onOpenConfirm={openConfirm}
          />
        </Tabs.Panel>

        {/* Reflog Tab */}
        <Tabs.Panel value="reflog" className={layoutStyles.inspectorPanelFill}>
          <ReflogTab history={history} />
        </Tabs.Panel>
      </Tabs>

      {/* Snapshot Drawer */}
      <SnapshotDrawer
        opened={drawerOpened && !!selectedSnapshot}
        onClose={() => setDrawerOpened(false)}
        selectedSnapshot={selectedSnapshot}
        snapshotDiffs={snapshotDiffs}
        selectedSnapshotDiffPath={selectedSnapshotDiffPath}
        snapshotDiffText={snapshotDiffText}
        loading={loading}
        onSelectSnapshotDiffPath={onSelectSnapshotDiffPath}
        onRestoreSnapshot={onRestoreSnapshot}
        onCreateTag={onCreateTag}
        onDeleteTag={onDeleteTag}
        onSaveNote={onSaveNote}
        onDeleteNote={onDeleteNote}
        onOpenConfirm={openConfirm}
      />

      {/* Confirm Dialog */}
      <Modal
        opened={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? "Xác nhận thao tác"}
        centered
        radius="md"
        size="md"
      >
        <Stack gap="md">
          <Group gap="sm" align="flex-start">
            <IconAlertTriangle
              size={24}
              stroke={1.8}
              style={{
                color: "#f59e0b",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {confirmState?.description}
              </Text>
              <Text size="sm" c="dimmed">
                Thao tác này có thể làm thay đổi dữ liệu đang lưu trong session
                hiện tại.
              </Text>
            </Stack>
          </Group>
          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              padding: "12px",
              borderRadius: "6px",
              borderLeft: "3px solid #f59e0b",
            }}
          >
            <Group gap={6} mb={6}>
              <IconAlertTriangle
                size={16}
                stroke={1.8}
                style={{ color: "#fbbf24" }}
              />
              <Text size="xs" fw={600} c="yellow.4">
                CẢNH BÁO
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              <Text component="span" style={{ whiteSpace: "pre-line" }}>
                {(confirmState?.warnings ?? [])
                  .map((warning) => `• ${warning}`)
                  .join("\n")}
              </Text>
            </Text>
          </div>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmState(null)}
              leftSection={<IconX size={16} stroke={1.8} />}
            >
              Hủy
            </Button>
            <Button
              color={confirmState?.confirmColor ?? "red"}
              onClick={handleConfirm}
              leftSection={<IconCheck size={16} stroke={1.8} />}
            >
              {confirmState?.confirmLabel ?? "Xác nhận"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
