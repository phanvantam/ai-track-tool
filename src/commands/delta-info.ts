import { getDeltaInfo } from "../core/delta.js";
import { readState } from "../core/state.js";

export async function runDeltaInfoCommand(targetPath: string): Promise<void> {
  const state = await readState(targetPath);
  const info = await getDeltaInfo(state.storagePath);
  const ratio = info.logicalBytes === 0 ? 0 : Math.max(0, 100 - Math.round((info.deltaBytes / info.logicalBytes) * 100));

  process.stdout.write(`snapshots: ${info.snapshots}\n`);
  process.stdout.write(`fullFiles: ${info.fullFiles}\n`);
  process.stdout.write(`referenceFiles: ${info.referenceFiles}\n`);
  process.stdout.write(`deltaFiles: ${info.deltaFiles}\n`);
  process.stdout.write(`logicalBytes: ${info.logicalBytes}\n`);
  process.stdout.write(`storedBytes: ${info.deltaBytes}\n`);
  process.stdout.write(`savingPercent: ${ratio}\n`);
}
