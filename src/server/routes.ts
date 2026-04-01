import { readFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

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

    if (request.method === "POST" && requestUrl.pathname === "/api/sessions") {
      const body = (await readJsonBody(request)) as { path?: string } | null;

      if (!body?.path) {
        throw new Error("Thieu path");
      }

      const session = await options.sessionManager.addSession(body.path);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/changes") {
      const sessionId = requestUrl.searchParams.get("sessionId");

      if (!sessionId) {
        throw new Error("Thieu sessionId");
      }

      writeJson(response, 200, { changes: options.sessionManager.getSession(sessionId).changes });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/diff") {
      const sessionId = requestUrl.searchParams.get("sessionId");
      const relativePath = requestUrl.searchParams.get("path");

      if (!sessionId || !relativePath) {
        throw new Error("Thieu sessionId hoac path");
      }

      const session = options.sessionManager.getSession(sessionId);
      const diff = await renderDiffForPath(session.changes, relativePath);
      writeJson(response, 200, { diff });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/rollback") {
      const body = (await readJsonBody(request)) as { sessionId?: string; path?: string } | null;

      if (!body?.sessionId || !body.path) {
        throw new Error("Thieu sessionId hoac path");
      }

      const session = await options.sessionManager.rollback(body.sessionId, body.path);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/reset-snapshot") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thieu sessionId");
      }

      const session = await options.sessionManager.resetSnapshot(body.sessionId);
      writeJson(response, 200, { session });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/refresh") {
      const body = (await readJsonBody(request)) as { sessionId?: string } | null;

      if (!body?.sessionId) {
        throw new Error("Thieu sessionId");
      }

      const session = await options.sessionManager.refreshSession(body.sessionId);
      writeJson(response, 200, { session });
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
