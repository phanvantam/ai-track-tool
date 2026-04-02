import { mkdtemp, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { detectFilesystemConfig, normalizePathForComparison } from "../src/core/case-sensitivity.js";
import { getChanges } from "../src/core/compare.js";
import { createSnapshot } from "../src/core/snapshot.js";

describe("case sensitivity", () => {
  it("detect filesystem config", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-case-"));
    const config = await detectFilesystemConfig(targetPath);

    expect(typeof config.caseInsensitive).toBe("boolean");
    expect(config.casePreserving).toBe(true);
    expect(normalizePathForComparison("File.txt", { caseInsensitive: true, casePreserving: true })).toBe("file.txt");
  });

  it("detect case rename", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-case-"));
    await writeFile(path.join(targetPath, "File.txt"), "hello\n", "utf8");
    await createSnapshot(targetPath);
    await rename(path.join(targetPath, "File.txt"), path.join(targetPath, "file.txt"));

    const changes = await getChanges(targetPath);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.type).toBe("renamed");
    expect(changes[0]?.oldPath).toBe("File.txt");
    expect(changes[0]?.path).toBe("file.txt");
  });
});
