import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SnapshotAnnotation, SnapshotTag } from "../types.js";
import { appendReflogEntry } from "./reflog.js";
import { readManifest } from "./state.js";
import { atomicWriteFile } from "./transaction.js";

function getTagsPath(storagePath: string): string {
  return path.join(storagePath, ".tags.json");
}

function getNotesPath(storagePath: string): string {
  return path.join(storagePath, ".notes.json");
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return fallback;
  }
}

async function writeJsonFile(filePath: string, content: unknown): Promise<void> {
  await atomicWriteFile(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

export async function listSnapshotTags(storagePath: string): Promise<SnapshotTag[]> {
  return readJsonFile(getTagsPath(storagePath), [] as SnapshotTag[]);
}

export async function createSnapshotTag(storagePath: string, snapshotId: string, tagName: string, author?: string): Promise<SnapshotTag> {
  await readManifest(storagePath, snapshotId);
  const tags = await listSnapshotTags(storagePath);

  if (tags.some((tag) => tag.name === tagName)) {
    throw new Error(`Tag đã tồn tại: ${tagName}`);
  }

  const tag: SnapshotTag = {
    name: tagName,
    snapshotId,
    createdAt: new Date().toISOString(),
    author,
  };

  await writeJsonFile(getTagsPath(storagePath), [...tags, tag]);
  await appendReflogEntry(storagePath, {
    action: "tag",
    toSnapshotId: snapshotId,
    author,
    reason: `create tag ${tagName}`,
    metadata: { tag: tagName },
  });
  return tag;
}

export async function deleteSnapshotTag(storagePath: string, tagName: string, author?: string): Promise<void> {
  const tags = await listSnapshotTags(storagePath);
  const deletedTag = tags.find((tag) => tag.name === tagName);
  const nextTags = tags.filter((tag) => tag.name !== tagName);

  if (nextTags.length === tags.length) {
    throw new Error(`Không tìm thấy tag: ${tagName}`);
  }

  await writeJsonFile(getTagsPath(storagePath), nextTags);
  await appendReflogEntry(storagePath, {
    action: "tag",
    fromSnapshotId: deletedTag?.snapshotId,
    author,
    reason: `delete tag ${tagName}`,
    metadata: { tag: tagName },
  });
}

export async function resolveTagToSnapshot(storagePath: string, tagName: string): Promise<string | null> {
  const tags = await listSnapshotTags(storagePath);
  return tags.find((tag) => tag.name === tagName)?.snapshotId ?? null;
}

export async function listSnapshotAnnotations(storagePath: string): Promise<SnapshotAnnotation[]> {
  return readJsonFile(getNotesPath(storagePath), [] as SnapshotAnnotation[]);
}

export async function addSnapshotAnnotation(
  storagePath: string,
  snapshotId: string,
  content: string,
  author?: string,
): Promise<SnapshotAnnotation> {
  await readManifest(storagePath, snapshotId);
  const notes = await listSnapshotAnnotations(storagePath);
  const nextAnnotation: SnapshotAnnotation = {
    snapshotId,
    content,
    createdAt: new Date().toISOString(),
    author,
  };
  const nextNotes = [...notes.filter((note) => note.snapshotId !== snapshotId), nextAnnotation];

  await writeJsonFile(getNotesPath(storagePath), nextNotes);
  await appendReflogEntry(storagePath, {
    action: "note",
    toSnapshotId: snapshotId,
    author,
    reason: `add note ${snapshotId}`,
  });
  return nextAnnotation;
}

export async function getSnapshotAnnotation(storagePath: string, snapshotId: string): Promise<SnapshotAnnotation | null> {
  const notes = await listSnapshotAnnotations(storagePath);
  return notes.find((note) => note.snapshotId === snapshotId) ?? null;
}

export async function deleteSnapshotAnnotation(storagePath: string, snapshotId: string, author?: string): Promise<void> {
  const notes = await listSnapshotAnnotations(storagePath);
  const nextNotes = notes.filter((note) => note.snapshotId !== snapshotId);

  if (nextNotes.length === notes.length) {
    throw new Error(`Không tìm thấy note cho snapshot: ${snapshotId}`);
  }

  await writeJsonFile(getNotesPath(storagePath), nextNotes);
  await appendReflogEntry(storagePath, {
    action: "note",
    toSnapshotId: snapshotId,
    author,
    reason: `delete note ${snapshotId}`,
  });
}
