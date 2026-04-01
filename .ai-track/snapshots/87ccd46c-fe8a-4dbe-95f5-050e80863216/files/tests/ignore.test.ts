import { describe, expect, it } from "vitest";

import { shouldIgnorePath } from "../src/core/ignore.js";

describe("shouldIgnorePath", () => {
  it("bo qua thu muc mac dinh", () => {
    expect(shouldIgnorePath("node_modules/pkg/index.js")).toBe(true);
    expect(shouldIgnorePath("dist/main.js")).toBe(true);
    expect(shouldIgnorePath("src/index.ts")).toBe(false);
  });
});
