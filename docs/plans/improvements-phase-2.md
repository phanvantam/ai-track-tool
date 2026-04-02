# Plan: Core Improvements Phase 2 - Safety & Conflict Management

## 1. Context & Goals

**Mục tiêu chính:**
- Thêm **three-way merge** để detect + handle file conflicts.
- Implement **atomic operations** để đảm bảo consistency (all-or-nothing).
- Thêm **lock mechanism** chống race condition khi multi-process.
- Thêm **journal/undo log** để recovery nếu interrupt.

**Scope:**
- Tập trung vào `rollback`, `compare`, `merge` logic.
- Bỏ qua branching (phase khác) và UI.
- Phase này là nền tảng cho safety & auditability.

**Lý do quan trọng:**
- Hiện tại `rollback` ghi đè toàn bộ file → mất user edits nếu AI vừa edit cùng vị trí.
- Không có lock → 2 process cùng modify snapshot → corrupt.
- Interrupt giữa quá trình → partial state → inconsistent.

---

## 2. Hiện trạng

**Rollback hiện tại (`src/core/rollback.ts`):**
```typescript
export async function rollbackFile(targetPathInput: string, relativePath: string) {
  // ...
  await mkdir(path.dirname(liveFilePath), { recursive: true });
  await copyFile(snapshotAbsolutePath, liveFilePath);  // ← Ghi đè 100%
  return "restored";
}
```
- Copy snapshot file → cài đè file hiện tại.
- **Không check** nếu user đã edit file.
- Mất toàn bộ user changes.

**Compare hiện tại (`src/core/compare.ts`):**
- Chỉ detect 4 loại change (added/modified/deleted/renamed).
- Không biết **ai** changed (AI hay user).
- Không có concept của "base" vs "ours" vs "theirs".

**Multi-process hiện tại (`src/server/session.ts`):**
- `SessionManager` quản lý multiple sessions.
- Nhưng từng session write trực tiếp vào file (state.json, manifest.json).
- **Không có lock** → race condition có thể xảy ra.

**No undo/recovery:**
- Nếu `rollback` crash giữa chừng (copy 50 file, 50 file khác fail), không biết trạng thái.
- Không có journal để redo hoặc undo.

---

## 3. Phương án đề xuất

### 3.1 Three-Way Merge (Conflict Detection)

**Khái niệm:**
- **base:** Nội dung file lúc snapshot tạo.
- **ours:** Nội dung user chỉnh sửa (filesystem hiện tại).
- **theirs:** Nội dung AI muốn (snapshot mới - nhưng ở phase này chỉ dùng 1 snapshot, nên "theirs" = snapshot baseline cũ).

**Thực tế: Phase 2 focus vào scenario:**
- User đã edit file từ lúc snapshot.
- User gọi `rollback` → hệ thống cần detect conflict.
- Cung cấp 3 options: keep ours / keep theirs / manual merge.

**Module `src/core/merge.ts` (mới):**

