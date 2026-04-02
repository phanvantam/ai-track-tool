# Phase 3 Detailed Checklist: History & Metadata

> Lưu ý: file này giữ breakdown công việc. Trạng thái thực thi chuẩn xem `docs/checklists/improvements-master-checklist.md`.

**Mục tiêu**: Implement snapshot DAG, reflog (audit log), tags, annotations, history traversal

**Ước tính**: 5-7 ngày (1-2 engineers)

**Dependency**: Phase 1 (can run parallel with Phase 2, but depends on Phase 1)

---

## 📋 Overview

| Task Group | Count | Est. Time |
|-----------|-------|-----------|
| Preparation | 4 | 4 hours |
| Data Model | 5 | 4 hours |
| Snapshot Chain | 8 | 12 hours |
| Reflog | 7 | 10 hours |
| Tags & Annotations | 8 | 12 hours |
| Commands & Traversal | 8 | 14 hours |
| Integration | 8 | 12 hours |
| Documentation | 6 | 4 hours |
| Sign-off | 1 | 2 hours |
| **Total** | **55** | **74 hours** |

---

## Preparation (4 hours)

- [ ] Review `docs/plans/improvements-phase-3.md` toàn bộ
- [ ] Design snapshot DAG structure (parent pointers, children tracking)
- [ ] Design reflog format (append-only operation log)
- [ ] Setup feature branch: `git checkout -b feature/phase-3-history`
- [ ] Create GitHub issue for Phase 3 tracking

---

## Data Model (4 hours)

**Goal**: Define snapshot chain, reflog, tag, annotation interfaces

- [ ] Read `src/types.ts`
- [ ] Add `SnapshotChain` interface:
  - `snapshotId: string`
  - `parentSnapshotId: string | null` (null = initial snapshot)
  - `childSnapshots: string[]` (list of child snapshot IDs)
  - `createdAt: number`
  - `metadata?: object`
- [ ] Add `ReflogEntry` interface:
  - `entryId: string`
  - `operation: 'snapshot' | 'rollback' | 'merge' | 'tag' | 'note' | 'gc'`
  - `snapshotId: string` (affected snapshot)
  - `timestamp: number`
  - `metadata: { [key: string]: any }` (operation-specific data)
- [ ] Add `SnapshotTag` interface:
  - `tagId: string`
  - `name: string` (e.g., "release-v1.0")
  - `snapshotId: string` (points to snapshot)
  - `createdAt: number`
  - `createdBy?: string`
- [ ] Add `SnapshotAnnotation` interface:
  - `annotationId: string`
  - `snapshotId: string`
  - `note: string`
  - `tags: string[]` (custom tags)
  - `createdAt: number`
- [ ] Update Manifest interface to include `parentSnapshotId`
- [ ] Unit test: All interfaces properly typed

---

## Snapshot Chain / History (12 hours)

**Goal**: Implement DAG structure for snapshot history

### Design & Setup (2 hours)
- [ ] Design parent-child tracking in Manifest
- [ ] Decide migration strategy (existing snapshots → single chain)
- [ ] Create `src/core/snapshot-chain.ts` skeleton

### Implementation (8 hours)
- [ ] Implement `setParentSnapshot(snapshotId, parentId)`: Link parent
- [ ] Implement `getParentSnapshot(snapshotId)`: Get parent reference
- [ ] Implement `getChildSnapshots(snapshotId)`: Get children
- [ ] Implement `getSnapshotPath(snapshotId)`: Get full path from root to snapshot
- [ ] Implement `isAncestor(ancestorId, snapshotId)`: Check if ancestor relationship
- [ ] Implement `findCommonAncestor(id1, id2)`: For merge operations
- [ ] Implement snapshot graph traversal:
  - DFS (depth-first search)
  - BFS (breadth-first search)
  - Parents walk-up
  - Children walk-down

### Migration (1 hour)
- [ ] Read existing snapshots
- [ ] Assign parent pointers (existing snapshots → single chain)
- [ ] Verify chain integrity (no cycles, all connected)

