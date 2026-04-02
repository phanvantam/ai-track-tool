import { runGarbageCollection } from "../core/gc.js";

interface RunGcCommandOptions {
  dryRun?: boolean;
}

export async function runGcCommand(targetPath: string, options: RunGcCommandOptions = {}): Promise<void> {
  const report = await runGarbageCollection(targetPath, options);

  process.stdout.write(`gc: ${report.dryRun ? "dry-run" : "done"}\n`);

  if (report.actions.length === 0) {
    process.stdout.write("Không có gì để dọn.\n");
    return;
  }

  for (const action of report.actions) {
    process.stdout.write(`- ${action.type}: ${action.details}\n`);
  }
}
