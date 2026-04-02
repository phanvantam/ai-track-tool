import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { writeAppConfig } from "../src/core/config.js";
import { getChanges } from "../src/core/compare.js";
import { runFsck } from "../src/core/fsck.js";
import { runGarbageCollection } from "../src/core/gc.js";
import { getMetadataCachePath } from "../src/core/incremental-scan.js";
import { createSnapshot, scanCurrentFiles } from "../src/core/snapshot.js";

async function isolateHome(): Promise<void> {
  const homePath = await mkdtemp(path.join(tmpdir(), "ai-track-phase-1-home-"));
  vi.stubEnv("HOME", homePath);
}

describe("phase 1 integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ket hop incremental scan, fsck va gc", async () => {
    await isolateHome();
    await writeAppConfig({
      storageDir: null,
      projects: [],
      gc: { enabled: true, retentionDays: 30, maxFullCopies: 1, autoRun: false },
    });

    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-phase-1-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");
    await writeFile(path.join(targetPath, "keep.txt"), "keep\n", "utf8");

    const state = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "hello changed\n", "utf8");

    const scannedFiles = await scanCurrentFiles(targetPath);
    const byPath = new Map(scannedFiles.map((file) => [file.path, file]));
    expect(byPath.get("note.txt")?.needsHashCheck).toBe(true);
    expect(byPath.get("keep.txt")?.needsHashCheck).toBe(false);

    const orphanPath = path.join(state.storagePath, "snapshots", state.activeSnapshotId, "files", "orphan.txt");
    await writeFile(orphanPath, "orphan\n", "utf8");
    const cachePath = getMetadataCachePath(state.storagePath);
    const cache = JSON.parse(await readFile(cachePath, "utf8")) as { files: Record<string, unknown> };
    cache.files["ghost.txt"] = {
      path: "ghost.txt",
      hash: "deadbeef",
      size: 1,
      mtimeMs: Date.now(),
      isBinary: false,
    };
    await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
    await mkdir(path.join(state.storagePath, "snapshots", "stale-snapshot", "files"), { recursive: true });
    await writeFile(
      path.join(state.storagePath, "snapshots", "stale-snapshot", "manifest.json"),
      `${JSON.stringify({
        snapshotId: "stale-snapshot",
        createdAt: new Date(Date.now() - 60_000).toISOString(),
        targetPath,
        ignoreRules: [],
        files: [],
      }, null, 2)}\n`,
      "utf8",
    );

    const gcReport = await runGarbageCollection(targetPath);
    const fsckReport = await runFsck(targetPath);
    const changes = await getChanges(targetPath);

    expect(gcReport.removedSnapshots).toContain("stale-snapshot");
    expect(gcReport.compactedMetadataEntries).toBe(1);
    expect(fsckReport.isHealthy).toBe(true);
    expect(changes.map((change) => `${change.type}:${change.path}`)).toEqual(["modified:note.txt"]);
  });
});
