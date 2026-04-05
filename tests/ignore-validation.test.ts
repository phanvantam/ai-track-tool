import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runIgnoreValidateCommand } from "../src/commands/ignore-validate.js";
import { testIgnoreRules, validateIgnoreRules } from "../src/core/ignore.js";

describe("ignore validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bat pattern qua rong va pattern loi", () => {
    const errors = validateIgnoreRules(["*", "[abc", "dist", "dist"]);

    expect(errors.map((error) => error.error)).toEqual(["too_broad", "invalid_regex", "syntax_error"]);
  });

  it("test path samples", () => {
    const results = testIgnoreRules(["dist", "*.log"], ["dist/app.js", "src/app.ts", "error.log"]);

    expect(results).toEqual([
      { sample: "dist/app.js", ignored: true },
      { sample: "src/app.ts", ignored: false },
      { sample: "error.log", ignored: true },
    ]);
  });

  it("command in loi va sample result", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-ignore-validate-"));
    await writeFile(path.join(root, ".ai-track-ignore"), "*\ndist\n", "utf8");
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await runIgnoreValidateCommand(root, { samples: ["dist/app.js", "src/app.ts"] });

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Pattern quá rộng");
    expect(output).toContain("dist/app.js: ignored");
  });
});
