import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ReflogAction, ReflogEntry } from "../types.js";
import { atomicWriteFile } from "./transaction.js";

const DEFAULT_REFLOG_LIMIT = 1000;

interface AppendReflogEntryInput {
  action: ReflogAction;
  fromSnapshotId?: string;
  toSnapshotId?: string;
  reason?: string;
  author?: string;
  filesAffected?: number;
  metadata?: Record<string, string>;
}

interface ReadReflogOptions {
  limit?: number;
  action?: ReflogAction;
}

export function getReflogPath(storagePath: string): string {
  return path.join(storagePath, ".reflog.jsonl");
}

export async function appendReflogEntry(storagePath: string, entry: AppendReflogEntryInput): Promise<ReflogEntry> {
  const nextEntry: ReflogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  await appendFile(getReflogPath(storagePath), `${JSON.stringify(nextEntry)}\n`, "utf8");

  const entries = await readReflog(storagePath);

  if (entries.length > DEFAULT_REFLOG_LIMIT) {
    await cleanupReflog(storagePath, DEFAULT_REFLOG_LIMIT);
  }

  return nextEntry;
}

export async function readReflog(storagePath: string, options: ReadReflogOptions = {}): Promise<ReflogEntry[]> {
  try {
    const content = await readFile(getReflogPath(storagePath), "utf8");
    const entries = content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ReflogEntry);

    const filtered = options.action ? entries.filter((entry) => entry.action === options.action) : entries;

    if (!options.limit || filtered.length <= options.limit) {
      return filtered;
    }

    return filtered.slice(-options.limit);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return [];
  }
}

export async function cleanupReflog(storagePath: string, maxEntries = DEFAULT_REFLOG_LIMIT): Promise<void> {
  const entries = await readReflog(storagePath);

  if (entries.length <= maxEntries) {
    return;
  }

  const trimmed = entries.slice(-maxEntries);
  await atomicWriteFile(getReflogPath(storagePath), `${trimmed.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
}

export async function getReflogStats(storagePath: string): Promise<{
  totalEntries: number;
  actionCounts: Record<string, number>;
  oldestEntry?: ReflogEntry;
  newestEntry?: ReflogEntry;
}> {
  const entries = await readReflog(storagePath);
  const actionCounts = entries.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.action] = (accumulator[entry.action] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    totalEntries: entries.length,
    actionCounts,
    oldestEntry: entries[0],
    newestEntry: entries.at(-1),
  };
}
