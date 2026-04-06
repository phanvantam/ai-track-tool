import { readFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import { getConfigDefaults, readAppConfig, writeAppConfig } from "../core/config.js";
import { renderDiffForPath } from "../core/diff.js";
import type { SessionManager } from "./session.js";
import type { SseHub } from "./events.js";

interface RoutesOptions {
  sessionManager: SessionManager;
  sseHub: SseHub;
  webRoot: string;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export async function handleRequest(request: IncomingMessage, response: ServerResponse, options: RoutesOptions): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");

  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/state") {
      writeJson(response, 200, { sessions: options.sessionManager.listSessions() });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/config") {
      const config = await readAppConfig();
      writeJson(response, 200, {
        config,
        defaults: getConfigDefaults(config),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/config") {
      const body = (await readJsonBody(request)) as { storageDir?: string | null; bulkCollapseThreshold?: number } | null;
      const currentConfig = await readAppConfig();
      const config = await writeAppConfig({ 
        ...currentConfig,
        storageDir: body?.storageDir?.trim() || null,
        bulkCollapseThreshold: typeof body?.bulkCollapseThreshold === "number" ? body.bulkCollapseThreshold : currentConfig.bulkCollapseThreshold,
      });
      writeJson(response, 200, {
        config,
        defaults: getConfigDefaults(config),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/sessions") {
      const body = (await readJsonBody(request)) as { path?: string } | null;

      if (!body?.path) {
        throw new Error("Thiếu path");
      }

      const session = await options.sessionManager.addSession(body.path);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/changes") {
      const sessionId = requestUrl.searchParams.get("sessionId");

      if (!sessionId) {
        throw new Error("Thiếu sessionId");
      }

      writeJson(response, 200, { changes: options.sessionManager.getSession(sessionId).changes });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/history") {
      const sessionId = requestUrl.searchParams.get("sessionId");

      if (!sessionId) {
        throw new Error("Thiếu sessionId");
      }

      writeJson(response, 200, await options.sessionManager.getHistory(sessionId));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/lock") {
      const sessionId = requestUrl.searchParams.get("sessionId");

      if (!sessionId) {
        throw new Error("Thiếu sessionId");
      }

      writeJson(response, 200, { lock: await options.sessionManager.getLockInfo(sessionId) });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/diff-snapshot-vs-current") {
      const sessionId = requestUrl.searchParams.get("sessionId");
      const snapshotId = requestUrl.searchParams.get("snapshotId");

      if (!sessionId || !snapshotId) {
        throw new Error("Thiếu sessionId hoặc snapshotId");
      }

      writeJson(response, 200, {
        diffs: await options.sessionManager.getSnapshotVsCurrentDiff(sessionId, snapshotId),
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/diff-snapshots") {
      const sessionId = requestUrl.searchParams.get("sessionId");
      const fromSnapshotId = requestUrl.searchParams.get("from");
      const toSnapshotId = requestUrl.searchParams.get("to");

      if (!sessionId || !fromSnapshotId || !toSnapshotId) {
        throw new Error("Thiếu sessionId, from hoặc to");
      }

      writeJson(response, 200, {
        diffs: await options.sessionManager.getSnapshotDiff(sessionId, fromSnapshotId, toSnapshotId),
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/diff-snapshot-file") {
      const sessionId = requestUrl.searchParams.get("sessionId");
      const fromSnapshotId = requestUrl.searchParams.get("from");
      const toSnapshotId = requestUrl.searchParams.get("to");
      const relativePath = requestUrl.searchParams.get("path");

      if (!sessionId || !fromSnapshotId || !toSnapshotId || !relativePath) {
        throw new Error("Thiếu sessionId, from, to hoặc path");
      }

      writeJson(response, 200, {
        diff: await options.sessionManager.getSnapshotFileDiff(sessionId, fromSnapshotId, toSnapshotId, relativePath),
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/diff") {
      const sessionId = requestUrl.searchParams.get("sessionId");
      const relativePath = requestUrl.searchParams.get("path");
      const fullContext = requestUrl.searchParams.get("fullContext") === "1";

      if (!sessionId || !relativePath) {
        throw new Error("Thiếu sessionId hoặc path");
      }

      const session = options.sessionManager.getSession(sessionId);
      const diff = await renderDiffForPath(session.changes, relativePath, fullContext);
      writeJson(response, 200, { diff });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/rollback") {
      const body = (await readJsonBody(request)) as { sessionId?: string; path?: string } | null;

      if (!body?.sessionId || !body.path) {
        throw new Error("Thiếu sessionId hoặc path");
      }

      const session = await options.sessionManager.rollback(body.sessionId, body.path);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/fsck") {
      const body = (await readJsonBody(request)) as { sessionId?: string; repair?: boolean } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      writeJson(response, 200, {
        report: await options.sessionManager.runFsck(body.sessionId, body.repair ?? false),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/gc") {
      const body = (await readJsonBody(request)) as { sessionId?: string; dryRun?: boolean } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      writeJson(response, 200, {
        report: await options.sessionManager.runGarbageCollection(body.sessionId, body.dryRun ?? false),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/tag") {
      const body = (await readJsonBody(request)) as { sessionId?: string; snapshotId?: string; name?: string } | null;

      if (!body?.sessionId || !body.snapshotId || !body.name) {
        throw new Error("Thiếu sessionId, snapshotId hoặc name");
      }

      writeJson(response, 200, {
        history: await options.sessionManager.createTag(body.sessionId, body.snapshotId, body.name),
      });
      return;
    }

    if (request.method === "DELETE" && requestUrl.pathname === "/api/tag") {
      const body = (await readJsonBody(request)) as { sessionId?: string; name?: string } | null;

      if (!body?.sessionId || !body.name) {
        throw new Error("Thiếu sessionId hoặc name");
      }

      writeJson(response, 200, {
        history: await options.sessionManager.deleteTag(body.sessionId, body.name),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/note") {
      const body = (await readJsonBody(request)) as { sessionId?: string; snapshotId?: string; content?: string } | null;

      if (!body?.sessionId || !body.snapshotId) {
        throw new Error("Thiếu sessionId hoặc snapshotId");
      }

      writeJson(response, 200, {
        history: await options.sessionManager.saveNote(body.sessionId, body.snapshotId, body.content ?? ""),
      });
      return;
    }

    if (request.method === "DELETE" && requestUrl.pathname === "/api/note") {
      const body = (await readJsonBody(request)) as { sessionId?: string; snapshotId?: string } | null;

      if (!body?.sessionId || !body.snapshotId) {
        throw new Error("Thiếu sessionId hoặc snapshotId");
      }

      writeJson(response, 200, {
        history: await options.sessionManager.deleteNote(body.sessionId, body.snapshotId),
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/reset-snapshot") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      const session = await options.sessionManager.resetSnapshot(body.sessionId);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/restore-snapshot") {
      const body = (await readJsonBody(request)) as { sessionId?: string; snapshotId?: string } | null;

      if (!body?.sessionId || !body.snapshotId) {
        throw new Error("Thiếu sessionId hoặc snapshotId");
      }

      const session = await options.sessionManager.restoreSnapshot(body.sessionId, body.snapshotId);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/refresh") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      const session = await options.sessionManager.refreshSession(body.sessionId);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/sessions/pause") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      const session = await options.sessionManager.pauseSession(body.sessionId);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/sessions/resume") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      const session = await options.sessionManager.resumeSession(body.sessionId);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "DELETE" && requestUrl.pathname === "/api/sessions") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thiếu sessionId");
      }

      await options.sessionManager.removeSession(body.sessionId);
      writeJson(response, 200, { success: true });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/events") {
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      response.write("event: ready\ndata: {}\n\n");
      options.sseHub.addClient(response);
      request.on("close", () => {
        options.sseHub.removeClient(response);
      });
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      writeJson(response, 404, {
        error: `Không tìm thấy API route: ${requestUrl.pathname}. Có thể web server đang chạy phiên bản cũ.`,
      });
      return;
    }

    const requestedPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.replace(/^\//, "");
    const filePath = path.join(options.webRoot, requestedPath);

    try {
      const file = await readFile(filePath);
      response.writeHead(200, { "content-type": getContentType(filePath) });
      response.end(file);
      return;
    } catch {
      const indexFile = await readFile(path.join(options.webRoot, "index.html"));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(indexFile);
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    writeJson(response, 400, { error: message });
  }
}

function getContentType(filePath: string): string {
  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  return "application/octet-stream";
}
