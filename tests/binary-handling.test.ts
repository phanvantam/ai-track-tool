import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { detectBinaryContentInfo } from "../src/core/binary-detector.js";
import { getChanges } from "../src/core/compare.js";
import { renderChangeDiff } from "../src/core/diff.js";
import { rollbackFile } from "../src/core/rollback.js";
import { createSnapshot } from "../src/core/snapshot.js";
import { readManifest } from "../src/core/state.js";

describe("binary handling", () => {
  it("detect png va pdf theo magic bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

    expect(detectBinaryContentInfo("image.png", png)).toEqual({ isBinary: true, type: "image" });
    expect(detectBinaryContentInfo("doc.pdf", pdf)).toEqual({ isBinary: true, type: "document" });
  });

  it("snapshot luu binaryType va diff hien thong bao binary", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-binary-"));
    const original = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]);
    const changed = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x02]);
    await writeFile(path.join(targetPath, "image.png"), original);

    const state = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "image.png"), changed);
    const changes = await getChanges(targetPath);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);

    expect(manifest.files[0]?.binaryType).toBe("image");
    expect(await renderChangeDiff(changes[0]!)).toContain("Binary files differ");
  });

  it("rollback binary copy nguyen file", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-binary-"));
    const original = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]);
    const changed = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x02]);
    await writeFile(path.join(targetPath, "image.png"), original);

    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "image.png"), changed);
    await rollbackFile(targetPath, "image.png");

    expect(await readFile(path.join(targetPath, "image.png"))).toEqual(original);
  });
});
