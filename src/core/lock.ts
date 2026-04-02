import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { LockInfo } from "../types.js";

const DEFAULT_STALE_LOCK_MS = 30_000;
const DEFAULT_RETRY_INTERVAL_MS = 50;

interface AcquireLockOptions {
  timeoutMs?: number;
  staleLockMs?: number;
  retryIntervalMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isProcessAlive(processId: number): boolean {
  try {
    process.kill(processId, 0);
    return true;
  } catch {
    return false;
  }
}

export function isLockInfoActive(lockInfo: LockInfo | null, now = Date.now()): boolean {
  if (!lockInfo) {
    return false;
  }

  return Date.parse(lockInfo.expiresAt) > now && isProcessAlive(lockInfo.processId);
}

export function getLockFilePath(storagePath: string): string {
  return path.join(storagePath, "lock.json");
}

export async function readLockInfo(storagePath: string): Promise<LockInfo | null> {
  try {
    const content = await readFile(getLockFilePath(storagePath), "utf8");
    return JSON.parse(content) as LockInfo;
  } catch {
    return null;
  }
}

export async function releaseLock(storagePath: string, lockId?: string): Promise<void> {
  const lockFilePath = getLockFilePath(storagePath);

  if (lockId) {
    const currentLock = await readLockInfo(storagePath);

    if (currentLock && currentLock.lockId !== lockId) {
      return;
    }
  }

  await rm(lockFilePath, { force: true });
}

async function cleanupStaleLock(storagePath: string, staleLockMs: number): Promise<boolean> {
  const currentLock = await readLockInfo(storagePath);

  if (!currentLock) {
    return false;
  }

  const expired = Date.parse(currentLock.expiresAt) <= Date.now();
  const ownerDead = !isProcessAlive(currentLock.processId);

  if (!expired && !ownerDead) {
    return false;
  }

  await releaseLock(storagePath, currentLock.lockId);
  return true;
}

export async function acquireLock(storagePath: string, operation: string, options: AcquireLockOptions = {}): Promise<LockInfo> {
  const lockFilePath = getLockFilePath(storagePath);
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_STALE_LOCK_MS;
  const staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;

  await mkdir(storagePath, { recursive: true });

  while (true) {
    const now = Date.now();
    const lockInfo: LockInfo = {
      lockId: randomUUID(),
      processId: process.pid,
      operation,
      timestamp: new Date(now).toISOString(),
      expiresAt: new Date(now + staleLockMs).toISOString(),
    };

    try {
      await writeFile(lockFilePath, `${JSON.stringify(lockInfo, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      return lockInfo;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      await cleanupStaleLock(storagePath, staleLockMs);

      if (Date.now() - startedAt >= timeoutMs) {
        const currentLock = await readLockInfo(storagePath);
        const owner = currentLock ? `${currentLock.operation} pid=${currentLock.processId}` : "unknown";
        throw new Error(`Không lấy được lock cho ${operation}: đang bị giữ bởi ${owner}`);
      }

      await sleep(retryIntervalMs);
    }
  }
}

export async function withStorageLock<T>(
  storagePath: string,
  operation: string,
  callback: () => Promise<T>,
  options: AcquireLockOptions = {},
): Promise<T> {
  const lock = await acquireLock(storagePath, operation, options);

  try {
    return await callback();
  } finally {
    await releaseLock(storagePath, lock.lockId);
  }
}
