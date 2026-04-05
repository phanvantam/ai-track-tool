import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getMetadataCachePath } from "../src/core/incremental-scan.js";
import { scanCurrentFiles, createSnapshot } from "../src/core/snapshot.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("scanCurrentFiles", () => {
  it("tai su dung hash tu metadata cache cho file khong doi", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-incremental-"));
    await writeFile(path.join(targetPath, "a.txt"), "alpha\n", "utf8");
    await writeFile(path.join(targetPath, "b.txt"), "beta\n", "utf8");

    const state = await createSnapshot(targetPath);
    const cachePath = getMetadataCachePath(state.storagePath);
    const cache = JSON.parse(await readFile(cachePath, "utf8")) as { files: Record<string, { hash: string }> };
    const files = await scanCurrentFiles(targetPath);

    expect(cache.files["a.txt"]?.hash).toBeTruthy();
    expect(cache.files["b.txt"]?.hash).toBeTruthy();
    expect(files.every((file) => file.needsHashCheck === false)).toBe(true);
  });

  it("chi danh dau file da doi la can hash lai", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-incremental-"));
    await writeFile(path.join(targetPath, "a.txt"), "alpha\n", "utf8");
    await writeFile(path.join(targetPath, "b.txt"), "beta\n", "utf8");

    await createSnapshot(targetPath);
    await sleep(20);
    await writeFile(path.join(targetPath, "a.txt"), "alpha changed\n", "utf8");

    const files = await scanCurrentFiles(targetPath);
    const fileMap = new Map(files.map((file) => [file.path, file]));

    expect(fileMap.get("a.txt")?.needsHashCheck).toBe(true);
    expect(fileMap.get("b.txt")?.needsHashCheck).toBe(false);
  });

  it("fallback full scan khi metadata cache bi hong", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-incremental-"));
    await writeFile(path.join(targetPath, "note.txt"), "hello\n", "utf8");

    const state = await createSnapshot(targetPath);
    await writeFile(getMetadataCachePath(state.storagePath), "{invalid json", "utf8");

    const files = await scanCurrentFiles(targetPath);

    expect(files).toHaveLength(1);
    expect(files[0]?.needsHashCheck).toBe(true);
  });
});
