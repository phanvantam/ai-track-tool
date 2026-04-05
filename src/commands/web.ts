import { normalizeTargetPath } from "../core/snapshot.js";
import { startWebServer } from "../server/app.js";

interface WebServerHandle {
  url: string;
  close: () => void;
}

export async function runWebCommand(
  targetPaths: string[],
  startServer: (paths: string[]) => Promise<WebServerHandle> = startWebServer,
): Promise<void> {
  const normalizedPaths = await Promise.all(targetPaths.map((targetPath) => normalizeTargetPath(targetPath)));
  const server = await startServer(normalizedPaths);
  process.stdout.write(`Web UI: ${server.url}\n`);
}
