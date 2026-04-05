import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { acquireLock, getLockFilePath, readLockInfo, releaseLock, withStorageLock } from "../src/core/lock.js";

describe("lock", () => {
  it("acquire va release lock", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-lock-"));

    const lock = await acquireLock(root, "test-lock");
    expect((await readLockInfo(root))?.lockId).toBe(lock.lockId);

    await releaseLock(root, lock.lockId);
    expect(await readLockInfo(root)).toBeNull();
  });

  it("tu dong don stale lock", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-lock-"));
    await writeFile(
      getLockFilePath(root),
      `${JSON.stringify({
        lockId: "stale",
        processId: process.pid,
        operation: "stale-lock",
        timestamp: new Date(Date.now() - 60_000).toISOString(),
        expiresAt: new Date(Date.now() - 30_000).toISOString(),
      }, null, 2)}\n`,
      "utf8",
    );

    const lock = await acquireLock(root, "new-lock", { timeoutMs: 200 });

    expect(lock.lockId).not.toBe("stale");
    await releaseLock(root, lock.lockId);
  });

  it("bao loi khi lock dang bi giu", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-lock-"));

    await withStorageLock(root, "holder", async () => {
      await expect(acquireLock(root, "waiter", { timeoutMs: 100, staleLockMs: 10_000, retryIntervalMs: 20 })).rejects.toThrow(
        "Không lấy được lock",
      );
    });
  });
});
