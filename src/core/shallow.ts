import { rm } from "node:fs/promises";
import path from "node:path";

import type { CurrentFileEntry, ShallowConfig, TrackState } from "../types.js";
import { readState, writeState } from "./state.js";

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(pattern: string): RegExp {
  const normalized = pattern.replaceAll("\\", "/").replace(/^\/+/, "");
  const regexBody = escapeRegex(normalized)
    .replace(/\\\*\\\*/g, ".*")
    .replace(/\\\*/g, "[^/]*");
  return new RegExp(`^${regexBody}(?:$|/)`);
}

export function matchesSparsePattern(relativePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return true;
  }

  return patterns.some((pattern) => globToRegex(pattern).test(relativePath));
}

export function filterSparseFiles(files: CurrentFileEntry[], shallowConfig?: ShallowConfig): CurrentFileEntry[] {
  if (!shallowConfig?.sparseCheckout || !shallowConfig.sparsePatterns || shallowConfig.sparsePatterns.length === 0) {
    return files;
  }

  return files.filter((file) => matchesSparsePattern(file.path, shallowConfig.sparsePatterns!));
}

export function getVisibleSnapshotHistory(state: TrackState): string[] {
  const history = state.snapshotHistory ?? [];

  if (!state.shallowConfig?.shallow || !state.shallowConfig.depth) {
    return history;
  }

  return history.slice(0, state.shallowConfig.depth);
}

export async function updateShallowConfig(targetPath: string, nextConfig: Partial<ShallowConfig>): Promise<TrackState> {
  const state = await readState(targetPath);
  const mergedConfig: ShallowConfig = {
    shallow: nextConfig.shallow ?? state.shallowConfig?.shallow ?? false,
    depth: nextConfig.depth ?? state.shallowConfig?.depth,
    sparseCheckout: nextConfig.sparseCheckout ?? state.shallowConfig?.sparseCheckout,
    sparsePatterns: nextConfig.sparsePatterns ?? state.shallowConfig?.sparsePatterns,
  };

  const nextState: TrackState = {
    ...state,
    shallowConfig: mergedConfig,
    updatedAt: new Date().toISOString(),
  };

  await writeState(nextState);
  return nextState;
}

export async function applySparsePatterns(targetPath: string, patterns: string[]): Promise<TrackState> {
  return updateShallowConfig(targetPath, {
    sparseCheckout: patterns.length > 0,
    sparsePatterns: patterns,
  });
}

export async function pruneVisibleHistory(targetPath: string): Promise<TrackState> {
  const state = await readState(targetPath);

  if (!state.shallowConfig?.shallow || !state.shallowConfig.depth || !state.snapshotHistory) {
    return state;
  }

  const visible = getVisibleSnapshotHistory(state);
  const hidden = state.snapshotHistory.slice(visible.length);

  const nextState: TrackState = {
    ...state,
    snapshotHistory: visible,
    previousSnapshotId: visible[1],
    updatedAt: new Date().toISOString(),
  };

  await writeState(nextState);

  // Không xóa snapshot vật lý vì delta/reference có thể còn phụ thuộc chuỗi cũ.
  // Chỉ dọn materialized cache của history đã ẩn.
  for (const snapshotId of hidden) {
    await rm(path.join(state.storagePath, "materialized", snapshotId), { recursive: true, force: true });
  }

  return nextState;
}

export async function fetchHistory(): Promise<void> {
  throw new Error("fetch-history chưa hỗ trợ vì chưa có remote snapshot store.");
}
