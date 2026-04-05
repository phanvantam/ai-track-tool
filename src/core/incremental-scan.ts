import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CurrentFileEntry, FileMetadata, MetadataCache } from "../types.js";
import { detectBinaryContentInfo } from "./binary-detector.js";
import { createIgnoreMatcher, DEFAULT_IGNORE_RULES, readNestedGitIgnoreRules } from "./ignore.js";
import { isCircularSymlink, readSymlinkInfo } from "./symlink.js";
import { atomicWriteFile } from "./transaction.js";
import ignore, { type Ignore } from "ignore";

export const METADATA_CACHE_VERSION = 1;

const METADATA_CACHE_FILE = "metadata-cache.json";

function hashBuffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function detectBinaryContent(content: Buffer): boolean {
  return detectBinaryContentInfo("unknown", content).isBinary;
}

function toOptionalNumber(value: number | bigint | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function toNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function toFileMetadata(file: CurrentFileEntry): FileMetadata {
  return {
    path: file.path,
    hash: file.hash,
    size: file.size,
    mtimeMs: file.mtimeMs,
    isBinary: file.isBinary,
    binaryType: file.binaryType,
    symlink: file.symlink,
    inode: file.inode,
    uid: file.uid,
    gid: file.gid,
    mode: file.mode,
  };
}

function normalizeFileMetadata(filePath: string, stats: Awaited<ReturnType<typeof stat>>): Omit<FileMetadata, "hash" | "isBinary"> {
  const uid = toOptionalNumber(stats.uid);
  const gid = toOptionalNumber(stats.gid);

  return {
    path: filePath,
    size: toNumber(stats.size),
    mtimeMs: toNumber(stats.mtimeMs),
    inode: toOptionalNumber(stats.ino),
    uid,
    gid,
    mode: toOptionalNumber(stats.mode),
  };
}

function isValidMetadataCache(cache: unknown): cache is MetadataCache {
  if (!cache || typeof cache !== "object") {
    return false;
  }

  const candidate = cache as Partial<MetadataCache>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.targetPath === "string" &&
    typeof candidate.scannedAt === "string" &&
    typeof candidate.osType === "string" &&
    candidate.files !== null &&
    typeof candidate.files === "object"
  );
}

function isSameMetadata(current: Omit<FileMetadata, "hash" | "isBinary">, previous: FileMetadata): boolean {
  return (
    current.size === previous.size &&
    current.mtimeMs === previous.mtimeMs &&
    current.inode === previous.inode &&
    current.uid === previous.uid &&
    current.gid === previous.gid &&
    current.mode === previous.mode
  );
}

export function getModifiedFiles(
  previousCache: MetadataCache | null,
  currentFiles: Array<Omit<FileMetadata, "hash" | "isBinary">>,
): string[] {
  if (!previousCache) {
    return currentFiles.map((file) => file.path);
  }

  return currentFiles
    .filter((file) => {
      const previousMetadata = previousCache.files[file.path];
      return !previousMetadata || !isSameMetadata(file, previousMetadata);
    })
    .map((file) => file.path);
}

/**
 * Tạo bản sao ignore matcher mới dựa trên rules hiện tại + rules bổ sung.
 * Cần thiết vì thư viện `ignore` không hỗ trợ clone.
 */
function extendIgnoreMatcher(existingRules: string[], additionalRules: string[]): { matcher: Ignore; rules: string[] } {
  const merged = [...existingRules, ...additionalRules];
  return { matcher: ignore().add(merged), rules: merged };
}

