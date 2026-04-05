import { appendFile, copyFile, lstat, mkdir, readFile, readlink, rename, rm, symlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import type { Transaction, TransactionJournal, TransactionJournalEntry, TransactionOperation } from "../types.js";

const TRANSACTION_LOG_FILE = "transaction-log.jsonl";

function toEntry(transaction: Transaction, kind: TransactionJournalEntry["kind"], step?: TransactionOperation): TransactionJournalEntry {
  return {
    transactionId: transaction.transactionId,
    operation: transaction.operation,
    status: transaction.status,
    kind,
    timestamp: new Date().toISOString(),
    step,
  };
}

async function appendJournalEntry(storagePath: string, entry: TransactionJournalEntry): Promise<void> {
  await mkdir(storagePath, { recursive: true });
  await appendFile(getTransactionLogPath(storagePath), `${JSON.stringify(entry)}\n`, "utf8");
}

export function getTransactionLogPath(storagePath: string): string {
  return path.join(storagePath, TRANSACTION_LOG_FILE);
}

export function getTransactionTempRoot(storagePath: string, transactionId: string): string {
  return path.join(storagePath, "transactions", transactionId);
}

export async function atomicWriteFile(targetPath: string, content: string | Buffer): Promise<void> {
  const directoryPath = path.dirname(targetPath);
  const tempPath = path.join(directoryPath, `.tmp-${randomUUID()}`);

  await mkdir(directoryPath, { recursive: true });
  await writeFile(tempPath, content);
  await rename(tempPath, targetPath);
}

export async function readTransactionJournal(storagePath: string): Promise<TransactionJournal> {
  try {
    const content = await readFile(getTransactionLogPath(storagePath), "utf8");
    const entries = content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TransactionJournalEntry);
    return { entries };
  } catch {
    return { entries: [] };
  }
}

export async function beginTransaction(storagePath: string, operation: string): Promise<Transaction> {
  const transaction: Transaction = {
    transactionId: randomUUID(),
    operation,
    status: "started",
    createdAt: new Date().toISOString(),
    steps: [],
  };

  await mkdir(getTransactionTempRoot(storagePath, transaction.transactionId), { recursive: true });
  await appendJournalEntry(storagePath, toEntry(transaction, "begin"));
  return transaction;
}

export async function recordTransactionStep(
  storagePath: string,
  transaction: Transaction,
  step: TransactionOperation,
): Promise<void> {
  transaction.steps.push(step);
  await appendJournalEntry(storagePath, toEntry(transaction, "step", step));
}

export async function backupFileForTransaction(
  storagePath: string,
  transaction: Transaction,
  targetPath: string,
): Promise<void> {
  try {
    const targetStats = await lstat(targetPath);

    if (targetStats.isSymbolicLink()) {
      await recordTransactionStep(storagePath, transaction, {
        type: "restore_file",
        path: targetPath,
        symlinkTarget: await readlink(targetPath),
      });
      return;
    }
  } catch {
    await recordTransactionStep(storagePath, transaction, {
      type: "delete_file",
      path: targetPath,
    });
    return;
  }

  const backupPath = path.join(getTransactionTempRoot(storagePath, transaction.transactionId), randomUUID());
  await mkdir(path.dirname(backupPath), { recursive: true });
  await copyFile(targetPath, backupPath);
  await recordTransactionStep(storagePath, transaction, {
    type: "restore_file",
    path: targetPath,
    backupPath,
  });
}

export async function recordDeleteDirectory(storagePath: string, transaction: Transaction, targetPath: string): Promise<void> {
  await recordTransactionStep(storagePath, transaction, {
    type: "delete_dir",
    path: targetPath,
  });
}

async function rollbackStep(step: TransactionOperation): Promise<void> {
  if (step.type === "restore_file") {
    await mkdir(path.dirname(step.path), { recursive: true });

    if (step.symlinkTarget) {
      await rm(step.path, { recursive: true, force: true });
      await symlink(step.symlinkTarget, step.path);
      return;
    }

    if (!step.backupPath) {
      throw new Error(`Thiếu backupPath cho bước restore_file: ${step.path}`);
    }

    await copyFile(step.backupPath, step.path);
    return;
  }

  if (step.type === "delete_dir") {
    await rm(step.path, { recursive: true, force: true });
    return;
  }

  await rm(step.path, { recursive: false, force: true });
}

export async function rollbackTransaction(storagePath: string, transaction: Transaction): Promise<void> {
  const steps = [...transaction.steps].reverse();

  for (const step of steps) {
    await rollbackStep(step);
  }

  transaction.status = "rolled_back";
  transaction.completedAt = new Date().toISOString();
  await appendJournalEntry(storagePath, toEntry(transaction, "rollback"));
  await rm(getTransactionTempRoot(storagePath, transaction.transactionId), { recursive: true, force: true });
}

export async function commitTransaction(storagePath: string, transaction: Transaction): Promise<void> {
  transaction.status = "completed";
  transaction.completedAt = new Date().toISOString();
  await appendJournalEntry(storagePath, toEntry(transaction, "commit"));
  await rm(getTransactionTempRoot(storagePath, transaction.transactionId), { recursive: true, force: true });
}

export async function recoverIncompleteTransactions(storagePath: string): Promise<string[]> {
  const journal = await readTransactionJournal(storagePath);
  const transactions = new Map<string, Transaction>();

  for (const entry of journal.entries) {
    const existing = transactions.get(entry.transactionId) ?? {
      transactionId: entry.transactionId,
      operation: entry.operation,
      status: entry.status,
      createdAt: entry.timestamp,
      steps: [],
    };

    existing.status = entry.status;

    if (entry.kind === "step" && entry.step) {
      existing.steps.push(entry.step);
    }

    if (entry.kind === "commit" || entry.kind === "rollback") {
      existing.completedAt = entry.timestamp;
    }

    transactions.set(entry.transactionId, existing);
  }

  const recovered: string[] = [];

  for (const transaction of transactions.values()) {
    if (transaction.status !== "started") {
      continue;
    }

    await rollbackTransaction(storagePath, transaction);
    recovered.push(transaction.transactionId);
  }

  return recovered;
}

export async function runInTransaction<T>(
  storagePath: string,
  operation: string,
  callback: (transaction: Transaction) => Promise<T>,
): Promise<{ result: T; transaction: Transaction }> {
  const transaction = await beginTransaction(storagePath, operation);

  try {
    const result = await callback(transaction);
    await commitTransaction(storagePath, transaction);
    return { result, transaction };
  } catch (error) {
    await rollbackTransaction(storagePath, transaction);
    throw error;
  }
}
