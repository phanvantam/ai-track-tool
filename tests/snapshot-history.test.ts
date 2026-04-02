import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildSnapshotChain, diffSnapshotManifests, renderSnapshotGraph } from "../src/core/snapshot-chain.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";
import { getStateFilePath, readManifest, readState } from "../src/core/state.js";

describe("snapshot history", () => {
  it("tao parent reference va snapshotHistory khi reset", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-history-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v3\n", "utf8");
    const third = await resetSnapshot(targetPath);
    const thirdManifest = await readManifest(third.storagePath, third.activeSnapshotId);
    const secondManifest = await readManifest(third.storagePath, second.activeSnapshotId);
    const state = await readState(targetPath);

    expect(secondManifest.parentSnapshotId).toBe(first.activeSnapshotId);
    expect(thirdManifest.parentSnapshotId).toBe(second.activeSnapshotId);
    expect(state.snapshotHistory).toEqual([third.activeSnapshotId, second.activeSnapshotId, first.activeSnapshotId]);
    expect(state.previousSnapshotId).toBe(second.activeSnapshotId);
  });

  it("build chain, graph va diff snapshots dung", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-history-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    await writeFile(path.join(targetPath, "extra.txt"), "extra\n", "utf8");
    const second = await resetSnapshot(targetPath);
    const chain = await buildSnapshotChain(second.storagePath);
    const graph = renderSnapshotGraph(chain, second.activeSnapshotId);
    const firstManifest = await readManifest(second.storagePath, first.activeSnapshotId);
    const secondManifest = await readManifest(second.storagePath, second.activeSnapshotId);
    const diffs = diffSnapshotManifests(firstManifest, secondManifest);

    expect(chain).toHaveLength(2);
    expect(graph).toContain(first.activeSnapshotId);
    expect(graph).toContain(second.activeSnapshotId);
    expect(diffs.map((diff) => `${diff.type}:${diff.path}`)).toEqual(["added:extra.txt", "modified:note.txt"]);
  });

  it("tu bo sung history khi state cu khong co snapshotHistory", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-history-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(
      getStateFilePath(first.storagePath),
      `${JSON.stringify({
        activeSnapshotId: first.activeSnapshotId,
        targetPath: first.targetPath,
        storagePath: first.storagePath,
        updatedAt: first.updatedAt,
      }, null, 2)}\n`,
      "utf8",
    );

    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);
    const rawState = JSON.parse(await readFile(getStateFilePath(second.storagePath), "utf8")) as { snapshotHistory?: string[] };

    expect(rawState.snapshotHistory).toEqual([second.activeSnapshotId, first.activeSnapshotId]);
  });
});
