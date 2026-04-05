# Phase 2 Detailed Checklist: Safety & Conflict Management

> Lưu ý: file này giữ breakdown công việc. Trạng thái thực thi chuẩn xem `docs/checklists/improvements-master-checklist.md`.

**Mục tiêu**: Implement 3-way merge, atomic operations, transaction journal, multi-process locking

**Ước tính**: 6-8 ngày (1-2 engineers)

**Dependency**: Phase 1 (incremental scan provides performance foundation)

---

## 📋 Overview

| Task Group | Count | Est. Time |
|-----------|-------|-----------|
| Preparation | 5 | 6 hours |
| Data Model | 5 | 4 hours |
| Three-way Merge | 7 | 16 hours |
| Transaction Journal | 7 | 14 hours |
| Locking Mechanism | 8 | 16 hours |
| Integration | 8 | 14 hours |
| Documentation | 6 | 4 hours |
| Sign-off | 1 | 2 hours |
| **Total** | **47** | **76 hours** |

---

## Preparation (6 hours)

- [ ] Review `docs/plans/improvements-phase-2.md` toàn bộ
- [ ] Evaluate 3-way merge libraries:
  - Option A: `merge-anything` npm package
  - Option B: `3-way-merge` npm package
  - Option C: Custom implementation
  - **Decision**: Choose and document rationale
- [ ] Design transaction journal format (append-only log structure)
- [ ] Design lock file format (what metadata to store)
- [ ] Setup feature branch: `git checkout -b feature/phase-2-safety`
- [ ] Create GitHub issue for Phase 2 tracking

---

## Data Model (4 hours)

**Goal**: Define conflict, merge result, transaction, lock interfaces

- [ ] Read `src/types.ts` (understand existing structure)
- [ ] Add `MergeConflict` interface:
  - `filePath: string`
  - `type: 'content' | 'delete_modify' | 'add_add'`
  - `markers: string[]` (conflict markers in file)
  - `ours: string` (our version)
  - `theirs: string` (their version)
  - `base: string` (original version)
- [ ] Add `MergeResult` interface:
  - `success: boolean`
  - `conflicts: MergeConflict[]`
  - `mergedFiles: string[]`
  - `strategy: 'ours' | 'theirs' | 'combined' | 'manual'`
  - `timestamp: number`
- [ ] Add `Transaction` interface:
  - `transactionId: string`
  - `operations: TransactionOperation[]` (list of operations)
  - `status: 'started' | 'completed' | 'rolled_back' | 'failed'`
  - `createdAt: number`
  - `completedAt?: number`
- [ ] Add `TransactionJournal` interface:
  - `entries: { transactionId: string, status: string, timestamp: number }[]`
- [ ] Add `LockInfo` interface:
  - `lockFile: string` (path to lock file)
  - `processId: number` (PID of lock holder)
  - `timestamp: number` (when lock acquired)
  - `operation: string` (what operation holds lock)
  - `expiresAt: number` (timeout)
- [ ] Unit test: All interfaces type-checked

---

## Three-way Merge (16 hours)

**Goal**: Implement merge with conflict detection

### Design & Setup (2 hours)
- [ ] Design 3-way diff algorithm (base, current, target)
- [ ] Design conflict detection rules
- [ ] Design merge strategies (ours, theirs, combined)
- [ ] Create `src/core/merge.ts` skeleton

### Implementation (12 hours)
- [ ] Implement `loadMergeLibrary()`: Use chosen npm package or custom
- [ ] Implement `compute3wayDiff(base, current, target)`: Get diff
- [ ] Implement `detectConflicts(diff)`: Find conflicting regions
- [ ] Implement `applyMergeStrategy()`: Use merge strategy (ours/theirs/combined)
- [ ] Implement `generateConflictMarkers()`: Create <<<<<<, ======, >>>>>>
- [ ] Implement `isMergeableFile(filePath)`: Return false for binary
- [ ] Implement error handling:
  - Binary files (no merge, require manual)
  - Empty files (edge case)
  - Files with no common base (all lines conflict)
  - LF vs CRLF handling

### Command & Testing (2 hours)
- [ ] Create `src/commands/merge.ts` command
- [ ] Write unit test: 3-way diff (no conflicts)
- [ ] Write unit test: conflicts detected correctly
- [ ] Write unit test: merge strategies work
- [ ] Write integration test: real merge scenario

---

## Atomic Operations & Transaction Journal (14 hours)

**Goal**: Ensure crash-safe operations

### Design & Setup (2 hours)
- [ ] Design transaction structure (what operations = atomic?)
- [ ] Design journal location: `.ai-track/transaction-log.json`
- [ ] Design recovery procedure (what to do on startup)
- [ ] Create `src/core/transaction.ts` skeleton

### Implementation (10 hours)
- [ ] Implement `startTransaction(operationName)`: Begin transaction, assign ID
- [ ] Implement `logOperation(transactionId, operation)`: Append to journal
- [ ] Implement `commitTransaction(transactionId)`: Mark complete
- [ ] Implement `rollbackTransaction(transactionId)`: Undo operations
- [ ] Implement `recoverIncompleteTransactions()`: On startup, check journal
- [ ] Implement atomic file operations:
  - Write to temp file → verify → move to target
  - Never overwrite without backup
- [ ] Implement journal cleanup (keep last 1000 entries)
- [ ] Implement error handling:
  - Disk full during write
  - Process crash mid-transaction
  - Journal corruption

