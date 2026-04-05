import { access, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FilesystemConfig } from "../types.js";

export function normalizePathForComparison(filePath: string, config?: FilesystemConfig): string {
  return config?.caseInsensitive ? filePath.toLowerCase() : filePath;
}

export async function detectFilesystemConfig(targetPath: string): Promise<FilesystemConfig> {
  const testFile = path.join(targetPath, ".ai-track-case-test");
  const uppercaseFile = path.join(targetPath, ".AI-TRACK-CASE-TEST");

  await writeFile(testFile, "case-test\n", "utf8");

  try {
    await access(uppercaseFile);
    return {
      caseInsensitive: true,
      casePreserving: true,
    };
  } catch {
    return {
      caseInsensitive: false,
      casePreserving: true,
    };
  } finally {
    await rm(testFile, { force: true });
  }
}
