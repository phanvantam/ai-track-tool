import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { applyPatchToWorkspace, exportPatchBetweenSnapshots } from "../src/core/patch.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";

describe("patch export/import", () => {
  it("export patch co metadata va apply lai duoc", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-patch-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const exported = await exportPatchBetweenSnapshots(targetPath, first.activeSnapshotId, second.activeSnapshotId);
    const result = await applyPatchToWorkspace(targetPath, exported.patchText);

    expect(exported.patchText).toContain("# ai-track-meta ");
    expect(result.appliedFiles).toContain("note.txt");
  });

  it("support reverse patch", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-patch-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);

    const exported = await exportPatchBetweenSnapshots(targetPath, first.activeSnapshotId, second.activeSnapshotId);
    const result = await applyPatchToWorkspace(targetPath, exported.patchText, { reverse: true });

    expect(result.appliedFiles).toContain("note.txt");
  });

  it("fallback 3-way merge khi patch fail", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-patch-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "workspace-change\n", "utf8");

    const exported = await exportPatchBetweenSnapshots(targetPath, first.activeSnapshotId, second.activeSnapshotId);
    const result = await applyPatchToWorkspace(targetPath, exported.patchText, { threeWay: true });

    expect(result.conflicts).toContain("note.txt");
  });
});
