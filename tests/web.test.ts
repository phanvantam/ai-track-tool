import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runWebCommand } from "../src/commands/web.js";
import { startWebServer } from "../src/server/app.js";

async function createWebRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "ai-track-web-root-"));
  await mkdir(path.join(root, "assets"), { recursive: true });
  await writeFile(path.join(root, "index.html"), "<html><body>ok</body></html>", "utf8");
  return root;
}

async function isolateConfigHome(): Promise<void> {
  const homePath = await mkdtemp(path.join(tmpdir(), "ai-track-home-"));
  vi.stubEnv("HOME", homePath);
}

describe("web server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("tra ve state va changes", async () => {
    await isolateConfigHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-web-session-"));
    const webRoot = await createWebRoot();
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const server = await startWebServer([targetPath], { port: 4511, webRoot });

    try {
      const state = (await fetch(`${server.url}/api/state`).then((response) => response.json())) as { sessions: Array<{ id: string }> };
      expect(state.sessions).toHaveLength(1);

      await writeFile(path.join(targetPath, "note.txt"), "changed\n", "utf8");
      await new Promise((resolve) => setTimeout(resolve, 300));

      const changes = (await fetch(`${server.url}/api/changes?sessionId=${state.sessions[0]?.id}`).then((response) => response.json())) as {
        changes: Array<{ path: string; type: string }>;
      };

      expect(changes.changes[0]?.path).toBe("note.txt");
      expect(changes.changes[0]?.type).toBe("modified");
    } finally {
      server.close();
    }
  });

  it("rollback va reset snapshot qua api", async () => {
    await isolateConfigHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-web-api-"));
    const webRoot = await createWebRoot();
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const server = await startWebServer([targetPath], { port: 4512, webRoot });

    try {
      const state = (await fetch(`${server.url}/api/state`).then((response) => response.json())) as { sessions: Array<{ id: string }> };
      const sessionId = state.sessions[0]!.id;

      await writeFile(path.join(targetPath, "note.txt"), "changed\n", "utf8");
      await new Promise((resolve) => setTimeout(resolve, 300));

      await fetch(`${server.url}/api/rollback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, path: "note.txt" }),
      });

      const afterRollback = (await fetch(`${server.url}/api/changes?sessionId=${sessionId}`).then((response) => response.json())) as {
        changes: Array<unknown>;
      };
      expect(afterRollback.changes).toHaveLength(0);

      await writeFile(path.join(targetPath, "note.txt"), "next\n", "utf8");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await fetch(`${server.url}/api/reset-snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const afterReset = (await fetch(`${server.url}/api/changes?sessionId=${sessionId}`).then((response) => response.json())) as {
        changes: Array<unknown>;
      };
      expect(afterReset.changes).toHaveLength(0);
    } finally {
      server.close();
    }
  });

  it("tra ve history, diagnostics va thao tac metadata qua api", async () => {
    await isolateConfigHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-web-history-"));
    const webRoot = await createWebRoot();
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const server = await startWebServer([targetPath], { port: 4513, webRoot });

    try {
      const state = (await fetch(`${server.url}/api/state`).then((response) => response.json())) as { sessions: Array<{ id: string }> };
      const sessionId = state.sessions[0]!.id;

      await writeFile(path.join(targetPath, "note.txt"), "changed\n", "utf8");
      await new Promise((resolve) => setTimeout(resolve, 300));
      await fetch(`${server.url}/api/reset-snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const history = (await fetch(`${server.url}/api/history?sessionId=${sessionId}`).then((response) => response.json())) as {
        snapshots: Array<{ snapshotId: string; isActive: boolean; tags: string[]; note: { content: string } | null }>;
        reflog: Array<{ action: string }>;
      };
      const activeSnapshot = history.snapshots.find((snapshot) => snapshot.isActive)!;
      const previousSnapshot = history.snapshots.find((snapshot) => !snapshot.isActive)!;

      expect(history.snapshots).toHaveLength(2);
      expect(history.reflog.map((entry) => entry.action)).toContain("reset");

      const tagged = (await fetch(`${server.url}/api/tag`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, snapshotId: previousSnapshot.snapshotId, name: "baseline" }),
      }).then((response) => response.json())) as {
        history: { snapshots: Array<{ snapshotId: string; tags: string[] }> };
      };
      expect(tagged.history.snapshots.find((snapshot) => snapshot.snapshotId === previousSnapshot.snapshotId)?.tags).toContain("baseline");

      const noted = (await fetch(`${server.url}/api/note`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, snapshotId: previousSnapshot.snapshotId, content: "before release" }),
      }).then((response) => response.json())) as {
        history: { snapshots: Array<{ snapshotId: string; note: { content: string } | null }> };
      };
      expect(noted.history.snapshots.find((snapshot) => snapshot.snapshotId === previousSnapshot.snapshotId)?.note?.content).toBe("before release");

      const snapshotDiff = (await fetch(`${server.url}/api/diff-snapshots?sessionId=${sessionId}&from=${previousSnapshot.snapshotId}&to=${activeSnapshot.snapshotId}`).then((response) => response.json())) as {
        diffs: Array<{ path: string; type: string; changeCount: number; insertions: number; deletions: number }>;
      };
      expect(snapshotDiff.diffs).toEqual([
        expect.objectContaining({ path: "note.txt", type: "modified", changeCount: 2, insertions: 1, deletions: 1 }),
      ]);

      const snapshotFileDiff = (await fetch(`${server.url}/api/diff-snapshot-file?sessionId=${sessionId}&from=${previousSnapshot.snapshotId}&to=${activeSnapshot.snapshotId}&path=note.txt`).then((response) => response.json())) as {
        diff: string;
      };
      expect(snapshotFileDiff.diff).toContain("snapshot:");
      expect(snapshotFileDiff.diff).toContain("changed");

      await fetch(`${server.url}/api/restore-snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, snapshotId: previousSnapshot.snapshotId }),
      });

      const afterRestoreState = (await fetch(`${server.url}/api/state`).then((response) => response.json())) as {
        sessions: Array<{ id: string; snapshotId: string; changeCount: number }>;
      };
      const restoredSession = afterRestoreState.sessions.find((session) => session.id === sessionId);
      expect(restoredSession?.snapshotId).toBe(previousSnapshot.snapshotId);
      expect(restoredSession?.changeCount).toBe(0);
      expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe("hello\n");

      const lock = (await fetch(`${server.url}/api/lock?sessionId=${sessionId}`).then((response) => response.json())) as { lock: unknown };
      expect(lock.lock).toBeNull();

      const fsck = (await fetch(`${server.url}/api/fsck`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then((response) => response.json())) as { report: { isHealthy: boolean } };
      expect(fsck.report.isHealthy).toBe(true);

      const gc = (await fetch(`${server.url}/api/gc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, dryRun: true }),
      }).then((response) => response.json())) as { report: { dryRun: boolean; actions: Array<unknown> } };
      expect(gc.report.dryRun).toBe(true);
      expect(gc.report.actions.length).toBeGreaterThan(0);
    } finally {
      server.close();
    }
  });

  it("runWebCommand in url", async () => {
    await isolateConfigHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-web-command-"));
    await writeFile(path.join(targetPath, "base.txt"), "base\n", "utf8");
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await runWebCommand([targetPath], async () => ({
      url: "http://127.0.0.1:9999",
      close: () => undefined,
    }));

    expect(stdoutSpy).toHaveBeenCalledWith("Web UI: http://127.0.0.1:9999\n");
  });

  it("api route la ma khong ton tai thi tra json 404 thay vi html", async () => {
    await isolateConfigHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-web-missing-api-"));
    const webRoot = await createWebRoot();
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const server = await startWebServer([targetPath], { port: 4514, webRoot });

    try {
      const response = await fetch(`${server.url}/api/unknown-route`);
      const payload = await response.json() as { error: string };

      expect(response.status).toBe(404);
      expect(payload.error).toContain("Không tìm thấy API route");
    } finally {
      server.close();
    }
  });
});
