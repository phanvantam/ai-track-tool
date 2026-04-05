import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  addSnapshotAnnotation,
  createSnapshotTag,
  deleteSnapshotAnnotation,
  deleteSnapshotTag,
  getSnapshotAnnotation,
  listSnapshotAnnotations,
  listSnapshotTags,
  resolveTagToSnapshot,
} from "../src/core/snapshot-tags.js";
import { readReflog } from "../src/core/reflog.js";
import { createSnapshot } from "../src/core/snapshot.js";

describe("tag and note", () => {
  it("tao, list, resolve va xoa tag", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-tag-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");

    const state = await createSnapshot(targetPath);
    await createSnapshotTag(state.storagePath, state.activeSnapshotId, "v1", "tester");

    expect(await resolveTagToSnapshot(state.storagePath, "v1")).toBe(state.activeSnapshotId);
    expect((await listSnapshotTags(state.storagePath)).map((tag) => tag.name)).toEqual(["v1"]);

    await deleteSnapshotTag(state.storagePath, "v1", "tester");
    expect(await listSnapshotTags(state.storagePath)).toHaveLength(0);
  });

  it("tao, doc, list va xoa note", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-note-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");

    const state = await createSnapshot(targetPath);
    await addSnapshotAnnotation(state.storagePath, state.activeSnapshotId, "before release", "tester");

    expect((await getSnapshotAnnotation(state.storagePath, state.activeSnapshotId))?.content).toBe("before release");
    expect((await listSnapshotAnnotations(state.storagePath)).map((note) => note.snapshotId)).toEqual([state.activeSnapshotId]);

    await deleteSnapshotAnnotation(state.storagePath, state.activeSnapshotId, "tester");
    expect(await getSnapshotAnnotation(state.storagePath, state.activeSnapshotId)).toBeNull();
  });

  it("tag va note duoc ghi vao reflog", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-tag-note-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");

    const state = await createSnapshot(targetPath);
    await createSnapshotTag(state.storagePath, state.activeSnapshotId, "release", "tester");
    await addSnapshotAnnotation(state.storagePath, state.activeSnapshotId, "deploy soon", "tester");
    const reflog = await readReflog(state.storagePath);

    expect(reflog.map((entry) => entry.action)).toContain("tag");
    expect(reflog.map((entry) => entry.action)).toContain("note");
  });

  it("khong tao tag hoac note cho snapshot khong ton tai", async () => {
    const storagePath = await mkdtemp(path.join(tmpdir(), "ai-track-tag-note-invalid-"));

    await expect(createSnapshotTag(storagePath, "missing", "v1", "tester")).rejects.toThrow();
    await expect(addSnapshotAnnotation(storagePath, "missing", "note", "tester")).rejects.toThrow();
  });
});
