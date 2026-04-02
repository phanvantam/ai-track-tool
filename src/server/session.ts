import { randomUUID } from "node:crypto";

import { readAppConfig, writeAppConfig } from "../core/config.js";
import { getChanges } from "../core/compare.js";
import { countDiffLines, renderSnapshotDiffForPath } from "../core/diff.js";
import { runFsck } from "../core/fsck.js";
import { runGarbageCollection, type GarbageCollectionReport } from "../core/gc.js";
import { readLockInfo } from "../core/lock.js";
import { getReflogStats, readReflog } from "../core/reflog.js";
import { rollbackFile, rollbackToSnapshot } from "../core/rollback.js";
import { buildSnapshotChain, diffSnapshotManifests, getSnapshotManifestById, listSnapshotManifests, type SnapshotDiffEntry, renderSnapshotGraph } from "../core/snapshot-chain.js";
import { ensureSnapshot, normalizeTargetPath, resetSnapshot } from "../core/snapshot.js";
import { addSnapshotAnnotation, createSnapshotTag, deleteSnapshotAnnotation, deleteSnapshotTag, listSnapshotAnnotations, listSnapshotTags } from "../core/snapshot-tags.js";
import { readState } from "../core/state.js";
import { createWatcher } from "../core/watch.js";
import type { ChangeEntry, FSCKReport, LockInfo, SessionHistoryEntry, SessionHistoryView, SessionState, SnapshotAnnotation, SnapshotTag, WatchController } from "../types.js";

interface SessionManagerOptions {
  onSessionChange?: (session: SessionState) => void;
}

export class SessionManager {
  private readonly sessions = new Map<string, ManagedSession>();

  public constructor(private readonly options: SessionManagerOptions = {}) { }

  public async initialize(): Promise<void> {
    const config = await readAppConfig();

    for (const targetPath of config.projects) {
      try {
        await this.addSession(targetPath);
      } catch (error) {
        console.error(`Failed to restore session for ${targetPath}:`, error);
      }
    }
  }

  public async addSession(targetPathInput: string): Promise<SessionState> {
    const targetPath = await normalizeTargetPath(targetPathInput);

    for (const session of this.sessions.values()) {
      if (session.targetPath === targetPath) {
        return session.state;
      }
    }

    await ensureSnapshot(targetPath);
    const session = new ManagedSession(targetPath, (state) => {
      this.options.onSessionChange?.(state);
    });
    await session.initialize();
    this.sessions.set(session.state.id, session);
    await this.persistProjects();
    return session.state;
  }

  public listSessions(): SessionState[] {
    return [...this.sessions.values()].map((session) => session.state);
  }

  public getSession(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Không tìm thấy session: ${sessionId}`);
    }

    return session.state;
  }

  public async refreshSession(sessionId: string): Promise<SessionState> {
    const session = this.requireSession(sessionId);
    await session.refresh();
    return session.state;
  }

  public async rollback(sessionId: string, relativePath: string): Promise<SessionState> {
    const session = this.requireSession(sessionId);
    await session.rollback(relativePath);
    return session.state;
  }

  public async resetSnapshot(sessionId: string): Promise<SessionState> {
    const session = this.requireSession(sessionId);
    await session.resetSnapshot();
    return session.state;
  }

  public async restoreSnapshot(sessionId: string, snapshotId: string): Promise<SessionState> {
    const session = this.requireSession(sessionId);
    await session.restoreSnapshot(snapshotId);
    return session.state;
  }

  public async pauseSession(sessionId: string): Promise<SessionState> {
    const session = this.requireSession(sessionId);
    session.pause();
    return session.state;
  }

  public async resumeSession(sessionId: string): Promise<SessionState> {
    const session = this.requireSession(sessionId);
    await session.resume();
    return session.state;
  }

  public async removeSession(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    session.stop();
    this.sessions.delete(sessionId);
    await this.persistProjects();
  }

  public async getHistory(sessionId: string): Promise<SessionHistoryView> {
    return this.requireSession(sessionId).getHistory();
  }

  public async getLockInfo(sessionId: string): Promise<LockInfo | null> {
    return this.requireSession(sessionId).getLockInfo();
  }

  public async getSnapshotDiff(sessionId: string, fromSnapshotId: string, toSnapshotId: string): Promise<SnapshotDiffEntry[]> {
    return this.requireSession(sessionId).getSnapshotDiff(fromSnapshotId, toSnapshotId);
  }

  public async getSnapshotFileDiff(sessionId: string, fromSnapshotId: string, toSnapshotId: string, relativePath: string): Promise<string> {
    return this.requireSession(sessionId).getSnapshotFileDiff(fromSnapshotId, toSnapshotId, relativePath);
  }

  public async runFsck(sessionId: string, repair = false): Promise<FSCKReport> {
    return this.requireSession(sessionId).runFsck(repair);
  }

  public async runGarbageCollection(sessionId: string, dryRun = false): Promise<GarbageCollectionReport> {
    return this.requireSession(sessionId).runGarbageCollection(dryRun);
  }

  public async createTag(sessionId: string, snapshotId: string, tagName: string): Promise<SessionHistoryView> {
    const session = this.requireSession(sessionId);
    await session.createTag(snapshotId, tagName);
    return session.getHistory();
  }

  public async deleteTag(sessionId: string, tagName: string): Promise<SessionHistoryView> {
    const session = this.requireSession(sessionId);
    await session.deleteTag(tagName);
    return session.getHistory();
  }

  public async saveNote(sessionId: string, snapshotId: string, content: string): Promise<SessionHistoryView> {
    const session = this.requireSession(sessionId);
    await session.saveNote(snapshotId, content);
    return session.getHistory();
  }

  public async deleteNote(sessionId: string, snapshotId: string): Promise<SessionHistoryView> {
    const session = this.requireSession(sessionId);
    await session.deleteNote(snapshotId);
    return session.getHistory();
  }

  public stopAll(): void {
    for (const session of this.sessions.values()) {
      session.stop();
    }

    this.sessions.clear();
  }

  private requireSession(sessionId: string): ManagedSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Không tìm thấy session: ${sessionId}`);
    }

    return session;
  }

  private async persistProjects(): Promise<void> {
    try {
      const config = await readAppConfig();
      const projects = [...this.sessions.values()].map((session) => session.targetPath);
      await writeAppConfig({ ...config, projects });
    } catch (error) {
      console.error("Failed to persist projects:", error);
    }
  }
}

