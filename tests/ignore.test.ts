import { describe, expect, it } from "vitest";

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { loadIgnoreRules, shouldIgnorePath } from "../src/core/ignore.js";

describe("shouldIgnorePath", () => {
  it("bo qua thu muc mac dinh", () => {
    expect(shouldIgnorePath("node_modules/pkg/index.js")).toBe(true);
    expect(shouldIgnorePath("vendor/autoload.php")).toBe(true);
    expect(shouldIgnorePath("dist/main.js")).toBe(true);
    expect(shouldIgnorePath("src/index.ts")).toBe(false);
  });

  it("doc them rule tu .gitignore", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-ignore-"));
    await writeFile(path.join(targetPath, ".gitignore"), "cache/\nsecret.txt\n", "utf8");

    const ignoreRules = await loadIgnoreRules(targetPath);

    expect(shouldIgnorePath("cache/data.json", ignoreRules)).toBe(true);
    expect(shouldIgnorePath("secret.txt", ignoreRules)).toBe(true);
    expect(shouldIgnorePath("src/index.ts", ignoreRules)).toBe(false);
  });
});
