import { randomUUID } from "node:crypto";

import { getChanges } from "../core/compare.js";
import { rollbackFile } from "../core/rollback.js";
import { ensureSnapshot, normalizeTargetPath, resetSnapshot } from "../core/snapshot.js";
import { readState } from "../core/state.js";
import { createWatcher } from "../core/watch.js";
import type { ChangeEntry, SessionState, WatchController, WatchStatus } from "../types.js";

interface SessionManagerOptions {
  onSessionChange?: (session: SessionState) => void;
}

export class SessionManager {
  private readonly sessions = new Map<string, ManagedSession>();

  public constructor(private readonly options: SessionManagerOptions = {}) {}

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
    return session.state;
  }

  public listSessions(): SessionState[] {
    return [...this.sessions.values()].map((session) => session.state);
  }

  public getSession(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Khong tim thay session: ${sessionId}`);
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

  public stopAll(): void {
    for (const session of this.sessions.values()) {
      session.stop();
    }

    this.sessions.clear();
  }

  private requireSession(sessionId: string): ManagedSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Khong tim thay session: ${sessionId}`);
    }

    return session;
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
    this.state.snapshotId = state.activeSnapshotId;
    await this.refresh();
  }

  public stop(): void {
    this.watcher?.stop();
    this.watcher = null;
    this.state.watchStatus = "idle";
    this.emit();
  }

  private emit(): void {
    this.onChange(this.state);
  }
}
