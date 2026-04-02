# Phase 1 Detailed Checklist: Performance & Integrity

> Lưu ý: file này giữ breakdown công việc. Trạng thái thực thi chuẩn xem `docs/checklists/improvements-master-checklist.md`.

**Mục tiêu**: Tối ưu hóa hiệu suất (incremental scan) và cải thiện độ tin cậy (FSCK, GC)

**Ước tính**: 5-7 ngày (1 engineer)

**Dependency**: None (Phase 1 độc lập)

---

## 📋 Overview

| Task Group | Count | Est. Time |
|-----------|-------|-----------|
| Preparation | 4 | 4 hours |
| Data Model | 5 | 4 hours |
| Incremental Scanning | 8 | 16 hours |
| FSCK | 8 | 16 hours |
| GC | 8 | 12 hours |
| Integration | 8 | 12 hours |
| Documentation | 6 | 4 hours |
| Sign-off | 1 | 2 hours |
| **Total** | **48** | **70 hours** |

---

## Preparation (4 hours)

- [ ] Review `docs/plans/improvements-phase-1.md` toàn bộ (read & understand context)
- [ ] Decide xdiff implementation: npm package (xdiff-js) vs custom?
- [ ] Setup feature branch: `git checkout -b feature/phase-1-incremental-scan`
- [ ] Create GitHub issue #XXX for Phase 1 tracking

---

## Data Model (4 hours)

**Goal**: Định nghĩa các interfaces cần thiết cho Phase 1

- [ ] Read `src/types.ts` hiện tại (understand existing types)
- [ ] Add `FileMetadata` interface:
  - `filePath: string`
  - `mtime: number` (modification time)
  - `size: number` (file size in bytes)
  - `hash: string` (SHA-256 hash)
  - `isDirectory?: boolean`
- [ ] Add `MetadataCache` interface:
  - `version: number` (cache format version)
  - `timestamp: number` (cache created time)
  - `files: { [filePath: string]: FileMetadata }`
- [ ] Add `FSCKReport` interface:
  - `isHealthy: boolean`
  - `errors: FSCKError[]`
  - `repairs: string[]` (suggested fixes)
  - `timestamp: number`
- [ ] Add `GarbageCollectionConfig` interface:
  - `enabled: boolean`
  - `retentionDays: number`
  - `maxFullCopies: number` (default 10)
  - `autoRun: boolean`
- [ ] Update Manifest interface để support metadata fields
- [ ] Unit test: All new interfaces properly typed

---

## Incremental Scanning (16 hours)

**Goal**: Implement lazy file hashing (only modified files)

### Design & Setup (2 hours)
- [ ] Design metadata cache format (JSON structure)
- [ ] Decide cache location: `.ai-track/metadata-cache.json`
- [ ] Design algorithm: file mtime/size comparison → detect changes
- [ ] Create `src/core/incremental-scan.ts` skeleton

### Implementation (10 hours)
- [ ] Implement `loadMetadataCache()`: read cache from disk
- [ ] Implement `saveMetadataCache(cache)`: write cache to disk
- [ ] Implement `getFileMetadata(filePath)`: get file mtime/size/hash
- [ ] Implement `hasFileChanged(filePath, cachedMetadata)`: compare mtime/size
- [ ] Implement `getModifiedFiles(prevCache, currentFiles)`: return list of changed files
- [ ] Implement `computeSelectiveHashes(files)`: only hash changed files
- [ ] Implement cache corruption detection + fallback to full scan
- [ ] Handle edge cases:
  - File moved (same hash, different path)
  - File modified but same size (hash required)
  - Cache older than file (recalculate)

### Integration (2 hours)
- [ ] Update `src/core/snapshot.ts` to accept `useIncrementalScan` flag
- [ ] Update `src/core/compare.ts` to use incremental cache
- [ ] Ensure backward compatibility (old snapshots still work)

### Testing (2 hours)
- [ ] Write unit test: cache load/save correctness
- [ ] Write unit test: change detection accuracy
- [ ] Write unit test: hash computation (incremental vs full)
- [ ] Write unit test: cache corruption handling
- [ ] Benchmark: 1000 files, full scan vs incremental (target: > 50% faster)

---

## File System Consistency Check (16 hours)

**Goal**: Implement FSCK command to detect & repair corruption

### Design & Setup (2 hours)
- [ ] Design FSCK checks:
  1. File exists in storage
  2. File hash matches manifest
  3. File size matches manifest
  4. Manifest structure valid
  5. Orphan files (in storage, not in manifest)
- [ ] Design repair suggestions
- [ ] Create `src/core/fsck.ts` skeleton

### Implementation (10 hours)
- [ ] Implement `loadManifest()`: read + validate structure
- [ ] Implement `verifyFileIntegrity(filePath, expectedHash)`: hash & compare
- [ ] Implement `detectOrphanFiles()`: find files not in manifest
- [ ] Implement `detectCorruption()`: size/hash mismatch
- [ ] Implement `generateRepairSuggestions()`: output: remove orphan, rebuild cache, etc.
- [ ] Implement `repairCorruption()`: actually fix issues (with confirmation)
- [ ] Handle edge cases:
  - Partial corruption (some files OK, some not)
  - Missing files (in manifest but not storage)
  - Manifest file itself corrupted

### Command & CLI (2 hours)
- [ ] Create `src/commands/fsck.ts`:
  - `ai-track fsck` (report only)
  - `ai-track fsck --repair` (actually fix)
  - Output: table format (file, status, issue, suggestion)

### Testing (2 hours)
- [ ] Write unit test: FSCK detection (create corrupted scenarios)
- [ ] Write unit test: Repair functionality
- [ ] Write integration test: corrupt file → fsck → repair → verify
- [ ] Manual test: real corruption scenarios

