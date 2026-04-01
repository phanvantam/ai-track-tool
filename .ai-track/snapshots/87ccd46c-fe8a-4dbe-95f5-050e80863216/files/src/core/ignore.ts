export const DEFAULT_IGNORE_RULES = ["node_modules", "dist", ".git", ".ai-track"];

export function shouldIgnorePath(relativePath: string, ignoreRules: string[] = DEFAULT_IGNORE_RULES): boolean {
  if (!relativePath) {
    return false;
  }

  const segments = relativePath.split("/").filter(Boolean);
  return segments.some((segment) => ignoreRules.includes(segment));
}
