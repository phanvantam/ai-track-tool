import { Alert, Button, Flex, Modal, Tabs, Typography } from "antd";
import { useMemo, useState } from "react";
import {
  IconCheck,
  IconDatabaseCog,
  IconHistory,
  IconPlaylistX,
  IconWand,
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

/**
 * Inspector chính bằng AntD Tabs và Drawer.
 */
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
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);

  const selectedSnapshot =
    history?.snapshots.find((snapshot) => snapshot.snapshotId === selectedSnapshotId) ??
    history?.snapshots.find((snapshot) => snapshot.isActive) ??
    null;

  const items = useMemo(
    () => [
      {
        key: "diff",
        label: (
          <Flex align="center" gap={6}>
            <IconWand size={14} />
            <span>Diff</span>
          </Flex>
        ),
        children: (
          <DiffTab
            selectedChange={selectedChange}
            diff={diff}
            onRollback={onRollback}
            canRollback={canRollback}
            loading={loading}
          />
        ),
      },
      {
        key: "history",
        label: (
          <Flex align="center" gap={6}>
            <IconHistory size={14} />
            <span>History</span>
          </Flex>
        ),
        children: (
          <HistoryTab
            history={history}
            historyLoading={historyLoading}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={onSelectSnapshot}
            onRefreshHistory={onRefreshHistory}
            onOpenDrawer={() => setDrawerOpened(true)}
          />
        ),
      },
      {
        key: "health",
        label: (
          <Flex align="center" gap={6}>
            <IconDatabaseCog size={14} />
            <span>Health</span>
          </Flex>
        ),
        children: (
          <HealthTab
            lockInfo={lockInfo}
            fsckReport={fsckReport}
            gcReport={gcReport}
            loading={loading}
            onRunFsck={onRunFsck}
            onRunGc={onRunGc}
            onOpenConfirm={setConfirmState}
          />
        ),
      },
      {
        key: "reflog",
        label: (
          <Flex align="center" gap={6}>
            <IconPlaylistX size={14} />
            <span>Reflog</span>
          </Flex>
        ),
        children: <ReflogTab history={history} />,
      },
    ],
    [
      canRollback,
      diff,
      fsckReport,
      gcReport,
      history,
      historyLoading,
      loading,
      lockInfo,
      onRefreshHistory,
      onRollback,
      onRunFsck,
      onRunGc,
      onSelectSnapshot,
      selectedChange,
      selectedSnapshotId,
    ],
  );

  return (
    <div style={{ height: '100%' }}>
      <Tabs 
        defaultActiveKey="diff" 
        items={items}
        style={{ height: '100%' }}
        tabBarStyle={{ marginBottom: 0, padding: '0 16px', background: '#fff' }}
      />

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
        onOpenConfirm={setConfirmState}
      />

      <Modal
        open={Boolean(confirmState)}
        onCancel={() => setConfirmState(null)}
        title={confirmState?.title ?? "Xác nhận thao tác"}
        footer={null}
        centered
        destroyOnHidden
      >
        <Flex vertical gap="middle">
          <Typography.Text strong>{confirmState?.description}</Typography.Text>
          <Alert
            type="warning"
            showIcon
            message="Cảnh báo"
            description={
              <ul>
                {(confirmState?.warnings ?? []).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            }
          />
          <Flex justify="end" gap="small">
            <Button onClick={() => setConfirmState(null)}>Hủy</Button>
            <Button
              type="primary"
              danger={confirmState?.confirmColor === "red"}
              icon={<IconCheck size={14} />}
              onClick={() => {
                confirmState?.onConfirm();
                setConfirmState(null);
              }}
            >
              {confirmState?.confirmLabel ?? "Xác nhận"}
            </Button>
          </Flex>
        </Flex>
      </Modal>
    </div>
  );
}
