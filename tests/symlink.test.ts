import { mkdtemp, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { rollbackFile } from "../src/core/rollback.js";
import { createSnapshot } from "../src/core/snapshot.js";
import { readManifest } from "../src/core/state.js";

describe("symlink support", () => {
  it("snapshot luu symlink metadata", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-symlink-"));
    await writeFile(path.join(targetPath, "target.txt"), "hello\n", "utf8");
    await symlink("target.txt", path.join(targetPath, "link.txt"));

    const state = await createSnapshot(targetPath);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
    const linkEntry = manifest.files.find((file) => file.path === "link.txt");

    expect(linkEntry?.storageKind).toBe("symlink");
    expect(linkEntry?.symlink?.target).toBe("target.txt");
  });

  it("rollback symlink tao lai dung target", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-symlink-"));
    await writeFile(path.join(targetPath, "target.txt"), "hello\n", "utf8");
    await symlink("target.txt", path.join(targetPath, "link.txt"));

    await createSnapshot(targetPath);
    await writeFile(path.join(targetPath, "other.txt"), "other\n", "utf8");
    await rm(path.join(targetPath, "link.txt"));
    await writeFile(path.join(targetPath, "link.txt"), "plain file\n", "utf8");

    await rollbackFile(targetPath, "link.txt");

    expect(await readlink(path.join(targetPath, "link.txt"))).toBe("target.txt");
  });

  it("giu broken symlink", async () => {
    const targetPath = await mkdtemp(path.join(tmpdir(), "ai-track-symlink-"));
    await symlink("missing.txt", path.join(targetPath, "broken.txt"));

    const state = await createSnapshot(targetPath);
    const manifest = await readManifest(state.storagePath, state.activeSnapshotId);

    expect(manifest.files.find((file) => file.path === "broken.txt")?.symlink?.target).toBe("missing.txt");
  });
});
