import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createSnapshot, ensureSnapshot } from "../src/core/snapshot.js";
import { readManifest, readState } from "../src/core/state.js";

describe("createSnapshot", () => {
  it("tao state va manifest", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-snapshot-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const state = await createSnapshot(targetPath);
    const savedState = await readState(targetPath);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    const copiedFile = await readFile(path.join(state.storagePath, "snapshots", state.activeSnapshotId, "files", "note.txt"), "utf8");

    expect(savedState.activeSnapshotId).toBe(state.activeSnapshotId);
    expect(savedState.storagePath).toBe(state.storagePath);
    expect(manifest.files).toHaveLength(1);
    expect(manifest.files[0]?.path).toBe("note.txt");
    expect(copiedFile).toBe("hello\n");
  });

  it("ensureSnapshot tranh tao duplicate snapshot khi goi dong thoi", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-snapshot-race-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const states = await Promise.all(Array.from({ length: 10 }, () => ensureSnapshot(targetPath)));
    const savedState = await readState(targetPath);
    const snapshotDirs = await readdir(path.join(savedState.storagePath, "snapshots"));

    expect(new Set(states.map((state) => state.activeSnapshotId)).size).toBe(1);
    expect(snapshotDirs).toHaveLength(1);
  });
});
