import { createHash } from "node:crypto";
import { lstat, mkdir, readlink, rm, symlink as createSymlink } from "node:fs/promises";
import path from "node:path";

import type { SymlinkInfo } from "../types.js";

function hashTarget(target: string): string {
  return createHash("sha256").update(target).digest("hex");
}

export async function readSymlinkInfo(absolutePath: string, relativePath: string): Promise<SymlinkInfo> {
  const target = await readlink(absolutePath);
  return {
    filePath: relativePath,
    target,
    hash: hashTarget(target),
    isAbsolute: path.isAbsolute(target),
  };
}

export async function isCircularSymlink(absolutePath: string): Promise<boolean> {
  const visited = new Set<string>();
  let currentPath = absolutePath;

  for (let depth = 0; depth < 64; depth += 1) {
    if (visited.has(currentPath)) {
      return true;
    }

    visited.add(currentPath);

    const stats = await lstat(currentPath);
    if (!stats.isSymbolicLink()) {
      return false;
    }

    const target = await readlink(currentPath);
    currentPath = path.resolve(path.dirname(currentPath), target);
  }

  return true;
}

export async function restoreSymlink(targetPath: string, relativePath: string, info: SymlinkInfo): Promise<void> {
  const livePath = path.resolve(targetPath, relativePath);
  await mkdir(path.dirname(livePath), { recursive: true });
  await rm(livePath, { recursive: true, force: true });
  await createSymlink(info.target, livePath);
}
