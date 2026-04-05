import { getChanges } from "../core/compare.js";
import { renderDiffReport } from "../core/diff.js";

export async function runDiffCommand(targetPath: string): Promise<void> {
  const changes = await getChanges(targetPath);
  const report = await renderDiffReport(changes);
  process.stdout.write(`${report}\n`);
}
