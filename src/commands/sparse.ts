import { applySparsePatterns } from "../core/shallow.js";
import { readState } from "../core/state.js";

interface RunSparseCommandOptions {
  action: "config" | "add" | "remove" | "reset";
  pattern?: string;
}

export async function runSparseCommand(targetPath: string, options: RunSparseCommandOptions): Promise<void> {
  const state = await readState(targetPath);
  const currentPatterns = state.shallowConfig?.sparsePatterns ?? [];

  if (options.action === "config") {
    process.stdout.write(`${JSON.stringify(currentPatterns, null, 2)}\n`);
    return;
  }

  if (options.action === "add") {
    if (!options.pattern) {
      throw new Error("Thiếu pattern");
    }

    const nextPatterns = [...new Set([...currentPatterns, options.pattern])];
    await applySparsePatterns(targetPath, nextPatterns);
    process.stdout.write(`Đã thêm sparse pattern ${options.pattern}\n`);
    return;
  }

  if (options.action === "remove") {
    if (!options.pattern) {
      throw new Error("Thiếu pattern");
    }

    await applySparsePatterns(targetPath, currentPatterns.filter((pattern) => pattern !== options.pattern));
    process.stdout.write(`Đã xóa sparse pattern ${options.pattern}\n`);
    return;
  }

  await applySparsePatterns(targetPath, []);
  process.stdout.write("Đã reset sparse patterns.\n");
}
