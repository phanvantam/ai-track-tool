import type { MergeStrategy } from "../types.js";
import { mergeTrackedFile } from "../core/merge.js";

export async function runMergeCommand(targetPath: string, relativePath: string, strategy: MergeStrategy = "manual"): Promise<void> {
  const result = await mergeTrackedFile(targetPath, relativePath, strategy);
  process.stdout.write(`merge: ${result.status}\n`);

  if (result.resolution) {
    process.stdout.write(`${result.resolution}\n`);
  }

  for (const conflict of result.conflicts) {
    process.stdout.write(`- ${conflict.type}: ${conflict.path}\n`);
  }
}