```typescript
export type MergeStrategy = "ours" | "theirs" | "manual" | "auto";

export interface MergeConflict {
  path: string;
  type: "content" | "type";  // type: file was deleted then recreated, etc.
  base: string;              // Content lúc snapshot
  ours: string;              // Current user edits
  theirs: string;            // Content from rollback (snapshot)
  conflicts: ConflictChunk[];
}

export interface ConflictChunk {
  startLine: number;
  endLine: number;
  oursLines: string[];       // User lines
  theirsLines: string[];     // Snapshot lines
}

export interface MergeResult {
  status: "success" | "conflict" | "error";
  conflicts: MergeConflict[];
  merged?: string;           // Merged content (if auto-resolved)
}

/**
 * Three-way merge: so sánh base, ours (current), theirs (snapshot)
 */
export async function threeWayMerge(
  filePath: string,
  base: string | null,       // Content lúc snapshot (null = file mới)
  ours: string | null,       // Current content (null = file deleted)
  theirs: string | null      // Snapshot content (null = file deleted)
): Promise<MergeResult> {
  // Case 1: File xóa ở cả base/ours/theirs → no conflict
  if (!theirs && !ours) {
    return { status: "success", conflicts: [] };
  }

  // Case 2: File thêm mới bởi AI (theirs), user không có (ours) → no conflict
  if (!base && !ours && theirs) {
    return {
      status: "success",
      conflicts: [],
      merged: theirs,
    };
  }

  // Case 3: User xóa (ours), AI không xóa (theirs) → conflict
  if (ours === null && theirs !== null) {
    return {
      status: "conflict",
      conflicts: [{
        path: filePath,
        type: "type",
        base: base || "",
        ours: ours || "",
        theirs: theirs,
        conflicts: [],
      }],
    };
  }

  // Case 4: Binary file → không merge, report conflict
  if (isBinary(ours) || isBinary(theirs)) {
    return {
      status: "conflict",
      conflicts: [{
        path: filePath,
        type: "content",
        base: base || "",
        ours: ours || "",
        theirs: theirs || "",
        conflicts: [],
      }],
    };
  }

  // Case 5: Text file → three-way diff
  const baseLines = (base || "").split("\n");
  const oursLines = (ours || "").split("\n");
  const theirsLines = (theirs || "").split("\n");

  // Simple conflict detection: nếu cùng dòng bị edit
  const diff = require("diff");
  const diffs = diff.diffLines(base || "", theirs || "");
  
  // Nếu theirs không thay đổi gì → ours thắng (user changed)
  if (baseLines.length === theirsLines.length &&
      JSON.stringify(baseLines) === JSON.stringify(theirsLines)) {
    return {
      status: "success",
      conflicts: [],
      merged: ours,
    };
  }

  // Nếu ours không thay đổi gì → theirs thắng (rollback)
  if (baseLines.length === oursLines.length &&
      JSON.stringify(baseLines) === JSON.stringify(oursLines)) {
    return {
      status: "success",
      conflicts: [],
      merged: theirs,
    };
  }

  // Cả base + ours + theirs đều khác → conflict
  // Dùng library merge-anything hoặc implement 3-way merge tay
  const conflicts = detectConflicts(baseLines, oursLines, theirsLines);

  if (conflicts.length === 0) {
    // Auto-merge thành công
    const merged = autoMergeLines(baseLines, oursLines, theirsLines);
    return {
      status: "success",
      conflicts: [],
      merged: merged.join("\n"),
    };
  }

  // Có conflict → return markers
  const mergedWithMarkers = mergeWithConflictMarkers(
    baseLines,
    oursLines,
    theirsLines,
    conflicts
  );

  return {
    status: "conflict",
    conflicts: conflicts.map((c) => ({
      path: filePath,
      type: "content",
      base: base || "",
      ours: ours || "",
      theirs: theirs || "",
      conflicts: [c],
    })),
    merged: mergedWithMarkers,
  };
}

function mergeWithConflictMarkers(
  baseLines: string[],
  oursLines: string[],
  theirsLines: string[],
  conflicts: ConflictChunk[]
): string {
  const result: string[] = [];
  let lineIdx = 0;

  for (const conflict of conflicts) {
    // Add non-conflict lines trước conflict chunk
    while (lineIdx < conflict.startLine) {
      result.push(oursLines[lineIdx] || "");
      lineIdx++;
    }

    // Add conflict marker
    result.push("<<<<<<< ours (user edits)");
    result.push(...conflict.oursLines);
    result.push("=======");
    result.push(...conflict.theirsLines);
    result.push(">>>>>>> theirs (snapshot)");

    lineIdx = conflict.endLine;
  }

  // Add remaining lines
  while (lineIdx < oursLines.length) {
    result.push(oursLines[lineIdx]);
    lineIdx++;
  }

  return result.join("\n");
}

function detectConflicts(
  baseLines: string[],
  oursLines: string[],
  theirsLines: string[]
): ConflictChunk[] {
  // Simple LCS (Longest Common Subsequence) based conflict detection
  // TODO: Implement proper 3-way merge algorithm
  // For now: naive detection based on line-by-line comparison
  
  const conflicts: ConflictChunk[] = [];
  const maxLines = Math.max(baseLines.length, oursLines.length, theirsLines.length);

  for (let i = 0; i < maxLines; i++) {
    const baseLine = baseLines[i];
    const ourLine = oursLines[i];
    const theirLine = theirsLines[i];

    // Conflict if base ≠ ours AND base ≠ theirs AND ours ≠ theirs
    if (baseLine !== ourLine && baseLine !== theirLine && ourLine !== theirLine) {
      conflicts.push({
        startLine: i,
        endLine: i + 1,
        oursLines: ourLine ? [ourLine] : [],
        theirsLines: theirLine ? [theirLine] : [],
      });
    }
  }

  return conflicts;
}
```

