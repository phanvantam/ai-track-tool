import { readFile } from "node:fs/promises";
import path from "node:path";

import ignore, { type Ignore } from "ignore";

import type { IgnoreValidationError } from "../types.js";

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

export function validateIgnoreRules(ignoreRules: string[]): IgnoreValidationError[] {
  const seenRules = new Set<string>();
  const errors: IgnoreValidationError[] = [];

  for (const [index, rawRule] of ignoreRules.entries()) {
    const rule = rawRule.trim();

    if (!rule || rule.startsWith("#")) {
      continue;
    }

    if (rule === "." || rule === "*" || rule === "**") {
      errors.push({
        line: index + 1,
        rule,
        error: "too_broad",
        message: "Pattern quá rộng, dễ bỏ qua toàn bộ project.",
        suggestion: "Dùng pattern cụ thể hơn, ví dụ dist/ hoặc *.log",
      });
      continue;
    }

    if (seenRules.has(rule)) {
      errors.push({
        line: index + 1,
        rule,
        error: "syntax_error",
        message: "Pattern bị lặp lại.",
        suggestion: "Xóa rule trùng.",
      });
      continue;
    }

    if ((rule.match(/\[/g) ?? []).length !== (rule.match(/\]/g) ?? []).length) {
      errors.push({
        line: index + 1,
        rule,
        error: "invalid_regex",
        message: "Pattern có dấu ngoặc vuông không cân bằng.",
        suggestion: `${rule}]`,
      });
      continue;
    }

    try {
      ignore().add(rule);
    } catch (error) {
      errors.push({
        line: index + 1,
        rule,
        error: "invalid_regex",
        message: error instanceof Error ? error.message : "Pattern không hợp lệ.",
        suggestion: rule.includes("[") && !rule.includes("]") ? `${rule}]` : undefined,
      });
      continue;
    }

    seenRules.add(rule);
  }

  return errors;
}

export function testIgnoreRules(ignoreRules: string[], samples: string[]): Array<{ sample: string; ignored: boolean }> {
  const matcher = createIgnoreMatcher(ignoreRules);
  return samples.map((sample) => ({
    sample,
    ignored: matcher.ignores(sample),
  }));
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
