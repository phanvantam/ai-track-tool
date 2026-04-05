import { ensureSnapshot, normalizeTargetPath } from "../core/snapshot.js";
import { runUiCommand } from "./ui.js";

export async function runWatchCommand(targetPathInput: string): Promise<void> {
  const targetPath = await normalizeTargetPath(targetPathInput);
  await ensureSnapshot(targetPath);
  await runUiCommand(targetPath, {
    enableWatch: true,
    autoCreateSnapshot: true,
  });
}
