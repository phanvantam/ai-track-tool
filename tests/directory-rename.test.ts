import { mkdir, mkdtemp, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getChanges } from "../src/core/compare.js";
import { createSnapshot } from "../src/core/snapshot.js";

describe("directory rename detection", () => {
  it("gan directoryRename cho cac file rename cung thu muc", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-dir-rename-"));
    await mkdir(path.join(targetPath, "old"), { recursive: true });
    await writeFile(path.join(targetPath, "old", "a.txt"), "a\n", "utf8");
    await writeFile(path.join(targetPath, "old", "b.txt"), "b\n", "utf8");

    await createSnapshot(targetPath);
    await rename(path.join(targetPath, "old"), path.join(targetPath, "new"));

    const changes = await getChanges(targetPath);

    expect(changes.map((change) => change.type)).toEqual(["renamed", "renamed"]);
    expect(changes.every((change) => change.directoryRename?.oldPath === "old" && change.directoryRename?.newPath === "new")).toBe(true);
  });
});