**Dùng trong rollback:**
```typescript
export async function rollbackFileWithMerge(
  targetPath: string,
  relativePath: string,
  strategy: MergeStrategy = "manual"
): Promise<{ status: "ok" | "conflict"; mergeResult?: MergeResult }> {
  const state = await readState(targetPath);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const liveFilePath = resolveTrackedPath(state.targetPath, relativePath);
  const snapshotAbsPath = path.join(state.storagePath, "snapshots", manifest.snapshotId, "files", relativePath);

  // Đọc 3 version
  const baseContent = await readText(snapshotAbsPath);      // Snapshot
  const oursContent = await readText(liveFilePath);         // Current
  const theirsContent = baseContent;                        // Same as base (1 snapshot only)

  // Three-way merge
  const mergeResult = await threeWayMerge(
    relativePath,
    baseContent,
    oursContent,
    theirsContent
  );

  if (mergeResult.status === "success") {
    // Auto-merged hoặc không conflict
    await mkdir(path.dirname(liveFilePath), { recursive: true });
    await writeFile(liveFilePath, mergeResult.merged || theirsContent, "utf8");
    return { status: "ok" };
  }

  // Conflict detected
  if (strategy === "manual") {
    // Ghi file với conflict markers
    await writeFile(
      liveFilePath,
      mergeResult.merged || oursContent,
      "utf8"
    );
    return { status: "conflict", mergeResult };
  }

  if (strategy === "ours") {
    // Keep user edits, skip rollback
    return { status: "conflict", mergeResult };
  }

  if (strategy === "theirs") {
    // Keep snapshot (traditional rollback)
    await mkdir(path.dirname(liveFilePath), { recursive: true });
    await writeFile(liveFilePath, theirsContent, "utf8");
    return { status: "ok" };
  }

  if (strategy === "auto") {
    // Try auto-merge, fallback to manual markers
    if (mergeResult.merged) {
      await writeFile(liveFilePath, mergeResult.merged, "utf8");
      return { status: "ok" };
    }
    // Fallback to manual markers
    await writeFile(liveFilePath, mergeResult.merged || oursContent, "utf8");
    return { status: "conflict", mergeResult };
  }

  throw new Error(`Unknown merge strategy: ${strategy}`);
}
```

---

### 3.2 Atomic Operations & Transaction Journal

**Mục đích:**
- Đảm bảo rollback tất cả files hoặc không file nào (all-or-nothing).
- Nếu interrupt → có thể redo hoặc undo.

**Module `src/core/transaction.ts` (mới):**

