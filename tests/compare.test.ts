import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getChanges } from "../src/core/compare.js";
import { createSnapshot } from "../src/core/snapshot.js";

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
});
