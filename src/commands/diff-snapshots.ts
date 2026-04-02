import { diffSnapshotManifests, getSnapshotManifestById } from "../core/snapshot-chain.js";
import { readState } from "../core/state.js";

export async function runDiffSnapshotsCommand(targetPath: string, fromSnapshotId: string, toSnapshotId: string): Promise<void> {
  const state = await readState(targetPath);
  const fromManifest = await getSnapshotManifestById(state.storagePath, fromSnapshotId);
  const toManifest = await getSnapshotManifestById(state.storagePath, toSnapshotId);
  const diffs = diffSnapshotManifests(fromManifest, toManifest);

  if (diffs.length === 0) {
    process.stdout.write("Không có khác biệt giữa hai snapshot.\n");
    return;
  }

  for (const diff of diffs) {
    process.stdout.write(`${diff.type}: ${diff.path}\n`);
  }
}
