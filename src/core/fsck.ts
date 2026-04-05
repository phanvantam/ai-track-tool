import { readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { FSCKReport, FsckError, SnapshotManifest } from "../types.js";
import { getDeltaRoot, readSnapshotFileBuffer } from "./delta.js";
import { hashBuffer } from "./snapshot.js";
import { getSnapshotRoot, readState, writeManifest } from "./state.js";

interface FsckOptions {
  repair?: boolean;
}

function createReport(errors: FsckError[], repairs: string[]): FSCKReport {
  const isHealthy = errors.every((error) => error.severity !== "critical" || error.repaired);

  return {
    isHealthy,
    errors,
    repairs,
    timestamp: new Date().toISOString(),
  };
}

function isSnapshotManifest(value: unknown): value is SnapshotManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<SnapshotManifest>;
  return (
    typeof manifest.snapshotId === "string" &&
    typeof manifest.createdAt === "string" &&
    typeof manifest.targetPath === "string" &&
    Array.isArray(manifest.ignoreRules) &&
    Array.isArray(manifest.files)
  );
}

async function listFilesRecursive(rootPath: string, currentPath = rootPath): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(rootPath, absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(rootPath, absolutePath).replaceAll(path.sep, "/"));
    }
  }

  return files;
}

async function readManifestSafely(manifestPath: string): Promise<SnapshotManifest | null> {
  try {
    const content = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    return isSnapshotManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function runFsck(targetPathInput: string, options: FsckOptions = {}): Promise<FSCKReport> {
  const state = await readState(targetPathInput);
  const snapshotRoot = getSnapshotRoot(state.storagePath, state.activeSnapshotId);
  const manifestPath = path.join(snapshotRoot, "manifest.json");
  const snapshotFilesRoot = path.join(snapshotRoot, "files");
  const repairs: string[] = [];
  const errors: FsckError[] = [];
  const manifest = await readManifestSafely(manifestPath);

  if (!manifest) {
    errors.push({
      type: "corrupt_manifest",
      severity: "critical",
      fixable: false,
    });
    return createReport(errors, repairs);
  }

  const deltaRoot = path.join(getDeltaRoot(state.storagePath), manifest.snapshotId);

  const manifestFiles = [...manifest.files];

  for (const snapshotFile of manifest.files) {
    const snapshotFilePath = path.join(snapshotFilesRoot, snapshotFile.path);

    try {
      if (snapshotFile.storageKind && snapshotFile.storageKind !== "full") {
        const content = await readSnapshotFileBuffer(state.storagePath, manifest.snapshotId, snapshotFile.path);

        if (content.length !== snapshotFile.size) {
          errors.push({
            type: "size_mismatch",
            path: snapshotFile.path,
            expected: String(snapshotFile.size),
            actual: String(content.length),
            severity: "critical",
            fixable: false,
          });
        }

        const actualHash = hashBuffer(content);

        if (actualHash !== snapshotFile.hash) {
          errors.push({
            type: "hash_mismatch",
            path: snapshotFile.path,
            expected: snapshotFile.hash,
            actual: actualHash,
            severity: "critical",
            fixable: false,
          });
        }

        continue;
      }

      const fileStats = await stat(snapshotFilePath);

      if (fileStats.size !== snapshotFile.size) {
        errors.push({
          type: "size_mismatch",
          path: snapshotFile.path,
          expected: String(snapshotFile.size),
          actual: String(fileStats.size),
          severity: "critical",
          fixable: false,
        });
      }

      const content = await readFile(snapshotFilePath);
      const actualHash = hashBuffer(content);

      if (actualHash !== snapshotFile.hash) {
        errors.push({
          type: "hash_mismatch",
          path: snapshotFile.path,
          expected: snapshotFile.hash,
          actual: actualHash,
          severity: "critical",
          fixable: false,
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }

      const missingFileError: FsckError = {
        type: "missing_file",
        path: snapshotFile.path,
        severity: "critical",
        fixable: true,
      };

      if (options.repair) {
        const nextManifestFiles = manifestFiles.filter((entry) => entry.path !== snapshotFile.path);
        manifestFiles.length = 0;
        manifestFiles.push(...nextManifestFiles);
        missingFileError.repaired = true;
        repairs.push(`Đã xóa manifest entry bị thiếu: ${snapshotFile.path}`);
      }

      errors.push(missingFileError);
    }
  }

  try {
    const actualFiles = await listFilesRecursive(snapshotFilesRoot);
    const manifestPaths = new Set(manifestFiles.filter((file) => !file.storageKind || file.storageKind === "full").map((file) => file.path));

    for (const actualFile of actualFiles) {
      if (manifestPaths.has(actualFile)) {
        continue;
      }

      const orphanFileError: FsckError = {
        type: "orphan_file",
        path: actualFile,
        severity: "warning",
        fixable: true,
      };

      if (options.repair) {
        await rm(path.join(snapshotFilesRoot, actualFile), { force: true });
        orphanFileError.repaired = true;
        repairs.push(`Đã xóa orphan file: ${actualFile}`);
      }

      errors.push(orphanFileError);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  try {
    const actualDeltaFiles = await listFilesRecursive(deltaRoot);
    const manifestDeltaPaths = new Set(
      manifestFiles
        .filter((file) => file.storageKind === "delta" && file.deltaPath)
        .map((file) => path.relative(deltaRoot, path.join(state.storagePath, file.deltaPath!)).replaceAll(path.sep, "/")),
    );

    for (const actualDeltaFile of actualDeltaFiles) {
      if (manifestDeltaPaths.has(actualDeltaFile)) {
        continue;
      }

      const orphanFileError: FsckError = {
        type: "orphan_file",
        path: `deltas/${actualDeltaFile}`,
        severity: "warning",
        fixable: true,
      };

      if (options.repair) {
        await rm(path.join(deltaRoot, actualDeltaFile), { force: true });
        orphanFileError.repaired = true;
        repairs.push(`Đã xóa orphan delta file: ${actualDeltaFile}`);
      }

      errors.push(orphanFileError);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  if (options.repair && repairs.length > 0) {
    await writeManifest(state.storagePath, {
      ...manifest,
      files: manifestFiles,
      metadata: manifest.metadata
        ? {
            ...manifest.metadata,
            filesMetadata: Object.fromEntries(
              Object.entries(manifest.metadata.filesMetadata).filter(([filePath]) => manifestFiles.some((file) => file.path === filePath)),
            ),
          }
        : undefined,
    });
  }

  if (repairs.length === 0 && errors.some((error) => error.type === "orphan_file" || error.type === "missing_file")) {
    repairs.push("Có thể chạy `ai-track fsck --repair` để dọn orphan file và manifest entry bị thiếu.");
  }

  return createReport(errors, repairs);
}
