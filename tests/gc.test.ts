import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { writeAppConfig } from "../src/core/config.js";
import { readSnapshotFileBuffer } from "../src/core/delta.js";
import { runGarbageCollection } from "../src/core/gc.js";
import { getMetadataCachePath } from "../src/core/incremental-scan.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";
import { readManifest, writeManifest } from "../src/core/state.js";

async function isolateHome(): Promise<void> {
  const homePath = await mkdtemp(path.join(tmpdir(), "ai-track-gc-home-"));
  vi.stubEnv("HOME", homePath);
}

async function createStaleSnapshot(storagePath: string, snapshotId: string): Promise<string> {
  const snapshotRoot = path.join(storagePath, "snapshots", snapshotId);
  await mkdir(path.join(snapshotRoot, "files"), { recursive: true });
  await writeFile(
    path.join(snapshotRoot, "manifest.json"),
    `${JSON.stringify({
      snapshotId,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      targetPath: "/tmp/fake",
      ignoreRules: [],
      files: [],
    }, null, 2)}\n`,
    "utf8",
  );
  return snapshotRoot;
}

describe("runGarbageCollection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("chi bao cao khi dry-run", async () => {
    await isolateHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-gc-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");
    const state = await createSnapshot(targetPath);
    const staleSnapshotPath = await createStaleSnapshot(state.storagePath, "stale-snapshot");

    await writeAppConfig({
      storageDir: null,
      projects: [],
      gc: { enabled: true, retentionDays: 0, maxFullCopies: 1, autoRun: false },
    });

    const report = await runGarbageCollection(targetPath, { dryRun: true });

    expect(report.actions.some((action) => action.type === "remove_snapshot")).toBe(true);
    await expect(access(staleSnapshotPath)).resolves.toBeUndefined();
  });

  it("xoa snapshot rac va compact metadata cache", async () => {
    await isolateHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-gc-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");
    const state = await createSnapshot(targetPath);
    const staleSnapshotPath = await createStaleSnapshot(state.storagePath, "stale-snapshot");
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

    await writeAppConfig({
      storageDir: null,
      projects: [],
      gc: { enabled: true, retentionDays: 0, maxFullCopies: 1, autoRun: false },
    });

    const report = await runGarbageCollection(targetPath);
    const nextCache = JSON.parse(await readFile(cachePath, "utf8")) as { files: Record<string, unknown> };

    expect(report.removedSnapshots).toContain("stale-snapshot");
    expect(report.compactedMetadataEntries).toBe(1);
    expect(nextCache.files["ghost.txt"]).toBeUndefined();
    await expect(access(staleSnapshotPath)).rejects.toThrow();
  });

  it("dung fsck de sua orphan file trong snapshot active", async () => {
    await isolateHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-gc-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");
    const state = await createSnapshot(targetPath);
    const orphanPath = path.join(state.storagePath, "snapshots", state.activeSnapshotId, "files", "orphan.txt");
    await writeFile(orphanPath, "orphan\n", "utf8");

    await writeAppConfig({
      storageDir: null,
      projects: [],
      gc: { enabled: true, retentionDays: 0, maxFullCopies: 1, autoRun: false },
    });

    const report = await runGarbageCollection(targetPath);

    expect(report.repairedItems).toBeGreaterThan(0);
    await expect(access(orphanPath)).rejects.toThrow();
  });

  it("nen snapshot cu trong history sang delta/reference", async () => {
    await isolateHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-gc-"));
    const beforeText = `${Array.from({ length: 200 }, (_, index) => `line ${index}`).join("\n")}\n`;
    const middleLines = Array.from({ length: 200 }, (_, index) => `line ${index}`);
    middleLines[120] = "line 120 updated";
    const middleText = `${middleLines.join("\n")}\n`;
    const finalLines = [...middleLines];
    finalLines[150] = "line 150 updated";
    const finalText = `${finalLines.join("\n")}\n`;

    await writeFile(path.join(targetPath, "note.txt"), beforeText, "utf8");
    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), middleText, "utf8");
    const second = await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), finalText, "utf8");
    const third = await resetSnapshot(targetPath);

    const secondManifest = await readManifest(second.storagePath, second.activeSnapshotId);
    const noteFile = secondManifest.files.find((file) => file.path === "note.txt");

    expect(noteFile).toBeDefined();

    const legacyFilePath = path.join(second.storagePath, "snapshots", second.activeSnapshotId, "files", "note.txt");
    await writeFile(
      legacyFilePath,
      (await readSnapshotFileBuffer(second.storagePath, second.activeSnapshotId, "note.txt")).toString("utf8"),
      "utf8",
    );

    if (noteFile?.deltaPath) {
      await rm(path.join(second.storagePath, noteFile.deltaPath), { force: true });
    }

    await writeManifest(second.storagePath, {
      ...secondManifest,
      files: secondManifest.files.map((file) => (file.path === "note.txt"
        ? {
            ...file,
            storageKind: "full",
            baseSnapshotId: undefined,
            deltaPath: undefined,
            compressedSize: undefined,
            uncompressedSize: undefined,
          }
        : file)),
    });

    await writeAppConfig({
      storageDir: null,
      projects: [],
      gc: { enabled: true, retentionDays: 0, maxFullCopies: 1, autoRun: false },
    });

    const report = await runGarbageCollection(targetPath);
    const nextSecondManifest = await readManifest(third.storagePath, second.activeSnapshotId);
    const nextNoteFile = nextSecondManifest.files.find((file) => file.path === "note.txt");

    expect(report.actions.some((action) => action.type === "compress_snapshot" && action.path === second.activeSnapshotId)).toBe(true);
    expect(nextNoteFile?.storageKind).toBe("delta");
    expect((await readSnapshotFileBuffer(third.storagePath, second.activeSnapshotId, "note.txt")).toString("utf8")).toBe(middleText);
    expect((await readSnapshotFileBuffer(third.storagePath, third.activeSnapshotId, "note.txt")).toString("utf8")).toBe(finalText);
    expect(first.activeSnapshotId).not.toBe(third.activeSnapshotId);
  });

  it("bo qua snapshot cu hong thay vi lam GC fail", async () => {
    await isolateHome();
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-gc-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "middle\n", "utf8");
    const second = await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "latest\n", "utf8");
    await resetSnapshot(targetPath);

    const secondManifest = await readManifest(second.storagePath, second.activeSnapshotId);
    await writeManifest(second.storagePath, {
      ...secondManifest,
      createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await rm(path.join(second.storagePath, "snapshots", second.activeSnapshotId, "files", "note.txt"), { force: true });

    await writeAppConfig({
      storageDir: null,
      projects: [],
      gc: { enabled: true, retentionDays: 30, maxFullCopies: 1, autoRun: false },
    });

    const report = await runGarbageCollection(targetPath);

    expect(report.actions.some((action) => action.type === "skip_delta" && action.path === second.activeSnapshotId)).toBe(true);
  });
});
