import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { rollbackFile, rollbackFileWithStrategy } from "../src/core/rollback.js";
import { acquireLock, releaseLock } from "../src/core/lock.js";
import { createSnapshot } from "../src/core/snapshot.js";
import { getStateFilePath, readState } from "../src/core/state.js";
import { atomicWriteFile, backupFileForTransaction, beginTransaction } from "../src/core/transaction.js";

describe("phase 2 integration", () => {
  it("recover state dang ghi do va rollback voi strategy", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-phase-2-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");

    const state = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "ours\n", "utf8");

    await rollbackFileWithStrategy(targetPath, "note.txt", "manual");
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toContain("<<<<<<< ours");

    await writeFile(path.join(targetPath, "note.txt"), "ours again\n", "utf8");
    await rollbackFile(targetPath, "note.txt");
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe("base\n");

    const stateFilePath = getStateFilePath(state.storagePath);
    const transaction = await beginTransaction(state.storagePath, "corrupt-state");
    await backupFileForTransaction(state.storagePath, transaction, stateFilePath);
    await atomicWriteFile(stateFilePath, "{bad json");

    const recoveredState = await readState(targetPath);

    expect(recoveredState.activeSnapshotId).toBe(state.activeSnapshotId);
    expect(await readFile(stateFilePath, "utf8")).not.toBe("{bad json");
  });

  it("readState khong rollback transaction dang chay khi lock con song", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-phase-2-lock-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");

    const state = await createSnapshot(targetPath);
    const stateFilePath = getStateFilePath(state.storagePath);
    const lock = await acquireLock(state.storagePath, "test-live-transaction");
    const transaction = await beginTransaction(state.storagePath, "corrupt-state-live");
    await backupFileForTransaction(state.storagePath, transaction, stateFilePath);
    await atomicWriteFile(stateFilePath, "{bad json");

    await expect(readState(targetPath)).rejects.toThrow();
    expect(await readFile(stateFilePath, "utf8")).toBe("{bad json");

    await releaseLock(state.storagePath, lock.lockId);
    const recoveredState = await readState(targetPath);
    expect(recoveredState.activeSnapshotId).toBe(state.activeSnapshotId);
  });
});
