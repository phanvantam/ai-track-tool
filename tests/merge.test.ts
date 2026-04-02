import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { mergeTrackedFile, threeWayMerge } from "../src/core/merge.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";

describe("threeWayMerge", () => {
  it("giu snapshot khi ours khong doi", () => {
    const result = threeWayMerge("note.txt", "old\n", "old\n", "new\n", { strategy: "manual" });

    expect(result.status).toBe("success");
    expect(result.merged).toBe("new\n");
  });

  it("tao conflict marker khi rollback gap user edits", () => {
    const result = threeWayMerge("note.txt", "base\n", "ours\n", "base\n", {
      strategy: "manual",
      conflictOnDivergence: true,
    });

    expect(result.status).toBe("conflict");
    expect(result.merged).toContain("<<<<<<< ours");
    expect(result.merged).toContain(">>>>>>> theirs");
  });

  it("binary thi bao conflict", () => {
    const result = threeWayMerge("file.bin", "a\u0000", "b\u0000", "a\u0000", {
      strategy: "manual",
      conflictOnDivergence: true,
    });

    expect(result.status).toBe("conflict");
    expect(result.conflicts[0]?.type).toBe("binary");
  });
});

describe("mergeTrackedFile", () => {
  it("ghi conflict marker vao workspace", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-merge-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "ours\n", "utf8");

    const result = await mergeTrackedFile(targetPath, "note.txt", "manual");
    const content = await readFile(path.join(targetPath, "note.txt"), "utf8");

    expect(result.status).toBe("conflict");
    expect(content).toContain("<<<<<<< ours");
  });

  it("strategy theirs restore snapshot", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-merge-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "ours\n", "utf8");

    const result = await mergeTrackedFile(targetPath, "note.txt", "theirs");
    const content = await readFile(path.join(targetPath, "note.txt"), "utf8");

    expect(result.status).toBe("success");
    expect(content).toBe("base\n");
  });

  it("merge duoc file dang luu bang delta", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-merge-"));
    const beforeText = `${Array.from({ length: 200 }, (_, index) => `line ${index}`).join("\n")}\n`;
    const nextLines = Array.from({ length: 200 }, (_, index) => `line ${index}`);
    nextLines[120] = "line 120 updated";
    const snapshotText = `${nextLines.join("\n")}\n`;
    await writeFile(path.join(targetPath, "note.txt"), beforeText, "utf8");

    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), snapshotText, "utf8");
    await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "workspace\n", "utf8");

    const result = await mergeTrackedFile(targetPath, "note.txt", "theirs");

    expect(result.status).toBe("success");
    expect(await readFile(path.join(targetPath, "note.txt"), "utf8")).toBe(snapshotText);
  });

  it("file binary khong ghi conflict marker text", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-merge-"));
    await writeFile(path.join(targetPath, "file.bin"), Buffer.from([0, 1, 2, 3]));
    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "file.bin"), Buffer.from([9, 8, 7, 6]));

    const result = await mergeTrackedFile(targetPath, "file.bin", "manual");

    expect(result.status).toBe("conflict");
    expect(await readFile(path.join(targetPath, "file.bin"))).toEqual(Buffer.from([9, 8, 7, 6]));
  });
});
