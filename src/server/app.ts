import { createServer } from "node:http";
import { access } from "node:fs/promises";
import path from "node:path";

import { SseHub } from "./events.js";
import { handleRequest } from "./routes.js";
import { SessionManager } from "./session.js";

async function resolveAvailablePort(startPort: number): Promise<number> {
  let port = startPort;

  while (port < startPort + 20) {
    try {
      await new Promise<void>((resolve, reject) => {
        const probe = createServer();
        probe.once("error", reject);
        probe.listen(port, () => {
          probe.close(() => resolve());
        });
      });
      return port;
    } catch {
      port += 1;
    }
  }

  throw new Error("Khong tim thay cong trong");
}

interface StartWebServerOptions {
  port?: number;
  webRoot?: string;
}

export async function startWebServer(initialPaths: string[], options: StartWebServerOptions = {}): Promise<{ url: string; close: () => void }> {
  const webRoot = options.webRoot ?? path.resolve("web/dist");
  await access(webRoot);

  const sseHub = new SseHub();
  const sessionManager = new SessionManager({
    onSessionChange: () => {
      sseHub.broadcast("sessions", { sessions: sessionManager.listSessions() });
    },
  });

  for (const targetPath of initialPaths) {
    await sessionManager.addSession(targetPath);
  }

  const server = createServer(async (request, response) => {
    await handleRequest(request, response, {
      sessionManager,
      sseHub,
      webRoot,
    });
  });
  const port = options.port ?? (await resolveAvailablePort(4317));

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      sseHub.closeAll();
      sessionManager.stopAll();
      server.close();
    },
  };
}
