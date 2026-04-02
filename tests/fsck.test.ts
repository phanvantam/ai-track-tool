import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runFsck } from "../src/core/fsck.js";
import { createSnapshot } from "../src/core/snapshot.js";
import { readManifest } from "../src/core/state.js";

describe("runFsck", () => {
  it("bao healthy khi snapshot hop le", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-fsck-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    await createSnapshot(targetPath);
    const report = await runFsck(targetPath);

    expect(report.isHealthy).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("phat hien va sua missing file trong manifest", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-fsck-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const state = await createSnapshot(targetPath);
    await rm(path.join(state.storagePath, "snapshots", state.activeSnapshotId, "files", "note.txt"));

    const report = await runFsck(targetPath, { repair: true });
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);

    expect(report.errors.some((error) => error.type === "missing_file" && error.repaired)).toBe(true);
    expect(manifest.files).toHaveLength(0);
  });

  it("phat hien va xoa orphan file", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-fsck-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const state = await createSnapshot(targetPath);
    const orphanPath = path.join(state.storagePath, "snapshots", state.activeSnapshotId, "files", "orphan.txt");
    await mkdir(path.dirname(orphanPath), { recursive: true });
    await writeFile(orphanPath, "orphan\n", "utf8");

    const report = await runFsck(targetPath, { repair: true });

    expect(report.errors.some((error) => error.type === "orphan_file" && error.repaired)).toBe(true);
    await expect(readFile(orphanPath, "utf8")).rejects.toThrow();
  });

  it("phat hien manifest bi hong", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-fsck-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const state = await createSnapshot(targetPath);
    await writeFile(path.join(state.storagePath, "snapshots", state.activeSnapshotId, "manifest.json"), "{bad json", "utf8");

    const report = await runFsck(targetPath);

    expect(report.isHealthy).toBe(false);
    expect(report.errors[0]?.type).toBe("corrupt_manifest");
  });
});
