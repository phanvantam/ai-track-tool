export type ChangeType = "added" | "modified" | "deleted";

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
}

export type WatchStatus = "idle" | "watching" | "refreshing" | "error";

export interface WatchController {
  stop: () => void;
}
