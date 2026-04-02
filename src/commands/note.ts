import { addSnapshotAnnotation, deleteSnapshotAnnotation, getSnapshotAnnotation, listSnapshotAnnotations } from "../core/snapshot-tags.js";
import { readState } from "../core/state.js";

interface RunNoteCommandOptions {
  action: "add" | "show" | "delete" | "list";
  snapshotId?: string;
  content?: string;
}

export async function runNoteCommand(targetPath: string, options: RunNoteCommandOptions): Promise<void> {
  const state = await readState(targetPath);

  if (options.action === "list") {
    const notes = await listSnapshotAnnotations(state.storagePath);

    if (notes.length === 0) {
      process.stdout.write("Không có note.\n");
      return;
    }

    for (const note of notes) {
      process.stdout.write(`${note.snapshotId} ${note.createdAt} ${note.content}\n`);
    }
    return;
  }

  const snapshotId = options.snapshotId ?? state.activeSnapshotId;

  if (options.action === "show") {
    const note = await getSnapshotAnnotation(state.storagePath, snapshotId);

    if (!note) {
      process.stdout.write("Không có note.\n");
      return;
    }

    process.stdout.write(`${note.content}\n`);
    return;
  }

  if (options.action === "add") {
    if (!options.content) {
      throw new Error("Thiếu nội dung note");
    }

    await addSnapshotAnnotation(state.storagePath, snapshotId, options.content, process.env.USER);
    process.stdout.write(`Đã lưu note cho ${snapshotId}\n`);
    return;
  }

  await deleteSnapshotAnnotation(state.storagePath, snapshotId, process.env.USER);
  process.stdout.write(`Đã xóa note cho ${snapshotId}\n`);
}
