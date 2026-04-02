import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { mergeTrackedFile } from "../src/core/merge.js";
import { appendReflogEntry, getReflogPath, readReflog } from "../src/core/reflog.js";
import { rollbackFile } from "../src/core/rollback.js";
import { createSnapshot, resetSnapshot } from "../src/core/snapshot.js";

describe("reflog", () => {
  it("log create, reset, rollback, merge", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-reflog-"));
    await writeFile(path.join(targetPath, "note.txt"), "base\n", "utf8");

    const first = await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "v2\n", "utf8");
    await resetSnapshot(targetPath);
    await writeFile(path.join(targetPath, "note.txt"), "workspace\n", "utf8");
    await mergeTrackedFile(targetPath, "note.txt", "manual");
    await rollbackFile(targetPath, "note.txt");
    const reflog = await readReflog(first.storagePath);

    expect(reflog.map((entry) => entry.action)).toEqual(["create", "reset", "merge", "rollback"]);
    expect(reflog[0]?.toSnapshotId).toBe(first.activeSnapshotId);
  });

  it("tu dong trim reflog ve 1000 entries", async () => {
    const storagePath = await mkdtemp(path.join(tmpdir(), "ai-track-reflog-trim-"));

    for (let index = 0; index < 1005; index += 1) {
      await appendReflogEntry(storagePath, {
        action: "create",
        reason: `entry-${index}`,
      });
    }

    const reflog = await readReflog(storagePath);

    expect(reflog).toHaveLength(1000);
    expect(reflog[0]?.reason).toBe("entry-5");
    expect(reflog[reflog.length - 1]?.reason).toBe("entry-1004");
  });

  it("bao loi khi reflog bi hong", async () => {
    const storagePath = await mkdtemp(path.join(tmpdir(), "ai-track-reflog-bad-"));
    await writeFile(getReflogPath(storagePath), "{bad json\n", "utf8");

    await expect(readReflog(storagePath)).rejects.toThrow();
  });
});