class ManagedSession {
  public readonly state: SessionState;
  public readonly targetPath: string;

  private watcher: WatchController | null = null;
  private isRefreshing = false;

  public constructor(targetPath: string, private readonly onChange: (state: SessionState) => void) {
    this.targetPath = targetPath;
    this.state = {
      id: randomUUID(),
      targetPath,
      storagePath: "unknown",
      snapshotId: "unknown",
      watchStatus: "idle",
      changeCount: 0,
      lastError: null,
      changes: [],
    };
  }

  public async initialize(): Promise<void> {
    await this.refresh();
    this.watcher = createWatcher(this.targetPath, {
      onRefreshNeeded: async () => {
        await this.refresh();
      },
      onError: (error) => {
        this.state.watchStatus = "error";
        this.state.lastError = error.message;
        this.emit();
      },
    });
    this.state.watchStatus = "watching";
    this.emit();
  }

  public async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    this.state.watchStatus = this.watcher ? "refreshing" : this.state.watchStatus;

    try {
      const trackedState = await ensureSnapshot(this.targetPath);
      const changes = await getChanges(this.targetPath);
      this.state.storagePath = trackedState.storagePath;
      this.state.snapshotId = trackedState.activeSnapshotId;
      this.state.changes = changes;
      this.state.changeCount = changes.length;
      this.state.lastError = null;
      this.state.watchStatus = this.watcher ? "watching" : this.state.watchStatus;
      this.emit();
    } catch (error) {
      this.state.watchStatus = "error";
      this.state.lastError = error instanceof Error ? error.message : "unknown";
      this.emit();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  public async rollback(relativePath: string): Promise<void> {
    await rollbackFile(this.targetPath, relativePath);
    await this.refresh();
  }

  public async resetSnapshot(): Promise<void> {
    const state = await resetSnapshot(this.targetPath);
    this.state.storagePath = state.storagePath;
    this.state.snapshotId = state.activeSnapshotId;
    await this.refresh();
  }

  public async restoreSnapshot(snapshotId: string): Promise<void> {
    const state = await rollbackToSnapshot(this.targetPath, snapshotId);
    this.state.storagePath = state.storagePath;
    this.state.snapshotId = state.activeSnapshotId;
    await this.refresh();
  }

  public async getHistory(): Promise<SessionHistoryView> {
    const trackedState = await readState(this.targetPath);
    const storagePath = trackedState.storagePath;
    const manifests = await listSnapshotManifests(storagePath);
    const tags = await listSnapshotTags(storagePath);
    const notes = await listSnapshotAnnotations(storagePath);
    const chain = await buildSnapshotChain(storagePath);

    return {
      graph: renderSnapshotGraph(chain, trackedState.activeSnapshotId),
      snapshots: buildHistoryEntries(manifests, trackedState.activeSnapshotId, tags, notes),
      reflog: await readReflog(storagePath, { limit: 30 }),
      reflogStats: await getReflogStats(storagePath),
    };
  }

  public async getLockInfo(): Promise<LockInfo | null> {
    return readLockInfo((await readState(this.targetPath)).storagePath);
  }

  public async getSnapshotDiff(fromSnapshotId: string, toSnapshotId: string): Promise<SnapshotDiffEntry[]> {
    try {
      const storagePath = (await readState(this.targetPath)).storagePath;
      const fromManifest = await getSnapshotManifestById(storagePath, fromSnapshotId);
      const toManifest = await getSnapshotManifestById(storagePath, toSnapshotId);
      const manifestDiffs = diffSnapshotManifests(fromManifest, toManifest);

      return Promise.all(manifestDiffs.map(async (entry) => {
        const diffText = await renderSnapshotDiffForPath(storagePath, fromSnapshotId, toSnapshotId, entry.path);
        return {
          ...entry,
          ...countDiffLines(diffText),
        };
      }));
    } catch (error) {
      // Snapshot bị xóa trên disk nhưng vẫn còn trong state → trả về rỗng
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  public async getSnapshotFileDiff(fromSnapshotId: string, toSnapshotId: string, relativePath: string): Promise<string> {
    try {
      const storagePath = (await readState(this.targetPath)).storagePath;
      return renderSnapshotDiffForPath(storagePath, fromSnapshotId, toSnapshotId, relativePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return "Snapshot không tồn tại trên disk (đã bị xóa).";
      }
      throw error;
    }
  }

  public async runFsck(repair = false): Promise<FSCKReport> {
    const report = await runFsck(this.targetPath, { repair });

    if (repair) {
      await this.refresh();
    }

    return report;
  }

  public async runGarbageCollection(dryRun = false): Promise<GarbageCollectionReport> {
    const report = await runGarbageCollection(this.targetPath, { dryRun });

    if (!dryRun) {
      await this.refresh();
    }

    return report;
  }

  public async createTag(snapshotId: string, tagName: string): Promise<void> {
    await createSnapshotTag((await readState(this.targetPath)).storagePath, snapshotId, tagName, process.env.USER ?? "system");
    this.emit();
  }

  public async deleteTag(tagName: string): Promise<void> {
    await deleteSnapshotTag((await readState(this.targetPath)).storagePath, tagName, process.env.USER ?? "system");
    this.emit();
  }

  public async saveNote(snapshotId: string, content: string): Promise<void> {
    await addSnapshotAnnotation((await readState(this.targetPath)).storagePath, snapshotId, content, process.env.USER ?? "system");
    this.emit();
  }

  public async deleteNote(snapshotId: string): Promise<void> {
    await deleteSnapshotAnnotation((await readState(this.targetPath)).storagePath, snapshotId, process.env.USER ?? "system");
    this.emit();
  }

  public stop(): void {
    this.watcher?.stop();
    this.watcher = null;
    this.state.watchStatus = "idle";
    this.emit();
  }

  public pause(): void {
    this.watcher?.stop();
    this.watcher = null;
    this.state.watchStatus = "idle";
    this.emit();
  }

  public async resume(): Promise<void> {
    if (this.watcher) {
      return;
    }

    await this.refresh();
    this.watcher = createWatcher(this.targetPath, {
      onRefreshNeeded: async () => {
        await this.refresh();
      },
      onError: (error) => {
        this.state.watchStatus = "error";
        this.state.lastError = error.message;
        this.emit();
      },
    });
    this.state.watchStatus = "watching";
    this.emit();
  }

  private emit(): void {
    this.onChange(this.state);
  }
}

function buildHistoryEntries(
  manifests: Array<{ snapshotId: string; parentSnapshotId?: string | null; createdAt: string; summary?: string; files: Array<{ path: string; hash: string }> }>,
  activeSnapshotId: string,
  tags: SnapshotTag[],
  notes: SnapshotAnnotation[],
): SessionHistoryEntry[] {
  const tagsBySnapshot = new Map<string, string[]>();
  const notesBySnapshot = new Map(notes.map((note) => [note.snapshotId, note]));

  for (const tag of tags) {
    const existing = tagsBySnapshot.get(tag.snapshotId) ?? [];
    existing.push(tag.name);
    tagsBySnapshot.set(tag.snapshotId, existing.sort((left, right) => left.localeCompare(right)));
  }

  // Xây file hash map cho mỗi snapshot để tính diffStats với parent
  const fileHashMaps = new Map<string, Map<string, string>>();
  for (const manifest of manifests) {
    const hashMap = new Map<string, string>();
    for (const file of manifest.files) {
      hashMap.set(file.path, file.hash);
    }
    fileHashMaps.set(manifest.snapshotId, hashMap);
  }

  return manifests.map((manifest) => {
    // Tính diffStats bằng cách so sánh hash với parent
    let diffStats: { added: number; modified: number; deleted: number } | undefined;
    const parentId = manifest.parentSnapshotId;
    if (parentId) {
      const parentFiles = fileHashMaps.get(parentId);
      const currentFiles = fileHashMaps.get(manifest.snapshotId)!;
      if (parentFiles) {
        let added = 0;
        let modified = 0;
        let deleted = 0;
        for (const [path, hash] of currentFiles) {
          const parentHash = parentFiles.get(path);
          if (!parentHash) added++;
          else if (parentHash !== hash) modified++;
        }
        for (const path of parentFiles.keys()) {
          if (!currentFiles.has(path)) deleted++;
        }
        diffStats = { added, modified, deleted };
      }
    }

    return {
      snapshotId: manifest.snapshotId,
      parentSnapshotId: manifest.parentSnapshotId ?? null,
      createdAt: manifest.createdAt,
      summary: manifest.summary,
      fileCount: manifest.files.length,
      isActive: manifest.snapshotId === activeSnapshotId,
      tags: tagsBySnapshot.get(manifest.snapshotId) ?? [],
      note: notesBySnapshot.get(manifest.snapshotId) ?? null,
      diffStats,
    };
  });
}
