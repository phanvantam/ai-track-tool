import { readFile } from "node:fs/promises";
import { createPatch } from "diff";

import { applySelectedHunks } from "../core/hunk-applicator.js";
import { parsePatchHunks } from "../core/hunk-parser.js";
import { readSnapshotFileBuffer } from "../core/delta.js";
import { withStorageLock } from "../core/lock.js";
import { resolveTrackedPath } from "../core/snapshot.js";
import { readManifest, readState } from "../core/state.js";
import { atomicWriteFile, backupFileForTransaction, runInTransaction } from "../core/transaction.js";

interface RunCherryPickCommandOptions {
  hunks?: number[];
  list?: boolean;
}

export async function runCherryPickCommand(
  targetPath: string,
  relativePath: string,
  options: RunCherryPickCommandOptions = {},
): Promise<void> {
  const state = await readState(targetPath);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const snapshotFile = manifest.files.find((file) => file.path === relativePath);

  if (!snapshotFile) {
    throw new Error(`Không tìm thấy file trong snapshot: ${relativePath}`);
  }

  if (snapshotFile.isBinary) {
    throw new Error(`Cherry-pick không hỗ trợ file binary: ${relativePath}`);
  }

  const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);
  const currentText = await readFile(liveFilePath, "utf8");
  const snapshotText = (await readSnapshotFileBuffer(state.storagePath, manifest.snapshotId, relativePath)).toString("utf8");
  const reversePatch = createPatch(relativePath, currentText, snapshotText, "current", "snapshot");
  const hunks = parsePatchHunks(reversePatch);

  if (options.list) {
    if (hunks.length === 0) {
      process.stdout.write("Không có hunk để cherry-pick.\n");
      return;
    }

    for (const [index, hunk] of hunks.entries()) {
      process.stdout.write(`${index}: -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines}\n`);
    }
    return;
  }

  if (!options.hunks || options.hunks.length === 0) {
    throw new Error("Thiếu --hunks hoặc dùng --list để xem hunk.");
  }

  const result = applySelectedHunks(currentText, relativePath, hunks, options.hunks);

  if (!result.success || result.content === undefined) {
    throw new Error(result.conflicts.join("\n") || "Cherry-pick thất bại.");
  }

  await withStorageLock(state.storagePath, `cherry-pick:${relativePath}`, async () => {
    await runInTransaction(state.storagePath, `cherry-pick:${relativePath}`, async (transaction) => {
      await backupFileForTransaction(state.storagePath, transaction, liveFilePath);
      await atomicWriteFile(liveFilePath, result.content!);
    });
  });

  process.stdout.write(`Đã apply ${result.appliedHunks} hunk cho ${relativePath}\n`);
}
