export type ChangeType = "added" | "modified" | "deleted" | "renamed";

export interface SnapshotFileEntry {
  path: string;
  hash: string;
  size: number;
  mtimeMs: number;
  isBinary: boolean;
}

export interface SnapshotManifest {
  snapshotId: string;
  createdAt: string;
  targetPath: string;
  ignoreRules: string[];
  files: SnapshotFileEntry[];
}

export interface TrackState {
  activeSnapshotId: string;
  targetPath: string;
  storagePath: string;
  updatedAt: string;
}

export interface CurrentFileEntry {
  path: string;
  absolutePath: string;
  hash: string;
  size: number;
  mtimeMs: number;
  isBinary: boolean;
}

export interface ChangeEntry {
  path: string;
  type: ChangeType;
  isBinary: boolean;
  beforeAbsolutePath: string | null;
  afterAbsolutePath: string | null;
  oldPath?: string; // For renamed files
}

export type WatchStatus = "idle" | "watching" | "refreshing" | "error";

export interface WatchController {
  stop: () => void;
}

export interface SessionSummary {
  id: string;
  targetPath: string;
  storagePath: string;
  snapshotId: string;
  watchStatus: WatchStatus;
  changeCount: number;
  lastError: string | null;
}

export interface SessionState extends SessionSummary {
  changes: ChangeEntry[];
}

export interface WebSession {
  summary: SessionSummary;
  stop: () => void;
}
