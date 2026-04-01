import { watch } from "node:fs";

import type { WatchController } from "../types.js";

export interface WatchOptions {
  debounceMs?: number;
  fallbackIntervalMs?: number;
  onRefreshNeeded: () => void | Promise<void>;
  onError?: (error: Error) => void;
}

export function createDebouncedTrigger(callback: () => void | Promise<void>, delayMs: number): {
  trigger: () => void;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;

  return {
    trigger: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        void callback();
      }, delayMs);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

export function createWatcher(targetPath: string, options: WatchOptions): WatchController {
  const debouncedRefresh = createDebouncedTrigger(options.onRefreshNeeded, options.debounceMs ?? 150);
  const watcher = watch(targetPath, { recursive: true }, () => {
    debouncedRefresh.trigger();
  });
  const fallbackTimer = setInterval(() => {
    debouncedRefresh.trigger();
  }, options.fallbackIntervalMs ?? 2000);

  watcher.on("error", (error) => {
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
  });

  return {
    stop: () => {
      debouncedRefresh.cancel();
      clearInterval(fallbackTimer);
      watcher.close();
    },
  };
}
