import { mkdtemp, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  atomicWriteFile,
  backupFileForTransaction,
  beginTransaction,
  readTransactionJournal,
  recoverIncompleteTransactions,
  runInTransaction,
} from "../src/core/transaction.js";

describe("transaction", () => {
  it("atomicWriteFile ghi de an toan", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-transaction-"));
    const filePath = path.join(root, "note.txt");
    await writeFile(filePath, "old\n", "utf8");

    await atomicWriteFile(filePath, "new\n");

    expect(await readFile(filePath, "utf8")).toBe("new\n");
  });

  it("rollback transaction khoi phuc file khi callback fail", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-transaction-"));
    const filePath = path.join(root, "note.txt");
    await writeFile(filePath, "old\n", "utf8");

    await expect(
      runInTransaction(root, "test-rollback", async (transaction) => {
        await backupFileForTransaction(root, transaction, filePath);
        await atomicWriteFile(filePath, "new\n");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await readFile(filePath, "utf8")).toBe("old\n");
  });

  it("recoverIncompleteTransactions rollback duoc giao dich dang do", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-transaction-"));
    const filePath = path.join(root, "note.txt");
    await writeFile(filePath, "old\n", "utf8");

    const transaction = await beginTransaction(root, "crashed-transaction");
    await backupFileForTransaction(root, transaction, filePath);
    await atomicWriteFile(filePath, "new\n");

    const recovered = await recoverIncompleteTransactions(root);
    const journal = await readTransactionJournal(root);

    expect(recovered).toContain(transaction.transactionId);
    expect(await readFile(filePath, "utf8")).toBe("old\n");
    expect(journal.entries.some((entry) => entry.transactionId === transaction.transactionId && entry.kind === "rollback")).toBe(true);
  });

  it("rollback transaction khoi phuc symlink", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-track-transaction-"));
    await writeFile(path.join(root, "target.txt"), "old\n", "utf8");
    const linkPath = path.join(root, "link.txt");
    await symlink("target.txt", linkPath);

    await expect(
      runInTransaction(root, "test-symlink-rollback", async (transaction) => {
        await backupFileForTransaction(root, transaction, linkPath);
        await rm(linkPath);
        await writeFile(linkPath, "plain file\n", "utf8");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await readlink(linkPath)).toBe("target.txt");
  });
});
