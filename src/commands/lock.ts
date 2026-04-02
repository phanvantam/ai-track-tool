import { readLockInfo, releaseLock } from "../core/lock.js";
import { resolveStorageRoot } from "../core/state.js";

interface RunLockCommandOptions {
  release?: boolean;
}

export async function runLockCommand(targetPath: string, options: RunLockCommandOptions = {}): Promise<void> {
  const storagePath = await resolveStorageRoot(targetPath);

  if (options.release) {
    await releaseLock(storagePath);
    process.stdout.write("Đã force release lock.\n");
    return;
  }

  const lock = await readLockInfo(storagePath);

  if (!lock) {
    process.stdout.write("Không có lock đang hoạt động.\n");
    return;
  }

  process.stdout.write(`lock: ${lock.operation}\n`);
  process.stdout.write(`pid: ${lock.processId}\n`);
  process.stdout.write(`timestamp: ${lock.timestamp}\n`);
  process.stdout.write(`expiresAt: ${lock.expiresAt}\n`);
}
