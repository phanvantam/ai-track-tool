import { readFile } from "node:fs/promises";
import path from "node:path";

import ignore, { type Ignore } from "ignore";

export const DEFAULT_IGNORE_RULES = ["node_modules", "vendor", "dist", ".git", ".ai-track"];

export async function loadIgnoreRules(targetPath: string): Promise<string[]> {
  const gitIgnoreRules = await readGitIgnoreRules(targetPath);
  return [...DEFAULT_IGNORE_RULES, ...gitIgnoreRules];
}

export function createIgnoreMatcher(ignoreRules: string[]): Ignore {
  return ignore().add(
    ignoreRules.flatMap((rule) => {
      const normalizedRule = rule.trim();

      if (!normalizedRule || normalizedRule.startsWith("#")) {
        return [];
      }

      return [normalizedRule];
    }),
  );
}

export function shouldIgnorePath(relativePath: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): boolean {
  if (!relativePath) {
    return false;
  }

  return createIgnoreMatcher(ignoreRules).ignores(relativePath);
}

async function readGitIgnoreRules(targetPath: string): Promise<string[]> {
  try {
    const gitIgnorePath = path.join(targetPath, ".gitignore");
    const content = await readFile(gitIgnorePath, "utf8");
    return content.split(/\r?\n/);
  } catch {
    return [];
  }
}
