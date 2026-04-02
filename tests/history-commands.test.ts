import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDiffSnapshotsCommand } from "../src/commands/diff-snapshots.js";
import { runLogCommand } from "../src/commands/log.js";
import { runNoteCommand } from "../src/commands/note.js";
import { runReflogCommand } from "../src/commands/reflog.js";
import { runTagCommand } from "../src/commands/tag.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";

describe("history commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("in duoc log, reflog, tag, note va diff snapshots", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-history-cmd-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);

    await runTagCommand(targetPath, { action: "create", tagName: "v2", snapshotId: second.activeSnapshotId });
    await runNoteCommand(targetPath, { action: "add", snapshotId: second.activeSnapshotId, content: "ready" });
    await runLogCommand(targetPath, { graph: true });
    await runReflogCommand(targetPath, { limit: 10 });
    await runDiffSnapshotsCommand(targetPath, first.activeSnapshotId, second.activeSnapshotId);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");

    expect(output).toContain(first.activeSnapshotId);
    expect(output).toContain(second.activeSnapshotId);
    expect(output).toContain("create");
    expect(output).toContain("modified: note.txt");
  });

  it("validate tag, since va graph filter dung", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-history-filter-"));
    await writeFile(path.join(targetPath, "note.txt"), "v1\n", "utf8");
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    const second = await resetSnapshot(targetPath);

    await expect(runLogCommand(targetPath, { tag: "missing" })).rejects.toThrow("Không tìm thấy tag");
    await expect(runLogCommand(targetPath, { since: "bad-date" })).rejects.toThrow("--since");

    stdoutSpy.mockClear();
    await runLogCommand(targetPath, { graph: true, limit: 1 });
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");

    expect(output).toContain(second.activeSnapshotId);
    expect(output.match(/[0-9a-f-]{36}/g)?.length).toBe(1);
  });
});
