export type ChangeType = "added" | "modified" | "deleted" | "renamed";
export type WatchStatus = "idle" | "watching" | "refreshing" | "error";

export interface DirectoryRename {
  oldPath: string;
  newPath: string;
  filesAffected: number;
  confidence: number;
  detection: string;
}

export interface ChangeEntry {
  path: string;
  type: ChangeType;
  isBinary: boolean;
  oldPath?: string;
  insertions?: number;
  deletions?: number;
  directoryRename?: DirectoryRename;
  /** Khi có giá trị, entry này đại diện cho N files cùng folder đã gom nhóm */
  collapsedCount?: number;
}

export interface SessionState {
  id: string;
  targetPath: string;
  storagePath: string;
  snapshotId: string;
  watchStatus: WatchStatus;
  changeCount: number;
  lastError: string | null;
  changes: ChangeEntry[];
}

export interface FsckError {
  type: "hash_mismatch" | "missing_file" | "orphan_file" | "corrupt_manifest" | "size_mismatch";
  path?: string;
  expected?: string;
  actual?: string;
  severity: "critical" | "warning";
  fixable: boolean;
  repaired?: boolean;
}

export interface FsckReport {
  isHealthy: boolean;
  errors: FsckError[];
  repairs: string[];
  timestamp: string;
}

export interface GarbageCollectionAction {
  type: "remove_snapshot" | "compact_metadata_cache" | "repair_snapshot" | "compress_snapshot" | "skip_delta";
  path?: string;
  details: string;
}

export interface GarbageCollectionReport {
  actions: GarbageCollectionAction[];
  removedSnapshots: string[];
  compactedMetadataEntries: number;
  repairedItems: number;
  dryRun: boolean;
}

export interface ReflogEntry {
  id: string;
  timestamp: string;
  action: "create" | "reset" | "rollback" | "merge" | "tag" | "note" | "gc" | "restore";
  fromSnapshotId?: string;
  toSnapshotId?: string;
  reason?: string;
  author?: string;
  filesAffected?: number;
  metadata?: Record<string, string>;
}

export interface SnapshotAnnotation {
  snapshotId: string;
  content: string;
  createdAt: string;
  author?: string;
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
  /** Thống kê file thay đổi so với parent snapshot */
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

export interface LockInfo {
  lockId: string;
  processId: number;
  operation: string;
  timestamp: string;
  expiresAt: string;
}

export interface SnapshotDiffEntry {
  path: string;
  type: "added" | "modified" | "deleted";
  insertions?: number;
  deletions?: number;
  changeCount?: number;
}

export interface AppConfig {
  storageDir: string | null;
}

export interface ConfigPayload {
  config: AppConfig;
  defaults: {
    tempStorageDir: string;
    effectiveStorageDir: string;
    configFilePath: string;
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();

  if (!contentType.includes("application/json")) {
    const looksLikeHtml = /^\s*<!doctype html>|^\s*<html/i.test(rawBody);
    throw new Error(
      looksLikeHtml
        ? "API trả về HTML thay vì JSON. Hãy kiểm tra web server hoặc cấu hình proxy /api."
        : `API trả về nội dung không phải JSON (${contentType || "unknown"}).`,
    );
  }

  let payload: T & { error?: string };

  try {
    payload = JSON.parse(rawBody) as T & { error?: string };
  } catch {
    throw new Error("API trả về JSON không hợp lệ.");
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "unknown");
  }

  return payload;
}

export async function getState(): Promise<{ sessions: SessionState[] }> {
  return readJson(await fetch("/api/state"));
}

export async function addSession(path: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    }),
  );

  return payload.session;
}

export async function getConfig(): Promise<ConfigPayload> {
  return readJson(await fetch("/api/config"));
}

export async function updateConfig(storageDir: string | null): Promise<ConfigPayload> {
  return readJson(
    await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storageDir }),
    }),
  );
}

export async function getChanges(sessionId: string): Promise<ChangeEntry[]> {
  const payload = await readJson<{ changes: ChangeEntry[] }>(await fetch(`/api/changes?sessionId=${encodeURIComponent(sessionId)}`));
  return payload.changes;
}

export async function getHistory(sessionId: string): Promise<SessionHistoryView> {
  return readJson(await fetch(`/api/history?sessionId=${encodeURIComponent(sessionId)}`));
}

