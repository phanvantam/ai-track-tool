import { rollbackFile } from "../core/rollback.js";

export async function runRollbackCommand(targetPath: string, relativePath: string): Promise<void> {
  const result = await rollbackFile(targetPath, relativePath);
  process.stdout.write(`${relativePath}: ${result}\n`);
}