```typescript
export interface TransactionEntry {
  id: string;                    // UUID
  action: "rollback" | "reset" | "create";
  timestamp: string;
  status: "pending" | "committed" | "failed" | "rolled-back";
  operations: Operation[];
  error?: string;
}

export interface Operation {
  type: "write" | "delete" | "mkdir";
  path: string;
  backupPath?: string;           // For undo
  checksum?: string;             // To verify write success
}

export interface TransactionLog {
  entries: TransactionEntry[];
}

const TRANSACTION_JOURNAL_PATH = (storagePath: string) =>
  path.join(storagePath, ".transaction-journal.jsonl");

/**
 * Wrap operation trong transaction
 */
export async function executeTransaction<T>(
  targetPath: string,
  action: "rollback" | "reset" | "create",
  executor: (tx: Transaction) => Promise<T>
): Promise<T> {
  const storagePath = await resolveStorageRoot(targetPath);
  const journalPath = TRANSACTION_JOURNAL_PATH(storagePath);
  
  const tx = new Transaction(storagePath);
  tx.entry.action = action;
  tx.entry.id = randomUUID();
  tx.entry.timestamp = new Date().toISOString();

  try {
    // Execute user callback
    const result = await executor(tx);

    // Commit transaction
    tx.entry.status = "committed";
    await appendJournalEntry(journalPath, tx.entry);

    return result;
  } catch (error) {
    // Transaction failed
    tx.entry.status = "failed";
    tx.entry.error = error instanceof Error ? error.message : "unknown";
    await appendJournalEntry(journalPath, tx.entry);

    // Rollback (undo operations)
    await tx.rollback();

    throw error;
  }
}

class Transaction {
  entry: TransactionEntry;
  private backups: Map<string, string> = new Map();

  constructor(private storagePath: string) {
    this.entry = {
      id: "",
      action: "create",
      timestamp: new Date().toISOString(),
      status: "pending",
      operations: [],
    };
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Backup original file nếu tồn tại
    if (await exists(filePath)) {
      const backupPath = `${filePath}.backup-${this.entry.id}`;
      await copyFile(filePath, backupPath);
      this.backups.set(filePath, backupPath);
    }

    // Write new file
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");

    this.entry.operations.push({
      type: "write",
      path: filePath,
      backupPath: this.backups.get(filePath),
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    // Backup before delete
    if (await exists(filePath)) {
      const backupPath = `${filePath}.backup-${this.entry.id}`;
      await copyFile(filePath, backupPath);
      this.backups.set(filePath, backupPath);
    }

    await rm(filePath, { force: true });

    this.entry.operations.push({
      type: "delete",
      path: filePath,
      backupPath: this.backups.get(filePath),
    });
  }

  async rollback(): Promise<void> {
    // Undo all operations in reverse order
    for (let i = this.entry.operations.length - 1; i >= 0; i--) {
      const op = this.entry.operations[i];

      if (op.type === "write" && op.backupPath) {
        // Restore backup
        await copyFile(op.backupPath, op.path);
      } else if (op.type === "delete" && op.backupPath) {
        // Restore from backup
        await copyFile(op.backupPath, op.path);
      }
    }

    // Cleanup backups
    for (const backupPath of this.backups.values()) {
      await rm(backupPath, { force: true });
    }
  }
}

async function appendJournalEntry(journalPath: string, entry: TransactionEntry): Promise<void> {
  // Append-only log (JSONL format)
  const line = JSON.stringify(entry);
  await appendFile(journalPath, `${line}\n`, "utf8");
}

export async function recoverTransactions(storagePath: string): Promise<void> {
  const journalPath = TRANSACTION_JOURNAL_PATH(storagePath);

  if (!await exists(journalPath)) return;

  const content = await readFile(journalPath, "utf8");
  const lines = content.trim().split("\n").filter((l) => l);

  for (const line of lines) {
    const entry: TransactionEntry = JSON.parse(line);

    if (entry.status === "pending") {
      // Transaction chưa commit → undo
      console.warn(`Recovering incomplete transaction ${entry.id}...`);
      // TODO: Implement undo logic
    }
  }
}
```

**Dùng trong rollback:**
```typescript
export async function rollbackFilesAtomic(
  targetPath: string,
  relativePaths: string[]
): Promise<void> {
  await executeTransaction(targetPath, "rollback", async (tx) => {
    for (const filePath of relativePaths) {
      const result = await rollbackFileWithMerge(targetPath, filePath, "theirs");
      // Write result
      // Nếu error → transaction rollback automatically
    }
  });
}
```

---

### 3.3 Lock Mechanism (Prevent Race Condition)

**Module `src/core/lock.ts` (mới):**

```typescript
export class FileLock {
  private lockPath: string;
  private locked = false;
  private lockTimeout = 30000;  // 30 seconds

  constructor(storagePath: string, lockName: string = "modify") {
    this.lockPath = path.join(storagePath, `.${lockName}.lock`);
  }

  async acquire(): Promise<void> {
    const startTime = Date.now();

    while (true) {
      try {
        // Atomic create (fail if exists)
        const fd = await open(this.lockPath, "wx");
        await writeFile(fd, `${process.pid}\n${Date.now()}\n`, "utf8");
        await close(fd);
        this.locked = true;
        return;
      } catch {
        // Lock file exists, check if stale
        try {
          const content = await readFile(this.lockPath, "utf8");
          const [pid, timestamp] = content.trim().split("\n");
          const lockAge = Date.now() - parseInt(timestamp, 10);

          if (lockAge > this.lockTimeout) {
            // Lock is stale → force remove
            await rm(this.lockPath, { force: true });
            console.warn(`Removed stale lock (PID: ${pid}, age: ${lockAge}ms)`);
            continue;
          }
        } catch {
          // Lock file unreadable → retry
        }

        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (Date.now() - startTime > this.lockTimeout * 2) {
          throw new Error(`Failed to acquire lock after ${this.lockTimeout * 2}ms`);
        }
      }
    }
  }

  async release(): Promise<void> {
    if (this.locked) {
      await rm(this.lockPath, { force: true });
      this.locked = false;
    }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}

export async function withLock<T>(
  storagePath: string,
  fn: () => Promise<T>,
  lockName: string = "modify"
): Promise<T> {
  const lock = new FileLock(storagePath, lockName);
  return lock.withLock(fn);
}
```

