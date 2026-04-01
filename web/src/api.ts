export type ChangeType = "added" | "modified" | "deleted" | "renamed";
export type WatchStatus = "idle" | "watching" | "refreshing" | "error";

export interface ChangeEntry {
  path: string;
  type: ChangeType;
  isBinary: boolean;
  oldPath?: string;
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
  const payload = (await response.json()) as T & { error?: string };

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
