/**
 * Types dùng chung cho Inspector tabs
 */

import type {
  ChangeEntry,
  FsckReport,
  GarbageCollectionReport,
  LockInfo,
  SessionHistoryView,
  SnapshotDiffEntry,
} from "../../api";

/**
 * Props cho DiffTab - tab hiển thị diff file
 */
export interface DiffTabProps {
  selectedChange: ChangeEntry | null;
  diff: string;
  /** Chế độ xem toàn bộ file */
  fullContext: boolean;
  /** Toggle giữa diff rút gọn / toàn bộ file */
  onToggleFullContext: () => void;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

/**
 * Props cho HistoryTab - tab hiển thị snapshot history
 */
export interface HistoryTabProps {
  history: SessionHistoryView | null;
  historyLoading: boolean;
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshotId: string) => void;
  onRefreshHistory: () => void;
  onOpenDrawer: () => void;
}

/**
 * Props cho HealthTab - tab hiển thị FSCK, GC, lock info
 */
export interface HealthTabProps {
  lockInfo: LockInfo | null;
  fsckReport: FsckReport | null;
  gcReport: GarbageCollectionReport | null;
  loading: boolean;
  onRunFsck: (repair: boolean) => void;
  onRunGc: (dryRun: boolean) => void;
  onOpenConfirm: (state: ConfirmDialogState) => void;
}

/**
 * Props cho ReflogTab - tab hiển thị reflog entries
 */
export interface ReflogTabProps {
  history: SessionHistoryView | null;
}

/**
 * Props cho SnapshotDrawer - drawer chi tiết snapshot
 */
export interface SnapshotDrawerProps {
  opened: boolean;
  onClose: () => void;
  selectedSnapshot: SessionHistoryView["snapshots"][0] | null;
  snapshotDiffs: SnapshotDiffEntry[];
  selectedSnapshotDiffPath: string | null;
  snapshotDiffText: string;
  loading: boolean;
  onSelectSnapshotDiffPath: (path: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onCreateTag: (snapshotId: string, tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onSaveNote: (snapshotId: string, content: string) => void;
  onDeleteNote: (snapshotId: string) => void;
  onOpenConfirm: (state: ConfirmDialogState) => void;
}

/**
 * State cho confirm dialog - dùng chung cho tất cả tabs
 */
export interface ConfirmDialogState {
  title: string;
  description: string;
  warnings: string[];
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
}
