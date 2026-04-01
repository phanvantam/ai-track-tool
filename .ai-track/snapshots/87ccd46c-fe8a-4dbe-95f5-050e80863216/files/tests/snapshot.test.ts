import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createSnapshot } from "../src/core/snapshot.js";
import { readManifest, readState } from "../src/core/state.js";

describe("createSnapshot", () => {
  it("tao state va manifest", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-snapshot-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const state = await createSnapshot(targetPath);
    const savedState = await readState(targetPath);
    const manifest = await readManifest(targetPath, state.activeSnapshotId);
    const copiedFile = await readFile(path.join(targetPath, ".ai-track", "snapshots", state.activeSnapshotId, "files", "note.txt"), "utf8");

    expect(savedState.activeSnapshotId).toBe(state.activeSnapshotId);
    expect(manifest.files).toHaveLength(1);
    expect(manifest.files[0]?.path).toBe("note.txt");
    expect(copiedFile).toBe("hello\n");
  });
});
