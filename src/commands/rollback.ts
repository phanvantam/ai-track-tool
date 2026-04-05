import type { MergeStrategy } from "../types.js";
import { rollbackFileWithStrategy } from "../core/rollback.js";

export async function runRollbackCommand(targetPath: string, relativePath: string, strategy: MergeStrategy = "theirs"): Promise<void> {
  const result = await rollbackFileWithStrategy(targetPath, relativePath, strategy);
  process.stdout.write(`${relativePath}: ${result}\n`);
}