### Integration (2 hours)
- [ ] Update `src/core/snapshot.ts` to use transactions
- [ ] Update `src/core/rollback.ts` to use transactions
- [ ] Add recovery check to startup (if exists, recover)

---

## Locking Mechanism (16 hours)

**Goal**: Multi-process safety (prevent concurrent modifications)

### Design & Setup (2 hours)
- [ ] Design optimistic vs pessimistic locking strategy
  - **Decision**: Use pessimistic (safer, simpler)
- [ ] Design lock file location: `.ai-track/.lock`
- [ ] Design lock timeout (default 30s, configurable)
- [ ] Design lock contention handling (wait or error?)
- [ ] Create `src/core/lock.ts` skeleton

### Optimistic Locking Implementation (6 hours)
- [ ] Implement `acquireLock(operation)`: Create lock file
- [ ] Implement `releaseLock()`: Delete lock file
- [ ] Implement `isLocked()`: Check if locked
- [ ] Implement `waitForLock(timeout)`: Poll until lock free (or timeout)
- [ ] Implement PID validation (is lock holder still alive?)
- [ ] Implement timeout-based lock release (stale lock cleanup)

### Pessimistic Locking (if needed) (6 hours)
- [ ] Implement file-based locking (flock-style)
- [ ] Implement atomic lock acquisition
- [ ] Implement lock holder detection (get PID from lock file)

### Command & Diagnostics (1 hour)
- [ ] Create `src/commands/lock.ts` diagnostics:
  - `ai-track lock --status` (show current lock)
  - `ai-track lock --release` (forcefully release lock)

### Testing (1 hour)
- [ ] Write unit test: lock acquire/release
- [ ] Write unit test: stale lock cleanup
- [ ] Write integration test: concurrent operations (simulate with threads)

---

## Integration & Testing (14 hours)

**Goal**: Ensure Phase 1 + 2 work together

### Integration (6 hours)
- [ ] Update `src/core/snapshot.ts`:
  - Acquire lock before snapshot
  - Use transactions for atomic operations
  - Release lock after complete
- [ ] Update `src/core/rollback.ts`:
  - Acquire lock before rollback
  - Log operation in transaction
  - Handle merge if needed
- [ ] Update `src/core/state.ts`:
  - Transaction-aware state management
- [ ] Add Phase 2 commands to `src/cli.ts`:
  - Register merge, lock commands
- [ ] Ensure error handling consistent across modules

### Compatibility Testing (2 hours)
- [ ] Test: Old snapshots (no transaction journal) still work
- [ ] Test: Merge with old snapshots (no history)
- [ ] Test: Mixed mode (some ops with transactions, some without)

### Multi-Process Testing (3 hours)
- [ ] Write test: 2 processes try to snapshot simultaneously
- [ ] Write test: Process A snapshots while B is mid-operation
- [ ] Write test: Lock timeout → cleanup stale lock
- [ ] Write test: Process crash → recovery works
- [ ] Stress test: 50 concurrent operations (in test harness)

### Merge Testing (2 hours)
- [ ] Write test: Merge no conflicts
- [ ] Write test: Merge with content conflicts
- [ ] Write test: Merge with delete/modify conflict
- [ ] Write test: Binary files refuse merge
- [ ] Benchmark: 1000-file merge < 5 seconds

### Integration Tests (1 hour)
- [ ] Run full test suite: `npm test` (Phase 1 + Phase 2)
- [ ] Performance regression test (no slowdown)

---

## Documentation (4 hours)

- [ ] Update `README.md`:
  - Add section: "Conflict Management (Phase 2)"
  - Document merge command
  - Document how conflicts are handled
  - Document locking mechanism
- [ ] Add usage examples:
  ```bash
  ai-track merge <snapshot1> <snapshot2>    # Merge
  ai-track lock --status                    # Check lock
  ai-track lock --release                   # Force release
  ```
- [ ] Document merge strategies (ours, theirs, combined)
- [ ] Document transaction journal format
- [ ] Document lock timeout configuration
- [ ] Create troubleshooting guide:
  - "Merge has conflicts, what now?"
  - "Lock file stuck, how to unstick?"
  - "Transaction incomplete, recovery?"

---

## Phase 2 Sign-off (2 hours)

- [ ] All 47 tasks completed
- [ ] All unit tests pass (npm test)
- [ ] All integration tests pass
- [ ] Multi-process stress test passes (50 concurrent ops)
- [ ] No data corruption in any scenario
- [ ] Backward compatibility verified
- [ ] Code reviewed and approved
- [ ] PR merged to main
- [ ] Tag release (if Phase 2 released separately)
- [ ] Mark checklist complete

---

## Notes & Risks

**Risks**:
1. Merge conflicts confusing for users
2. Lock timeout too short → operations fail
3. Lock timeout too long → deadlock perception
4. Transaction journal grows unbounded
5. Process crash during recovery → data corruption

**Mitigations**:
1. Clear conflict UI, merge strategies documented
2. Configurable timeout, default 30s
3. Auto-cleanup incomplete transactions on startup
4. Journal cleanup (keep last 1000 entries)
5. Extensive crash-scenario testing

**Next Phase**: Once Phase 2 complete, move to Phase 3 (History & Metadata)

---

**Created**: 2026-04-02
**Phase**: 2 of 4
**Estimate**: 6-8 days (1-2 engineers)
