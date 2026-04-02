import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { rollbackFile } from "../src/core/rollback.js";
import { createSnapshot } from "../src/core/snapshot.js";
import { applyStash, createStash, getStash, listStashes } from "../src/core/stash.js";

describe("stash", () => {
  it("save va apply stash", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-stash-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "workspace\n", "utf8");

    const stash = await createStash(targetPath, "demo");
    await rollbackFile(targetPath, "note.txt");
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe("base\n");

    const result = await applyStash(targetPath, stash.stashId);
    expect(result.appliedFiles).toContain("note.txt");
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe("workspace\n");
  });

  it("pop xoa stash khi apply thanh cong", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-stash-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "workspace\n", "utf8");

    const stash = await createStash(targetPath, "demo");
    await rollbackFile(targetPath, "note.txt");
    const result = await applyStash(targetPath, stash.stashId, true);

    expect(result.removed).toBe(true);
    expect(await getStash(targetPath, stash.stashId)).toBeNull();
  });

  it("list stash theo thu tu moi nhat truoc", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-stash-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "one\n", "utf8");
    const first = await createStash(targetPath, "first");
    await writeFile(path.join(targetPath, "note.txt"), "two\n", "utf8");
    const second = await createStash(targetPath, "second");

    const stashes = await listStashes(targetPath);

    expect(stashes.map((stash) => stash.stashId)).toEqual([second.stashId, first.stashId]);
  });
});
