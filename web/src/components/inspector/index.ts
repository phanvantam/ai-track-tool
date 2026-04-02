/**
 * Inspector components - 5 tabs + drawer + 3 drawer tabs
 * Exports: DiffTab, HistoryTab, HealthTab, ReflogTab, SnapshotDrawer
 * + 3 DrawerTabs, Helpers & Types
 */

export { DiffTab } from "./DiffTab";
export { HistoryTab } from "./HistoryTab";
export { HealthTab } from "./HealthTab";
export { ReflogTab } from "./ReflogTab";
export { SnapshotDrawer } from "./SnapshotDrawer";

// Internal exports (không cần từ bên ngoài)
export { SnapshotDrawerOverviewTab } from "./SnapshotDrawerOverviewTab";
export { SnapshotDrawerMetadataTab } from "./SnapshotDrawerMetadataTab";
export { SnapshotDrawerCompareTab } from "./SnapshotDrawerCompareTab";

export type {
  DiffTabProps,
  HistoryTabProps,
  HealthTabProps,
  ReflogTabProps,
  SnapshotDrawerProps,
  ConfirmDialogState,
} from "./types";

export {
  formatTimestamp,
  shortId,
  countChildSnapshots,
  countBranchNodes,
  labelForDiffType,
  getDiffLineClass,
} from "./helpers";
