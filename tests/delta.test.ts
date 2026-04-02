import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getChanges } from "../src/core/compare.js";
import { getDeltaInfo, materializeSnapshotFile, readSnapshotFileBuffer } from "../src/core/delta.js";
import { rollbackFile } from "../src/core/rollback.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";
import { readManifest } from "../src/core/state.js";

describe("delta storage", () => {
  it("luu file khong doi dang reference", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-delta-"));
    await writeFile(path.join(targetPath, "keep.txt"), "same\n", "utf8");
    await writeFile(path.join(targetPath, "edit.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "edit.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);
    const manifest = await readManifest(second.storagePath, second.activeSnapshotId);
    const keep = manifest.files.find((file) => file.path === "keep.txt");

    expect(keep?.storageKind).toBe("reference");
    expect(keep?.baseSnapshotId).toBe(first.activeSnapshotId);
  });

  it("luu file text doi dang delta va reconstruct duoc", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-delta-"));
    const beforeText = `${Array.from({ length: 200 }, (_, index) => `line ${index}`).join("\n")}\n`;
    const afterLines = Array.from({ length: 200 }, (_, index) => `line ${index}`);
    afterLines[120] = "line 120 updated";
    const afterText = `${afterLines.join("\n")}\n`;
    await writeFile(path.join(targetPath, "note.txt"), beforeText, "utf8");

    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), afterText, "utf8");
    const second = await resetSnapshot(targetPath);
    const manifest = await readManifest(second.storagePath, second.activeSnapshotId);
    const note = manifest.files.find((file) => file.path === "note.txt");

    expect(note?.storageKind).toBe("delta");
    expect((await readSnapshotFileBuffer(second.storagePath, second.activeSnapshotId, "note.txt")).toString("utf8")).toBe(afterText);
    expect(await readFile(await materializeSnapshotFile(second.storagePath, second.activeSnapshotId, "note.txt"), "utf8")).toBe(afterText);
  });

  it("compare va rollback van hoat dong voi snapshot delta", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-delta-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await writeFile(path.join(targetPath, "keep.txt"), "same\n", "utf8");

    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "snapshot-v2\n", "utf8");
    const second = await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "workspace-change\n", "utf8");

    const changes = await getChanges(targetPath);
    expect(changes.map((change) => `${change.type}:${change.path}`)).toEqual(["modified:note.txt"]);

    await rollbackFile(targetPath, "note.txt");
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe("snapshot-v2\n");

    const info = await getDeltaInfo(second.storagePath);
    expect(info.referenceFiles).toBeGreaterThan(0);
  });
});