---

## Garbage Collection (12 hours)

**Goal**: Implement GC to reduce storage (compress old snapshots)

### Design & Setup (2 hours)
- [ ] Design retention policy:
  - Keep last N full copies
  - Convert old snapshots to delta chain (require Phase 4 delta.ts)
  - Remove orphan files
  - Compress metadata caches
- [ ] Design GC config storage
- [ ] Create `src/core/gc.ts` skeleton

### Implementation (8 hours)
- [ ] Implement `selectSnapshotsForGC()`: which snapshots to compress
- [ ] Implement `compressSnapshot()`: convert to delta (or mark for delta compression)
- [ ] Implement `removeOrphanFiles()`: clean up unused files
- [ ] Implement `compressMetadataCaches()`: remove old caches
- [ ] Implement `estimateStorageSavings()`: report expected freed space
- [ ] Add config to `src/core/config.ts`:
  - `gc.enabled`
  - `gc.retentionDays`
  - `gc.maxFullCopies`
  - `gc.autoRun`
- [ ] Handle edge cases:
  - Don't GC if only snapshot (prevent data loss)
  - GC on empty project (no-op)
  - GC with corrupted snapshots (skip or repair first)

### Command & CLI (1 hour)
- [ ] Create `src/commands/gc.ts`:
  - `ai-track gc` (run GC)
  - `ai-track gc --dry-run` (report without executing)
  - `ai-track gc --config` (show/set retention policy)
  - Output: freed space, time taken, snapshots remaining

### Testing (1 hour)
- [ ] Write unit test: snapshot selection for GC
- [ ] Write integration test: GC full cycle
- [ ] Benchmark: GC on 10000+ files (target: < 5 seconds)
- [ ] Manual test: verify storage reduction

---

## Integration & Testing (12 hours)

**Goal**: Ensure Phase 1 works with existing code

### Integration (6 hours)
- [ ] Update `src/core/snapshot.ts`:
  - Add optional `useIncrementalScan` flag
  - Call `getModifiedFiles()` if flag enabled
  - Fall back to full scan if cache missing
- [ ] Update `src/core/compare.ts`:
  - Use metadata cache for performance (optional)
  - Maintain same comparison logic
- [ ] Update `src/core/rollback.ts`:
  - Call FSCK before restore (verify integrity)
  - Report issues to user
- [ ] Update `src/core/state.ts`:
  - Track reflog entry for snapshot creation (prepare for Phase 3)
- [ ] Ensure all Phase 1 modules use consistent error handling
- [ ] Add new commands to `src/cli.ts`:
  - Register `fsck` command
  - Register `gc` command
  - Register `delta-info` command (placeholder, Phase 4 will fill)

### Compatibility Testing (2 hours)
- [ ] Test: Old snapshot (no metadata) still works
- [ ] Test: Mixed snapshots (some with metadata, some without)
- [ ] Test: Migration path (add metadata to existing snapshots)

### Performance Testing (2 hours)
- [ ] Benchmark: Incremental scan (1000 files, target: 50-70% faster)
- [ ] Benchmark: FSCK on large project (target: < 5s)
- [ ] Benchmark: GC on 10000+ file project (target: < 5s)
- [ ] Compare before/after Phase 1 (regression test)

### Integration Tests (2 hours)
- [ ] Write integration test: Create snapshot → check metadata cache created
- [ ] Write integration test: Modify file → incremental scan detects change
- [ ] Write integration test: Corrupt file → FSCK detects → repair works
- [ ] Write integration test: Run GC → old snapshots compressed → verify
- [ ] Run full test suite: `npm test` (all existing tests still pass)

---

## Documentation (4 hours)

- [ ] Update `README.md`:
  - Add section: "Performance Improvements (Phase 1)"
  - Document incremental scan (benefits, when used)
  - Document FSCK (corruption detection, repair)
  - Document GC (storage optimization)
- [ ] Add usage examples:
  ```bash
  ai-track fsck                 # Check integrity
  ai-track fsck --repair        # Auto-repair
  ai-track gc --dry-run         # Estimate cleanup
  ai-track gc                   # Run cleanup
  ```
- [ ] Document metadata cache format (if needed for troubleshooting)
- [ ] Document GC retention policy (how to configure)
- [ ] Create troubleshooting guide:
  - "Cache corrupted? Here's how to recover"
  - "FSCK reports errors? Here's what to do"
  - "GC deleted my snapshots! How to recover?"

---

## Phase 1 Sign-off (2 hours)

- [ ] All 48 tasks above completed
- [ ] Run full test suite: `npm test` (all tests pass)
- [ ] Performance benchmarks meet targets (> 50% faster scan)
- [ ] Zero backward compatibility issues
- [ ] Code reviewed and approved
- [ ] PR merged to main branch
- [ ] Tag release (if Phase 1 released separately)
- [ ] Mark checklist complete

---

## Notes & Risks

**Risks**:
1. Cache corruption → fallback to full scan
2. FSCK repairs might destroy data if wrong → require user confirmation
3. GC might compress wrong snapshots → test extensively
4. Performance degradation if incremental scan overhead too high

**Mitigations**:
1. Extensive unit tests (> 95% coverage)
2. Always backup before GC/repair
3. `--dry-run` mode for all destructive operations
4. Clear user warnings/confirmations

**Next Phase**: Once Phase 1 complete, move to Phase 2 (Safety & Conflict Management)

---

**Created**: 2026-04-02
**Phase**: 1 of 4
**Estimate**: 5-7 days (1 engineer)
