import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runWatchCommand } from "../src/commands/watch.js";
import { getChanges } from "../src/core/compare.js";
import { ensureSnapshot, resetSnapshot } from "../src/core/snapshot.js";
import { hasState, readState, readStateIfExists } from "../src/core/state.js";
import { createDebouncedTrigger } from "../src/core/watch.js";

describe("watch helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.AI_TRACK_UI_SMOKE_TEST;
    delete process.env.AI_TRACK_UI_SMOKE_TEST_MS;
  });

  it("kiem tra state hien co", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-state-"));

    expect(await hasState(targetPath)).toBe(false);
    expect(await readStateIfExists(targetPath)).toBeNull();

    await writeFile(path.join(targetPath, "base.txt"), "base\n", "utf8");
    await ensureSnapshot(targetPath);

    expect(await hasState(targetPath)).toBe(true);
    expect(await readStateIfExists(targetPath)).not.toBeNull();
  });

  it("debounce gom nhieu trigger", async () => {
    const callback = vi.fn();
    const debounced = createDebouncedTrigger(callback, 100);

    debounced.trigger();
    debounced.trigger();
    debounced.trigger();

    await vi.advanceTimersByTimeAsync(99);
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("reset snapshot xoa trang thai diff hien tai", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-reset-"));
    await writeFile(path.join(targetPath, "note.txt"), "old\n", "utf8");
    const firstState = await ensureSnapshot(targetPath);

    await writeFile(path.join(targetPath, "note.txt"), "new\n", "utf8");
    expect(await getChanges(targetPath)).toHaveLength(1);

    const secondState = await resetSnapshot(targetPath);

    expect(secondState.activeSnapshotId).not.toBe(firstState.activeSnapshotId);
    expect(await getChanges(targetPath)).toHaveLength(0);
  });

  it("watch tu tao snapshot khi chua co state", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-watch-"));
    await writeFile(path.join(targetPath, "base.txt"), "base\n", "utf8");
    process.env.AI_TRACK_UI_SMOKE_TEST = "1";
    process.env.AI_TRACK_UI_SMOKE_TEST_MS = "50";

    const watchPromise = runWatchCommand(targetPath);
    await vi.advanceTimersByTimeAsync(75);
    await watchPromise;

    const state = await readState(targetPath);
    const copied = await readFile(path.join(targetPath, ".ai-track", "snapshots", state.activeSnapshotId, "files", "base.txt"), "utf8");

    expect(copied).toBe("base\n");
  });
});
