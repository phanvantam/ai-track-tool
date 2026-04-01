import blessed from "blessed";
import { setTimeout as delay } from "node:timers/promises";

import { getChanges } from "../core/compare.js";
import { renderChangeDiff } from "../core/diff.js";
import { rollbackFile } from "../core/rollback.js";
import { ensureSnapshot, normalizeTargetPath, resetSnapshot } from "../core/snapshot.js";
import { readState } from "../core/state.js";
import { createWatcher } from "../core/watch.js";
import type { ChangeEntry, ChangeType, WatchStatus } from "../types.js";

type FilterType = ChangeType | "all";

interface RunUiOptions {
  enableWatch?: boolean;
  autoCreateSnapshot?: boolean;
}

function applyFilter(changes: ChangeEntry[], filter: FilterType): ChangeEntry[] {
  if (filter === "all") {
    return changes;
  }

  return changes.filter((change) => change.type === filter);
}

export async function runUiCommand(targetPathInput: string, options: RunUiOptions = {}): Promise<void> {
  const targetPath = options.autoCreateSnapshot
    ? (await ensureSnapshot(targetPathInput)).targetPath
    : await normalizeTargetPath(targetPathInput);

  const screen = blessed.screen({ smartCSR: true, title: "ai-track" });
  const list = blessed.list({
    parent: screen,
    top: 0,
    left: 0,
    width: "35%",
    height: "100%-2",
    border: "line",
    keys: true,
    mouse: true,
    vi: true,
    style: {
      selected: { bg: "blue" },
    },
    label: " Changes ",
  });
  const detail = blessed.box({
    parent: screen,
    top: 0,
    left: "35%",
    width: "65%",
    height: "100%-2",
    border: "line",
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    mouse: true,
    tags: false,
    label: " Diff ",
  });
  const statusBar = blessed.box({
    parent: screen,
    bottom: 1,
    left: 0,
    width: "100%",
    height: 1,
    content: "",
  });
  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: "100%",
    height: 1,
    content: "q: thoát | 0/a/m/d: lọc | r: rollback | R: refresh | s: snapshot mới",
  });

  let allChanges: ChangeEntry[] = [];
  let currentFilter: FilterType = "all";
  let visibleChanges: ChangeEntry[] = [];
  let selectedPath: string | null = null;
  let message = "Sẵn sàng.";
  let watchStatus: WatchStatus = options.enableWatch ? "watching" : "idle";
  let activeSnapshotId = "unknown";
  let isReloading = false;

  function updateStatus(): void {
    statusBar.setContent(
      `Path: ${targetPath} | Snapshot: ${activeSnapshotId} | Changes: ${visibleChanges.length} | Watch: ${watchStatus} | ${message}`,
    );
  }

  async function renderSelected(): Promise<void> {
    const selectedChange = visibleChanges.find((change) => change.path === selectedPath) ?? visibleChanges[0];

    if (!selectedChange) {
      detail.setContent("Không có thay đổi.");
      screen.render();
      return;
    }

    selectedPath = selectedChange.path;
    const selectedIndex = visibleChanges.findIndex((change) => change.path === selectedChange.path);

    if (selectedIndex >= 0) {
      list.select(selectedIndex);
    }

    const diffText = await renderChangeDiff(selectedChange);
    detail.setContent(diffText);
    updateStatus();
    screen.render();
  }

  function refreshList(): void {
    visibleChanges = applyFilter(allChanges, currentFilter);
    list.setItems(visibleChanges.map((change) => `[${change.type}] ${change.path}`));

    if (!visibleChanges.some((change) => change.path === selectedPath)) {
      selectedPath = visibleChanges[0]?.path ?? null;
    }

    updateStatus();
  }

  async function reload(nextMessage?: string): Promise<void> {
    if (isReloading) {
      return;
    }

    isReloading = true;
    watchStatus = options.enableWatch ? "refreshing" : watchStatus;

    try {
      const state = await readState(targetPath);
      activeSnapshotId = state.activeSnapshotId;
      allChanges = await getChanges(targetPath);
      message = nextMessage ?? "Đã cập nhật thay đổi.";
      watchStatus = options.enableWatch ? "watching" : watchStatus;
      refreshList();
      await renderSelected();
    } catch (error) {
      watchStatus = "error";
      message = error instanceof Error ? error.message : "unknown";
      updateStatus();
      screen.render();
    } finally {
      isReloading = false;
    }
  }

  list.on("select", async (_, index) => {
    const change = visibleChanges[index];

    if (!change) {
      return;
    }

    selectedPath = change.path;
    await renderSelected();
  });

  const watcher = options.enableWatch
    ? createWatcher(targetPath, {
        onRefreshNeeded: async () => {
          await reload("Tự động cập nhật từ filesystem.");
        },
        onError: (error) => {
          watchStatus = "error";
          message = error.message;
          updateStatus();
          screen.render();
        },
      })
    : null;

  await reload("Đã tải danh sách thay đổi.");
  list.focus();
  screen.render();

  await new Promise<void>((resolve) => {
    let closed = false;

    function closeScreen(): void {
      if (closed) {
        return;
      }

      closed = true;
      watcher?.stop();
      screen.destroy();
      resolve();
    }

    screen.key(["q", "C-c"], () => {
      closeScreen();
    });

    screen.key(["0"], async () => {
      currentFilter = "all";
      refreshList();
      await renderSelected();
    });

    screen.key(["a"], async () => {
      currentFilter = "added";
      refreshList();
      await renderSelected();
    });

    screen.key(["m"], async () => {
      currentFilter = "modified";
      refreshList();
      await renderSelected();
    });

    screen.key(["d"], async () => {
      currentFilter = "deleted";
      refreshList();
      await renderSelected();
    });

    screen.key(["R"], async () => {
      await reload("Đã refresh thủ công.");
    });

    screen.key(["r"], async () => {
      const change = visibleChanges.find((item) => item.path === selectedPath);

      if (!change) {
        return;
      }

      await rollbackFile(targetPath, change.path);
      await reload(`Đã rollback ${change.path}`);
    });

    screen.key(["s"], async () => {
      const state = await resetSnapshot(targetPath);
      activeSnapshotId = state.activeSnapshotId;
      await reload("Đã tạo baseline mới.");
    });

    if (process.env.AI_TRACK_UI_SMOKE_TEST === "1") {
      const smokeDelayMs = Number(process.env.AI_TRACK_UI_SMOKE_TEST_MS ?? "150");
      void delay(smokeDelayMs).then(closeScreen);
    }
  });
}