### Testing (1 hour)
- [ ] Write unit test: parent-child linking
- [ ] Write unit test: path traversal
- [ ] Write unit test: common ancestor detection
- [ ] Write unit test: migration correctness

---

## Reflog (Operation Log) (10 hours)

**Goal**: Implement audit log for all operations

### Design & Setup (1 hour)
- [ ] Design reflog storage: `.ai-track/reflog.json`
- [ ] Design reflog entry format
- [ ] Create `src/core/reflog.ts` skeleton

### Implementation (7 hours)
- [ ] Implement `appendReflogEntry(entry)`: Add to reflog
- [ ] Implement `getReflogEntry(index)`: Get by index (0 = most recent)
- [ ] Implement `getReflogEntries(count)`: Get last N entries
- [ ] Implement `queryReflog(filters)`: Filter by operation/date/snapshot
- [ ] Implement `loadReflog()`: Read from disk
- [ ] Implement `saveReflog()`: Write to disk
- [ ] Implement reflog cleanup:
  - Keep last 1000 entries (configurable)
  - Archive old entries (optional)

### Command & CLI (1 hour)
- [ ] Create `src/commands/reflog.ts` command
- [ ] Output: table format (entry #, operation, snapshot, timestamp, metadata)

### Integration (1 hour)
- [ ] Call `appendReflogEntry()` when:
  - Snapshot created
  - Rollback executed
  - Merge performed
  - Tag added
  - Note added
  - GC run
- [ ] Pass operation metadata to reflog

---

## Tags & Annotations (12 hours)

**Goal**: Implement snapshot tagging and notes

### Design & Setup (1 hour)
- [ ] Design tag storage: `.ai-track/tags.json`
- [ ] Design annotation storage: `.ai-track/annotations/`
- [ ] Create `src/core/snapshot-tags.ts` skeleton

### Tags Implementation (5 hours)
- [ ] Implement `addTag(name, snapshotId)`: Create tag
- [ ] Implement `removeTag(tagName)`: Delete tag
- [ ] Implement `getTag(tagName)`: Get tag info
- [ ] Implement `listTags()`: All tags
- [ ] Implement `findSnapshotByTag(tagName)`: Resolve tag to snapshot
- [ ] Implement tag validation (no duplicates, valid names)
- [ ] Implement tag deletion logging (add to reflog)

### Annotations Implementation (4 hours)
- [ ] Implement `addAnnotation(snapshotId, note, tags)`: Add note
- [ ] Implement `getAnnotation(snapshotId)`: Get note
- [ ] Implement `removeAnnotation(snapshotId)`: Delete note
- [ ] Implement `listAnnotations()`: All annotations
- [ ] Implement annotation search (full-text, tags)
- [ ] Implement annotation versioning (keep history of notes)

### Commands & CLI (2 hours)
- [ ] Create `src/commands/tag.ts` command:
  - `ai-track tag create <name> <snapshot-id>`
  - `ai-track tag delete <name>`
  - `ai-track tag list`
- [ ] Create `src/commands/note.ts` command:
  - `ai-track note add <snapshot-id> "<message>"`
  - `ai-track note show <snapshot-id>`
  - `ai-track note delete <snapshot-id>`

---

## Commands & Snapshot Traversal (14 hours)

**Goal**: Implement history navigation commands

### Log Command (4 hours)
- [ ] Create `src/commands/log.ts`:
  - List snapshot history in chronological order
  - Show: snapshot ID, parent, timestamp, file count, tag (if exists)
  - Filtering: by date range, by tag, by operation type
  - Sorting: by timestamp, by size
  - Output formats: table, JSON, ASCII tree
- [ ] Implement ASCII tree visualization:
  ```
  * snapshot-id-1 (latest)
  |
  * snapshot-id-2
  |
  * snapshot-id-3 (tagged: v1.0)
  ```
- [ ] Implement pagination (for large histories)

### Diff-Snapshots Command (4 hours)
- [ ] Create `src/commands/diff-snapshots.ts`:
  - Compare any two snapshots
  - Show file changes (added, deleted, modified)
  - Show line-level diff (if requested)
  - Show rename detection
  - Output: summary, detailed list, statistics
- [ ] Implement efficient diff (use Phase 1 caching if available)

### Show Command (3 hours)
- [ ] Create `src/commands/show.ts`:
  - Show snapshot details: ID, parent, timestamp, size, file list
  - Show reflog entries for snapshot
  - Show tags/annotations
  - Show file contents at that snapshot (for specific file)

### Cherry-pick Prep (3 hours)
- [ ] Implement snapshot query (get by ID, tag, date)
- [ ] Implement file content retrieval from specific snapshot
- [ ] Prepare infrastructure for Phase 4 cherry-pick
- [ ] Note: Actual cherry-pick implemented in Phase 4

---

## Integration & Testing (12 hours)

**Goal**: Ensure Phase 1 + Phase 3 work together

### Integration (5 hours)
- [ ] Update `src/core/snapshot.ts`:
  - Set parent snapshot reference when creating
  - Add snapshot to reflog
- [ ] Update `src/core/rollback.ts`:
  - Log operation in reflog
- [ ] Update merge (Phase 2):
  - Log merge in reflog
  - Properly set parent references post-merge
- [ ] Add Phase 3 commands to `src/cli.ts`:
  - Register log, diff-snapshots, tag, note commands
- [ ] Ensure consistent error handling

### Compatibility Testing (2 hours)
- [ ] Test: Old snapshots (no parent reference) handled gracefully
- [ ] Test: Migration (add parents to existing snapshots)
- [ ] Test: Mixed mode (old + new snapshots in history)

### History Traversal Testing (3 hours)
- [ ] Write test: log command with various filters
- [ ] Write test: diff-snapshots accuracy
- [ ] Write test: tag resolve correctly
- [ ] Write test: annotation storage/retrieval
- [ ] Write test: complex history (branching scenarios)
- [ ] Benchmark: log command on 1000 snapshots (< 1 second)

### Integration Tests (2 hours)
- [ ] Run full test suite: `npm test` (Phase 1 + Phase 3)
- [ ] Performance regression test
- [ ] End-to-end test: create snapshots → query history → show details

---

## Documentation (4 hours)

- [ ] Update `README.md`:
  - Add section: "History & Navigation (Phase 3)"
  - Document log, diff-snapshots, tag, note commands
  - Document snapshot DAG concept
  - Document reflog for auditability
- [ ] Add usage examples:
  ```bash
  ai-track log                                    # Show history
  ai-track log --tag release-v1.0                # Filter by tag
  ai-track diff-snapshots <id1> <id2>           # Compare
  ai-track tag create myrelease <snapshot-id>   # Tag
  ai-track note add <snapshot-id> "Fixed bug #123"  # Annotate
  ```
- [ ] Document snapshot DAG structure (for developers)
- [ ] Document reflog retention policy
- [ ] Create guide: Understanding Your History
- [ ] Create troubleshooting guide

---

## Phase 3 Sign-off (2 hours)

- [ ] All 55 tasks completed
- [ ] All unit tests pass (npm test)
- [ ] All integration tests pass
- [ ] History traversal commands work correctly
- [ ] No backward compatibility issues
- [ ] Performance targets met (log < 1s for 1000 snapshots)
- [ ] Code reviewed and approved
- [ ] PR merged to main
- [ ] Tag release (if Phase 3 released separately)
- [ ] Mark checklist complete

---

## Notes & Risks

**Risks**:
1. Reflog grows unbounded → disk space issues
2. Parent pointers inconsistent → corrupted history
3. Tag/annotation data lost → no recovery
4. Complex history (many branches) → performance issues

**Mitigations**:
1. Auto-cleanup reflog (keep last 1000 entries)
2. Validation on every parent-child operation
3. Tag/annotation stored redundantly (disk + memory cache)
4. Optimize graph traversal (BFS, memoization)

**Next Phase**: Once Phase 3 complete, move to Phase 4 (Advanced Features)

---

**Created**: 2026-04-02
**Phase**: 3 of 4
**Estimate**: 5-7 days (1-2 engineers)
