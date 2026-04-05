import { createSnapshotTag, deleteSnapshotTag, listSnapshotTags } from "../core/snapshot-tags.js";
import { readState } from "../core/state.js";

interface RunTagCommandOptions {
  action: "create" | "delete" | "list";
  tagName?: string;
  snapshotId?: string;
}

export async function runTagCommand(targetPath: string, options: RunTagCommandOptions): Promise<void> {
  const state = await readState(targetPath);

  if (options.action === "list") {
    const tags = await listSnapshotTags(state.storagePath);

    if (tags.length === 0) {
      process.stdout.write("Không có tag.\n");
      return;
    }

    for (const tag of tags) {
      process.stdout.write(`${tag.name} ${tag.snapshotId} ${tag.createdAt}\n`);
    }
    return;
  }

  if (!options.tagName) {
    throw new Error("Thiếu tagName");
  }

  if (options.action === "create") {
    const tag = await createSnapshotTag(state.storagePath, options.snapshotId ?? state.activeSnapshotId, options.tagName, process.env.USER);
    process.stdout.write(`Đã tạo tag ${tag.name} -> ${tag.snapshotId}\n`);
    return;
  }

  await deleteSnapshotTag(state.storagePath, options.tagName, process.env.USER);
  process.stdout.write(`Đã xóa tag ${options.tagName}\n`);
}
