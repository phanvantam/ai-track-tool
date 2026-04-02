export type ChangeType = "added" | "modified" | "deleted" | "renamed";

export interface FileMetadata {
  path: string;
  hash: string;
  size: number;
  mtimeMs: number;
  isBinary: boolean;
  binaryType?: BinaryFileInfo["type"];
  symlink?: SymlinkInfo;
  inode?: number;
  uid?: number;
  gid?: number;
  mode?: number;
}

export interface SnapshotMetadata {
  scannedAt: string;
  osType: NodeJS.Platform;
  filesMetadata: Record<string, FileMetadata>;
}

export interface MetadataCache {
  version: number;
  targetPath: string;
  scannedAt: string;
  osType: NodeJS.Platform;
  files: Record<string, FileMetadata>;
}

export type FsckErrorType = "hash_mismatch" | "missing_file" | "orphan_file" | "corrupt_manifest" | "size_mismatch";

export interface FsckError {
  type: FsckErrorType;
  path?: string;
  expected?: string;
  actual?: string;
  severity: "critical" | "warning";
  fixable: boolean;
  repaired?: boolean;
}

export interface FSCKReport {
  isHealthy: boolean;
  errors: FsckError[];
  repairs: string[];
  timestamp: string;
}

export interface GarbageCollectionConfig {
  enabled: boolean;
  retentionDays: number;
  maxFullCopies: number;
  autoRun: boolean;
}

export type MergeStrategy = "ours" | "theirs" | "manual" | "combined";

export interface ConflictChunk {
  startLine: number;
  endLine: number;
  oursLines: string[];
  theirsLines: string[];
}

export interface MergeConflict {
  path: string;
  type: "content" | "delete_modify" | "binary";
  base: string;
  ours: string;
  theirs: string;
  conflicts: ConflictChunk[];
}

export interface MergeResult {
  status: "success" | "conflict" | "error";
  conflicts: MergeConflict[];
  merged?: string;
  strategy: MergeStrategy;
  resolution?: string;
}

export type TransactionStatus = "started" | "completed" | "rolled_back" | "failed";

export type TransactionOperationType = "restore_file" | "delete_file" | "delete_dir";

export interface TransactionOperation {
  type: TransactionOperationType;
  path: string;
  backupPath?: string;
  symlinkTarget?: string;
}

export interface Transaction {
  transactionId: string;
  operation: string;
  status: TransactionStatus;
  createdAt: string;
  completedAt?: string;
  steps: TransactionOperation[];
}

export interface TransactionJournalEntry {
  transactionId: string;
  operation: string;
  status: TransactionStatus;
  kind: "begin" | "step" | "commit" | "rollback";
  timestamp: string;
  step?: TransactionOperation;
}

export interface TransactionJournal {
  entries: TransactionJournalEntry[];
}

export interface LockInfo {
  lockId: string;
  processId: number;
  operation: string;
  timestamp: string;
  expiresAt: string;
}

export interface SnapshotChain {
  snapshotId: string;
  parentSnapshotId: string | null;
  childSnapshotIds: string[];
  createdAt: string;
  summary?: string;
}

export type ReflogAction = "create" | "reset" | "rollback" | "merge" | "tag" | "note" | "gc" | "restore";

export interface ReflogEntry {
  id: string;
  timestamp: string;
  action: ReflogAction;
  fromSnapshotId?: string;
  toSnapshotId?: string;
  reason?: string;
  author?: string;
  filesAffected?: number;
  metadata?: Record<string, string>;
}

export interface SnapshotTag {
  name: string;
  snapshotId: string;
  createdAt: string;
  author?: string;
}

export interface SnapshotAnnotation {
  snapshotId: string;
  content: string;
  createdAt: string;
  author?: string;
}

export interface SnapshotDelta {
  snapshotId: string;
  parentSnapshotId: string | null;
  fileDeltas: Record<string, {
    deltaPath: string;
    originalHash: string;
    compressedSize: number;
    uncompressedSize: number;
  }>;
  createdAt: string;
}

