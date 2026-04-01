import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
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

describe("web server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tra ve state va changes", async () => {
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

  it("runWebCommand in url", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-web-command-"));
    await writeFile(path.join(targetPath, "base.txt"), "base\n", "utf8");
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await runWebCommand([targetPath], async () => ({
      url: "http://127.0.0.1:9999",
      close: () => undefined,
    }));

    expect(stdoutSpy).toHaveBeenCalledWith("Web UI: http://127.0.0.1:9999\n");
  });
});