export async function getLock(sessionId: string): Promise<LockInfo | null> {
  const payload = await readJson<{ lock: LockInfo | null }>(await fetch(`/api/lock?sessionId=${encodeURIComponent(sessionId)}`));
  return payload.lock;
}

export async function getSnapshotDiff(sessionId: string, fromSnapshotId: string, toSnapshotId: string): Promise<SnapshotDiffEntry[]> {
  const payload = await readJson<{ diffs: SnapshotDiffEntry[] }>(
    await fetch(`/api/diff-snapshots?sessionId=${encodeURIComponent(sessionId)}&from=${encodeURIComponent(fromSnapshotId)}&to=${encodeURIComponent(toSnapshotId)}`),
  );
  return payload.diffs;
}

export async function getSnapshotFileDiff(sessionId: string, fromSnapshotId: string, toSnapshotId: string, path: string): Promise<string> {
  const payload = await readJson<{ diff: string }>(
    await fetch(
      `/api/diff-snapshot-file?sessionId=${encodeURIComponent(sessionId)}&from=${encodeURIComponent(fromSnapshotId)}&to=${encodeURIComponent(toSnapshotId)}&path=${encodeURIComponent(path)}`,
    ),
  );

  return payload.diff;
}

export async function getDiff(sessionId: string, path: string): Promise<string> {
  const payload = await readJson<{ diff: string }>(
    await fetch(`/api/diff?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`),
  );
  return payload.diff;
}

export async function rollback(sessionId: string, path: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/rollback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, path }),
    }),
  );

  return payload.session;
}

export async function runFsck(sessionId: string, repair = false): Promise<FsckReport> {
  const payload = await readJson<{ report: FsckReport }>(
    await fetch("/api/fsck", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, repair }),
    }),
  );

  return payload.report;
}

export async function runGarbageCollection(sessionId: string, dryRun = false): Promise<GarbageCollectionReport> {
  const payload = await readJson<{ report: GarbageCollectionReport }>(
    await fetch("/api/gc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, dryRun }),
    }),
  );

  return payload.report;
}

export async function createTag(sessionId: string, snapshotId: string, name: string): Promise<SessionHistoryView> {
  const payload = await readJson<{ history: SessionHistoryView }>(
    await fetch("/api/tag", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, snapshotId, name }),
    }),
  );

  return payload.history;
}

export async function deleteTag(sessionId: string, name: string): Promise<SessionHistoryView> {
  const payload = await readJson<{ history: SessionHistoryView }>(
    await fetch("/api/tag", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, name }),
    }),
  );

  return payload.history;
}

export async function saveNote(sessionId: string, snapshotId: string, content: string): Promise<SessionHistoryView> {
  const payload = await readJson<{ history: SessionHistoryView }>(
    await fetch("/api/note", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, snapshotId, content }),
    }),
  );

  return payload.history;
}

export async function deleteNote(sessionId: string, snapshotId: string): Promise<SessionHistoryView> {
  const payload = await readJson<{ history: SessionHistoryView }>(
    await fetch("/api/note", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, snapshotId }),
    }),
  );

  return payload.history;
}

export async function resetSnapshot(sessionId: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/reset-snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),
  );

  return payload.session;
}

export async function restoreSnapshot(sessionId: string, snapshotId: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/restore-snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, snapshotId }),
    }),
  );

  return payload.session;
}

export async function refreshSession(sessionId: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),
  );

  return payload.session;
}

export async function pauseSession(sessionId: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/sessions/pause", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),
  );

  return payload.session;
}

export async function resumeSession(sessionId: string): Promise<SessionState> {
  const payload = await readJson<{ session: SessionState }>(
    await fetch("/api/sessions/resume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),
  );

  return payload.session;
}

export async function removeSession(sessionId: string): Promise<void> {
  await readJson<{ success: boolean }>(
    await fetch("/api/sessions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),
  );
}

export function subscribeSessions(onUpdate: () => void, onError: (message: string) => void): () => void {
  const source = new EventSource("/events");
  source.addEventListener("sessions", () => {
    onUpdate();
  });
  source.onerror = () => {
    onError("Mất kết nối realtime với server.");
  };

  return () => {
    source.close();
  };
}