**Dùng trong session manager:**
```typescript
public async rollback(sessionId: string, relativePath: string): Promise<SessionState> {
  const session = this.requireSession(sessionId);
  const lock = new FileLock(session.targetPath);
  
  await lock.withLock(async () => {
    await session.rollback(relativePath);
  });
  
  return session.state;
}
```

---

## 4. Task Breakdown

### Phase 2.1: Three-Way Merge
- [ ] **T2.1.1** Tạo module `src/core/merge.ts` với interfaces
- [ ] **T2.1.2** Implement `threeWayMerge()` basic (binary detection, simple line-by-line)
- [ ] **T2.1.3** Implement conflict marker generation (<<<<<<< ours | =======)
- [ ] **T2.1.4** Implement `detectConflicts()` (3-way diff, LCS-based)
- [ ] **T2.1.5** Implement auto-merge (no conflicts)
- [ ] **T2.1.6** Implement merge strategies (ours/theirs/manual/auto)
- [ ] **T2.1.7** Update `rollback.ts` → `rollbackFileWithMerge()`
- [ ] **T2.1.8** Test merge: no conflict, conflict, binary, deleted files
- [ ] **T2.1.9** Add merge command `ai-track merge --path <dir> <file> --strategy`

### Phase 2.2: Atomic Operations & Transaction Journal
- [ ] **T2.2.1** Tạo module `src/core/transaction.ts` với interfaces
- [ ] **T2.2.2** Implement `Transaction` class (writeFile, deleteFile, rollback)
- [ ] **T2.2.3** Implement journal append logic (JSONL format)
- [ ] **T2.2.4** Implement `executeTransaction()` wrapper
- [ ] **T2.2.5** Implement recovery logic (`recoverTransactions()`)
- [ ] **T2.2.6** Update `rollbackFile()` → use transaction
- [ ] **T2.2.7** Test transaction: commit, fail + rollback, interrupt simulation
- [ ] **T2.2.8** Add recovery command `ai-track recover --path <dir>`

### Phase 2.3: Lock Mechanism
- [ ] **T2.3.1** Tạo module `src/core/lock.ts` với FileLock class
- [ ] **T2.3.2** Implement lock acquire (atomic create + stale detection)
- [ ] **T2.3.3** Implement lock release + cleanup
- [ ] **T2.3.4** Implement `withLock()` utility
- [ ] **T2.3.5** Update SessionManager → use lock trước modify snapshot
- [ ] **T2.3.6** Test lock: multi-process, stale detection, timeout
- [ ] **T2.3.7** Add lock diagnostics `ai-track lock --path <dir> --status`

### Phase 2.4: Integration & Testing
- [ ] **T2.4.1** Update `compare.ts` để report "conflict" status
- [ ] **T2.4.2** Add test file `tests/merge.test.ts`
- [ ] **T2.4.3** Add test file `tests/transaction.test.ts`
- [ ] **T2.4.4** Add test file `tests/lock.test.ts`
- [ ] **T2.4.5** Integration test: rollback with conflict → merge → verify
- [ ] **T2.4.6** Stress test: 10+ concurrent sessions → lock + transaction
- [ ] **T2.4.7** Update `README.md` with merge/rollback workflow

---

## 5. Files dự kiến ảnh hưởng

### Core modules (cần thay đổi):
- `src/types.ts` - Thêm MergeResult, ConflictChunk interfaces
- `src/core/rollback.ts` - Thêm `rollbackFileWithMerge()`, update `rollbackFile()`
- `src/core/compare.ts` - Thêm "conflict" status detection (optional)
- `src/server/session.ts` - Wrap operations với lock