export interface DirectoryRename {
  oldPath: string;
  newPath: string;
  filesAffected: number;
  confidence: number;
  detection: "hash_match" | "path_pattern" | "heuristic";
}

export interface BinaryFileInfo {
  filePath: string;
  size: number;
  hash: string;
  modified: boolean;
  type: "image" | "archive" | "executable" | "document" | "other";
}

export interface HunkInfo {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface CherryPickResult {
  success: boolean;
  appliedHunks: number;
  conflicts: string[];
}

export interface PatchMetadata {
  sourceSnapshot: string;
  targetSnapshot: string;
  timestamp: string;
  filesAffected: string[];
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

export interface StashEntry {
  stashId: string;
  message: string;
  createdAt: string;
  baseSnapshotId: string;
  patch: string;
  stats: {
    filesAffected: number;
    insertions: number;
    deletions: number;
  };
}

export interface IgnoreValidationError {
  line: number;
  rule: string;
  error: "invalid_regex" | "too_broad" | "syntax_error" | "unknown";
  message: string;
  suggestion?: string;
}

export interface SymlinkInfo {
  filePath: string;
  target: string;
  hash: string;
  isAbsolute: boolean;
}

export interface FilesystemConfig {
  caseInsensitive: boolean;
  casePreserving: boolean;
}

export interface ShallowConfig {
  shallow: boolean;
  depth?: number;
  sparseCheckout?: boolean;
  sparsePatterns?: string[];
}

export interface SnapshotFileEntry extends FileMetadata {
  storageKind?: "full" | "delta" | "reference" | "symlink";
  baseSnapshotId?: string | null;
  deltaPath?: string;
  compressedSize?: number;
  uncompressedSize?: number;
  binaryType?: BinaryFileInfo["type"];
  symlink?: SymlinkInfo;
}

export interface SnapshotManifest {
  snapshotId: string;
  parentSnapshotId?: string | null;
  createdAt: string;
  targetPath: string;
  ignoreRules: string[];
  files: SnapshotFileEntry[];
  metadata?: SnapshotMetadata;
  lastTransactionId?: string;
  lastMergeStrategy?: MergeStrategy;
  author?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  checksum?: string;
}

export interface TrackState {
  activeSnapshotId: string;
  targetPath: string;
  storagePath: string;
  updatedAt: string;
  metadataCacheVersion?: number;
  lastTransactionId?: string;
  previousSnapshotId?: string;
  snapshotHistory?: string[];
  filesystemConfig?: FilesystemConfig;
  shallowConfig?: ShallowConfig;
}

export interface CurrentFileEntry extends FileMetadata {
  absolutePath: string;
  needsHashCheck: boolean;
  content?: Buffer;
}

export interface ChangeEntry {
  path: string;
  type: ChangeType;
  isBinary: boolean;
  beforeAbsolutePath: string | null;
  afterAbsolutePath: string | null;
  oldPath?: string; // For renamed files
  directoryRename?: DirectoryRename;
  insertions?: number;
  deletions?: number;
  /** Khi có giá trị, entry này đại diện cho N files cùng folder đã gom nhóm */
  collapsedCount?: number;
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

export interface SessionHistoryEntry {
  snapshotId: string;
  parentSnapshotId: string | null;
  createdAt: string;
  summary?: string;
  fileCount: number;
  isActive: boolean;
  tags: string[];
  note: SnapshotAnnotation | null;
  /** Thống kê file thay đổi so với parent snapshot (tính bằng hash comparison) */
  diffStats?: { added: number; modified: number; deleted: number };
}

export interface SessionHistoryView {
  graph: string;
  snapshots: SessionHistoryEntry[];
  reflog: ReflogEntry[];
  reflogStats: {
    totalEntries: number;
    actionCounts: Record<string, number>;
    oldestEntry?: ReflogEntry;
    newestEntry?: ReflogEntry;
  };
}

export interface WebSession {
  summary: SessionSummary;
  stop: () => void;
}
