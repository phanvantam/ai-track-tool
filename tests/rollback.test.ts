import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getChanges } from "../src/core/compare.js";
import { rollbackFile, rollbackToSnapshot } from "../src/core/rollback.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";
import { readManifest, readState } from "../src/core/state.js";

describe("rollbackFile", () => {
  it("khoi phuc file modified", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-rollback-"));
    await writeFile(path.join(targetPath, "note.txt"), "old\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "new\n", "utf8");

    const result = await rollbackFile(targetPath, "note.txt");
    const content = await readFile(path.join(targetPath, "note.txt"), "utf8");

    expect(result).toBe("restored");
    expect(content).toBe("old\n");
  });

  it("xoa file added", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-rollback-added-"));
    await writeFile(path.join(targetPath, "base.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "new.txt"), "new\n", "utf8");

    const result = await rollbackFile(targetPath, "new.txt");

    await expect(readFile(path.join(targetPath, "new.txt"), "utf8")).rejects.toThrow();
    expect(result).toBe("removed");
  });

  it("chan path traversal", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-rollback-safe-"));
    await writeFile(path.join(targetPath, "base.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);

    await expect(rollbackFile(targetPath, "../outside.txt")).rejects.toThrow("Path nam ngoai --path");
  });

  it("tu choi restore khi snapshot file bi hong", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-rollback-corrupt-"));
    await writeFile(path.join(targetPath, "note.txt"), "old\n", "utf8");
    const state = await createSnapshot(targetPath);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    await writeFile(path.join(state.storagePath, "snapshots", state.activeSnapshotId, "files", "note.txt"), "corrupted\n", "utf8");
    await writeFile(path.join(targetPath, "note.txt"), "new\n", "utf8");

    await expect(rollbackFile(targetPath, manifest.files[0]!.path)).rejects.toThrow("Snapshot file");
  });

  it("khoi phuc toan project ve snapshot chi dinh", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-rollback-snapshot-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");
    const first = await createSnapshot(targetPath);

    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    await writeFile(path.join(targetPath, "extra.txt"), "extra\n", "utf8");
    await resetSnapshot(targetPath);

    await writeFile(path.join(targetPath, "note.txt"), "dirty\n", "utf8");
    await rm(path.join(targetPath, "extra.txt"));
    await writeFile(path.join(targetPath, "temp.txt"), "temp\n", "utf8");

    const nextState = await rollbackToSnapshot(targetPath, first.activeSnapshotId);

    expect(nextState.activeSnapshotId).toBe(first.activeSnapshotId);
    expect((await readState(targetPath)).activeSnapshotId).toBe(first.activeSnapshotId);
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe("v1\n");
    await expect(readFile(path.join(targetPath, "extra.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(targetPath, "temp.txt"), "utf8")).rejects.toThrow();
    expect(await getChanges(targetPath)).toHaveLength(0);
  });
});