### Modules mới:
- `src/core/merge.ts` - Three-way merge (mới)
- `src/core/transaction.ts` - Transaction journal (mới)
- `src/core/lock.ts` - File lock (mới)

### Commands (cần thêm):
- `src/commands/merge.ts` - CLI merge command (mới)
- `src/commands/recover.ts` - CLI recovery command (mới)
- `src/commands/lock.ts` - CLI lock diagnostics (mới)

### CLI entry:
- `src/cli.ts` - Thêm `merge`, `recover`, `lock` commands

### Tests (mới):
- `tests/merge.test.ts`
- `tests/transaction.test.ts`
- `tests/lock.test.ts`

---

## 6. Rủi ro & Câu hỏi mở

### Rủi ro cao:
1. **Three-way merge complexity:** LCS-based algorithm phức tạp, có thể bỏ lỡ edge cases.
2. **Lock stale detection:** Nếu process crash, lock file tồn lại → timeout 30s phải chờ.
3. **Transaction journal bloat:** Nếu chạy nhiều lần, journal file tăng vô hạn → cần cleanup.
4. **Backup file cleanup:** Nếu rollback crash, backup files orphan → occupy storage.

### Câu hỏi mở:
1. **Merge strategy default nên gì?** (Recommend: "manual" - hiển thị conflict markers cho user review)
2. **Lock timeout bao lâu tốt?** (30s? 1 minute? Depend on file size)
3. **Transaction journal retention policy?** (Keep all? Or cleanup after commit?)
4. **Backup file location?** (Same as source? Or separate backup dir?)
5. **Multi-file rollback conflict?** (Nếu 3 files merge, 2 có conflict, 1 no → rollback toàn bộ hay partial?)

### Assumptions:
- Three-way merge chỉ cần cho text files (binary → auto conflict).
- Lock file bỏ lại không delete được coi là stale sau 30s.
- Transaction journal append-only → không update existing entries.
- Merge markers (<<<<<<) là format mà user đã quen (từ Git).

---

## 7. Verification

### Functional Tests:
- [ ] Merge: no conflict khi chỉ snapshot thay đổi.
- [ ] Merge: no conflict khi chỉ user thay đổi.
- [ ] Merge: conflict khi cả user + snapshot thay đổi cùng dòng.
- [ ] Merge: auto-resolve khi changes ở dòng khác.
- [ ] Merge: output có conflict markers khi manual strategy.
- [ ] Rollback: atomic (all-or-nothing) cho 10+ files.
- [ ] Rollback: fail giữa chừng → transaction rollback tự động.
- [ ] Lock: acquire/release thành công.
- [ ] Lock: 2 process cùng try → 1 acquire, 1 wait.
- [ ] Lock: stale lock (30s old) → second process acquire.
- [ ] Recovery: transaction journal recover pending transaction.

### Performance:
- [ ] Merge 1MB text file < 1s.
- [ ] Lock acquire < 100ms (no contention).
- [ ] Lock acquire < 5s (with contention).
- [ ] Transaction journal append < 10ms per entry.

### Edge Cases:
- [ ] Empty files.
- [ ] Very large files (1GB+).
- [ ] Binary files.
- [ ] Files with no newlines.
- [ ] Files with mixed line endings (CRLF/LF).
- [ ] Deleted files (rollback).
- [ ] Renamed files (rollback).

### Integration:
- [ ] `ai-track rollback` mới hiển thị conflict nếu có.
- [ ] User có thể resolve conflict + re-rollback.
- [ ] CLI commands có help (`--help`).

---

## 8. Acceptance Criteria

### Phase 2 Completion:
1. ✅ Code pass tất cả tests (unit + integration + stress).
2. ✅ Merge logic detect + resolve conflicts correctly.
3. ✅ Atomic operations đảm bảo all-or-nothing.
4. ✅ Lock mechanism prevent race conditions.
5. ✅ Transaction journal enable recovery.
6. ✅ Backward compatible (old snapshots có fallback).
7. ✅ No breaking changes cho existing CLI/API.
8. ✅ README/docs cập nhật conflict resolution workflow.

