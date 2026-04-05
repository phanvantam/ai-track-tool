import { readFile } from "node:fs/promises";

import { applyPatchToWorkspace } from "../core/patch.js";

interface RunPatchImportCommandOptions {
  reverse?: boolean;
  threeWay?: boolean;
}

export async function runPatchImportCommand(
  targetPath: string,
  patchFilePath: string,
  options: RunPatchImportCommandOptions = {},
): Promise<void> {
  const patchText = await readFile(patchFilePath, "utf8");
  const result = await applyPatchToWorkspace(targetPath, patchText, options);

  process.stdout.write(`applied: ${result.appliedFiles.length}\n`);
  for (const filePath of result.appliedFiles) {
    process.stdout.write(`- ${filePath}\n`);
  }

  if (result.conflicts.length > 0) {
    process.stdout.write(`conflicts: ${result.conflicts.length}\n`);
    for (const filePath of result.conflicts) {
      process.stdout.write(`! ${filePath}\n`);
    }
  }
}
