import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getChanges } from "../src/core/compare.js";
import { getMetadataCachePath } from "../src/core/incremental-scan.js";
import { createSnapshot } from "../src/core/snapshot.js";
import { getStateFilePath, readManifest } from "../src/core/state.js";

describe("getChanges", () => {
  it("nhan dien added, modified, deleted", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-compare-"));
    await mkdir(path.join(targetPath, "sub"), { recursive: true });
    await writeFile(path.join(targetPath, "keep.txt"), "old\n", "utf8");
    await writeFile(path.join(targetPath, "remove.txt"), "bye\n", "utf8");

    await createSnapshot(targetPath);

    await writeFile(path.join(targetPath, "keep.txt"), "new\n", "utf8");
    await rm(path.join(targetPath, "remove.txt"));
    await writeFile(path.join(targetPath, "sub", "add.txt"), "plus\n", "utf8");

    const changes = await getChanges(targetPath);

    expect(changes.map((change) => `${change.type}:${change.path}`)).toEqual([
      "modified:keep.txt",
      "deleted:remove.txt",
      "added:sub/add.txt",
    ]);
  });

  it("van hoat dong voi manifest cu khong co metadata", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-compare-legacy-"));
    await writeFile(path.join(targetPath, "note.txt"), "old\n", "utf8");

    const state = await createSnapshot(targetPath);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    await writeFile(
      path.join(state.storagePath, "snapshots", state.activeSnapshotId, "manifest.json"),
      `${JSON.stringify({ ...manifest, metadata: undefined }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      getStateFilePath(state.storagePath),
      `${JSON.stringify({
        activeSnapshotId: state.activeSnapshotId,
        targetPath: state.targetPath,
        storagePath: state.storagePath,
        updatedAt: state.updatedAt,
      }, null, 2)}\n`,
      "utf8",
    );
    await rm(getMetadataCachePath(state.storagePath), { force: true });
    await writeFile(path.join(targetPath, "note.txt"), "new\n", "utf8");

    const changes = await getChanges(targetPath);
    const stateFile = JSON.parse(await readFile(getStateFilePath(state.storagePath), "utf8")) as { metadataCacheVersion?: number };

    expect(changes.map((change) => `${change.type}:${change.path}`)).toEqual(["modified:note.txt"]);
    expect(stateFile.metadataCacheVersion).toBeUndefined();
  });
});