async function collectFilesRecursive(
  targetPath: string,
  currentPath: string,
  ignoreMatcher: Ignore,
  /** Rules hiện tại dùng để tạo bản sao khi gặp .gitignore con */
  currentRules: string[],
  previousFiles: Map<string, FileMetadata>,
): Promise<CurrentFileEntry[]> {
  const directoryEntries = await readdir(currentPath, { withFileTypes: true });
  const files: CurrentFileEntry[] = [];

  for (const entry of directoryEntries) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(targetPath, absolutePath).replaceAll(path.sep, "/");

    if (ignoreMatcher.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      try {
        // Đọc .gitignore con trong thư mục con (nếu có)
        const nestedRules = await readNestedGitIgnoreRules(absolutePath, relativePath);
        let childMatcher = ignoreMatcher;
        let childRules = currentRules;

        if (nestedRules.length > 0) {
          const extended = extendIgnoreMatcher(currentRules, nestedRules);
          childMatcher = extended.matcher;
          childRules = extended.rules;
        }

        files.push(...(await collectFilesRecursive(targetPath, absolutePath, childMatcher, childRules, previousFiles)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
      continue;
    }

    if (entry.isSymbolicLink()) {
      try {
        const fileStats = await lstat(absolutePath);
        const normalizedMetadata = normalizeFileMetadata(relativePath, fileStats);
        const previousMetadata = previousFiles.get(relativePath);

        if (previousMetadata && isSameMetadata(normalizedMetadata, previousMetadata)) {
          files.push({
            ...normalizedMetadata,
            absolutePath,
            hash: previousMetadata.hash,
            isBinary: false,
            symlink: previousMetadata.symlink,
            needsHashCheck: false,
          });
          continue;
        }

        const circular = await isCircularSymlink(absolutePath).catch(() => false);
        const symlinkInfo = await readSymlinkInfo(absolutePath, relativePath);
        files.push({
          ...normalizedMetadata,
          absolutePath,
          hash: symlinkInfo.hash,
          size: Buffer.byteLength(symlinkInfo.target, "utf8"),
          isBinary: false,
          symlink: circular ? { ...symlinkInfo, target: `${symlinkInfo.target} [circular]` } : symlinkInfo,
          needsHashCheck: true,
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    try {
      const fileStats = await stat(absolutePath);
      const normalizedMetadata = normalizeFileMetadata(relativePath, fileStats);
      const previousMetadata = previousFiles.get(relativePath);

      if (previousMetadata && isSameMetadata(normalizedMetadata, previousMetadata)) {
        files.push({
          ...normalizedMetadata,
          absolutePath,
          hash: previousMetadata.hash,
          isBinary: previousMetadata.isBinary,
          binaryType: previousMetadata.binaryType,
          symlink: previousMetadata.symlink,
          needsHashCheck: false,
        });
        continue;
      }

      const content = await readFile(absolutePath);
      const binaryInfo = detectBinaryContentInfo(relativePath, content);
        files.push({
          ...normalizedMetadata,
          absolutePath,
          hash: hashBuffer(content),
          isBinary: binaryInfo.isBinary,
          binaryType: binaryInfo.type,
          symlink: undefined,
          needsHashCheck: true,
          content,
        });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return files;
}

export function getMetadataCachePath(storagePath: string): string {
  return path.join(storagePath, METADATA_CACHE_FILE);
}

export function createMetadataCache(targetPath: string, files: CurrentFileEntry[]): MetadataCache {
  return {
    version: METADATA_CACHE_VERSION,
    targetPath,
    scannedAt: new Date().toISOString(),
    osType: process.platform,
    files: Object.fromEntries(files.map((file) => [file.path, toFileMetadata(file)])),
  };
}

export async function readMetadataCache(storagePath: string): Promise<MetadataCache | null> {
  try {
    const content = await readFile(getMetadataCachePath(storagePath), "utf8");
    const parsed = JSON.parse(content) as unknown;
    return isValidMetadataCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeMetadataCache(storagePath: string, cache: MetadataCache): Promise<void> {
  const cachePath = getMetadataCachePath(storagePath);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await atomicWriteFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

export async function scanCurrentFilesWithCache(
  targetPath: string,
  previousCache: MetadataCache | null,
  ignoreRules: string[] = DEFAULT_IGNORE_RULES,
): Promise<CurrentFileEntry[]> {
  const previousFiles = previousCache ? new Map(Object.entries(previousCache.files)) : new Map<string, FileMetadata>();
  return collectFilesRecursive(targetPath, targetPath, createIgnoreMatcher(ignoreRules), ignoreRules, previousFiles);
}
