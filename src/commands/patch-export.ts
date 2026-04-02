import { exportPatchBetweenSnapshots } from "../core/patch.js";

export async function runPatchExportCommand(targetPath: string, fromSnapshotId: string, toSnapshotId: string): Promise<void> {
  const exported = await exportPatchBetweenSnapshots(targetPath, fromSnapshotId, toSnapshotId);
  process.stdout.write(`${exported.patchText}\n`);
}
