import { applyStash, clearStashes, createStash, dropStash, getStash, listStashes } from "../core/stash.js";

interface RunStashCommandOptions {
  action: "save" | "apply" | "pop" | "list" | "show" | "drop" | "clear";
  message?: string;
  stashId?: string;
}

export async function runStashCommand(targetPath: string, options: RunStashCommandOptions): Promise<void> {
  if (options.action === "save") {
    const stash = await createStash(targetPath, options.message);
    process.stdout.write(`Đã lưu stash ${stash.stashId}\n`);
    return;
  }

  if (options.action === "list") {
    const stashes = await listStashes(targetPath);

    if (stashes.length === 0) {
      process.stdout.write("Không có stash.\n");
      return;
    }

    for (const stash of stashes) {
      process.stdout.write(`${stash.stashId} ${stash.createdAt} ${stash.message}\n`);
    }
    return;
  }

  if (options.action === "show") {
    const stash = await getStash(targetPath, options.stashId);

    if (!stash) {
      process.stdout.write("Không có stash.\n");
      return;
    }

    process.stdout.write(`${stash.patch}\n`);
    return;
  }

  if (options.action === "apply" || options.action === "pop") {
    const result = await applyStash(targetPath, options.stashId, options.action === "pop");
    process.stdout.write(`applied: ${result.appliedFiles.length}\n`);
    process.stdout.write(`conflicts: ${result.conflicts.length}\n`);
    process.stdout.write(`removed: ${result.removed}\n`);
    return;
  }

  if (options.action === "drop") {
    await dropStash(targetPath, options.stashId);
    process.stdout.write("Đã xóa stash.\n");
    return;
  }

  await clearStashes(targetPath);
  process.stdout.write("Đã xóa toàn bộ stash.\n");
}
