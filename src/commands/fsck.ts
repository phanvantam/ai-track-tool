import { runFsck } from "../core/fsck.js";

interface RunFsckCommandOptions {
  repair?: boolean;
}

export async function runFsckCommand(targetPath: string, options: RunFsckCommandOptions = {}): Promise<void> {
  const report = await runFsck(targetPath, options);
  const status = report.isHealthy ? "ok" : "error";

  process.stdout.write(`fsck: ${status}\n`);

  if (report.errors.length === 0) {
    process.stdout.write("Không phát hiện lỗi.\n");
  }

  for (const error of report.errors) {
    const pathSuffix = error.path ? ` ${error.path}` : "";
    const repairedSuffix = error.repaired ? " [repaired]" : "";
    process.stdout.write(`- ${error.type}${pathSuffix}${repairedSuffix}\n`);
  }

  for (const repair of report.repairs) {
    process.stdout.write(`* ${repair}\n`);
  }
}
