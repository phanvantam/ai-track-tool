import { buildSnapshotChain, listSnapshotManifests, renderSnapshotGraph } from "../core/snapshot-chain.js";
import { resolveTagToSnapshot } from "../core/snapshot-tags.js";
import { readState } from "../core/state.js";
import type { SnapshotChain } from "../types.js";

interface RunLogCommandOptions {
  limit?: number;
  tag?: string;
  graph?: boolean;
  since?: string;
  message?: string;
}

export async function runLogCommand(targetPath: string, options: RunLogCommandOptions = {}): Promise<void> {
  const state = await readState(targetPath);
  const manifests = await listSnapshotManifests(state.storagePath);
  const tagSnapshotId = options.tag ? await resolveTagToSnapshot(state.storagePath, options.tag) : null;

  if (options.tag && !tagSnapshotId) {
    throw new Error(`Không tìm thấy tag: ${options.tag}`);
  }

  const sinceTimestamp = options.since ? Date.parse(options.since) : Number.NaN;

  if (options.since && Number.isNaN(sinceTimestamp)) {
    throw new Error(`Thời gian --since không hợp lệ: ${options.since}`);
  }

  const filtered = manifests.filter((manifest) => {
    if (tagSnapshotId && manifest.snapshotId !== tagSnapshotId) {
      return false;
    }

    if (options.since && Date.parse(manifest.createdAt) < sinceTimestamp) {
      return false;
    }

    if (options.message && !(manifest.summary ?? "").toLowerCase().includes(options.message.toLowerCase())) {
      return false;
    }

    return true;
  });
  const visible = options.limit ? filtered.slice(0, options.limit) : filtered;

  if (options.graph) {
    const visibleSnapshotIds = new Set(visible.map((manifest) => manifest.snapshotId));
    const nodes = filterGraphNodes(await buildSnapshotChain(state.storagePath), visibleSnapshotIds);
    const graph = renderSnapshotGraph(nodes, state.activeSnapshotId);
    process.stdout.write(`${graph}\n`);
    return;
  }

  if (visible.length === 0) {
    process.stdout.write("Không có snapshot history.\n");
    return;
  }

  for (const manifest of visible) {
    const marker = manifest.snapshotId === state.activeSnapshotId ? "*" : "-";
    process.stdout.write(`${marker} ${manifest.snapshotId} ${manifest.createdAt}`);
    if (manifest.summary) {
      process.stdout.write(` ${manifest.summary}`);
    }
    process.stdout.write("\n");
  }
}

function filterGraphNodes(nodes: SnapshotChain[], visibleSnapshotIds: Set<string>): SnapshotChain[] {
  if (visibleSnapshotIds.size === 0) {
    return [];
  }

  return nodes
    .filter((node) => visibleSnapshotIds.has(node.snapshotId))
    .map((node) => ({
      ...node,
      parentSnapshotId: node.parentSnapshotId && visibleSnapshotIds.has(node.parentSnapshotId) ? node.parentSnapshotId : null,
      childSnapshotIds: node.childSnapshotIds.filter((childId) => visibleSnapshotIds.has(childId)),
    }));
}
