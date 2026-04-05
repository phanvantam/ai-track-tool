import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createPatch } from "diff";
import { describe, expect, it } from "vitest";

import { runCherryPickCommand } from "../src/commands/cherry-pick.js";
import { applySelectedHunks } from "../src/core/hunk-applicator.js";
import { parsePatchHunks } from "../src/core/hunk-parser.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";

function createLines(prefix: string): string {
  return `${Array.from({ length: 20 }, (_, index) => `${prefix}-${index}`).join("\n")}\n`;
}

describe("cherry-pick", () => {
  it("parse duoc nhieu hunk", () => {
    const current = createLines("base");
    const nextLines = Array.from({ length: 20 }, (_, index) => `base-${index}`);
    nextLines[1] = "changed-1";
    nextLines[15] = "changed-15";
    const patch = createPatch("note.txt", current, `${nextLines.join("\n")}\n`, "a", "b");
    const hunks = parsePatchHunks(patch);

    expect(hunks).toHaveLength(2);
  });

  it("apply selected hunk", () => {
    const current = createLines("workspace");
    const snapshotLines = Array.from({ length: 20 }, (_, index) => `workspace-${index}`);
    snapshotLines[1] = "snapshot-1";
    snapshotLines[15] = "snapshot-15";
    const patch = createPatch("note.txt", current, `${snapshotLines.join("\n")}\n`, "current", "snapshot");
    const hunks = parsePatchHunks(patch);
    const result = applySelectedHunks(current, "note.txt", hunks, [0]);

    expect(result.success).toBe(true);
    expect(result.appliedHunks).toBe(1);
    expect(result.content).toContain("snapshot-1");
    expect(result.content).toContain("workspace-15");
  });

  it("bao conflict khi context khong con khop", () => {
    const base = createLines("workspace");
    const patch = createPatch("note.txt", base, base.replace("workspace-1", "snapshot-1"), "current", "snapshot");
    const hunks = parsePatchHunks(patch);
    const staleCurrent = base.replace("workspace-0", "other-0");
    const result = applySelectedHunks(staleCurrent, "note.txt", hunks, [0]);

    expect(result.success).toBe(false);
    expect(result.conflicts[0]).toContain("Context");
  });

  it("command cherry-pick revert mot hunk", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-cherry-"));
    await writeFile(path.join(targetPath, "note.txt"), createLines("base"), "utf8");
    await createSnapshot(targetPath);

    const snapshotLines = Array.from({ length: 20 }, (_, index) => `base-${index}`);
    const currentLines = [...snapshotLines];
    currentLines[1] = "workspace-1";
    currentLines[15] = "workspace-15";
    await writeFile(path.join(targetPath, "note.txt"), `${currentLines.join("\n")}\n`, "utf8");
    await resetSnapshot(targetPath);

    const divergedLines = [...currentLines];
    divergedLines[1] = "diverged-1";
    divergedLines[15] = "diverged-15";
    await writeFile(path.join(targetPath, "note.txt"), `${divergedLines.join("\n")}\n`, "utf8");

    await runCherryPickCommand(targetPath, "note.txt", { hunks: [0] });

    const content = await readFile(path.join(targetPath, "note.txt"), "utf8");
    expect(content).toContain("workspace-1");
    expect(content).toContain("diverged-15");
  });
});
