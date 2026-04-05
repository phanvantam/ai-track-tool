# Phase 4 Detailed Checklist: Advanced Features

> Lưu ý: file này giữ breakdown công việc. Trạng thái thực thi chuẩn xem `docs/checklists/improvements-master-checklist.md`.

**Mục tiêu**: Implement 10 tính năng nâng cao (delta compression, cherry-pick, patches, stash, binary handling, etc.)

**Ước tính**: 8-12 ngày (2-3 engineers, có thể parallelization)

**Dependency**: Phases 1-3 (can work on multiple modules in parallel)

---

## 📋 Overview

| Task Group | Count | Est. Time |
|-----------|-------|-----------|
| Preparation | 3 | 4 hours |
| Delta Compression | 8 | 16 hours |
| Cherry-pick | 6 | 12 hours |
| Patch Format | 6 | 12 hours |
| Directory Rename | 4 | 8 hours |
| Binary Handling | 6 | 10 hours |
| Stash | 7 | 12 hours |
| Ignore Validation | 7 | 10 hours |
| Symlink Support | 7 | 12 hours |
| Case Sensitivity | 7 | 12 hours |
| Shallow/Sparse | 7 | 14 hours |
| Integration | 10 | 16 hours |
| Documentation | 8 | 6 hours |
| Sign-off | 1 | 2 hours |
| **Total** | **99** | **156 hours** |

---

## Preparation (4 hours)

- [ ] Review `docs/plans/improvements-phase-4.md` toàn bộ
- [ ] Decide xdiff implementation: npm package vs custom
- [ ] Setup feature branch: `git checkout -b feature/phase-4-advanced`
- [ ] Create GitHub issue for Phase 4 (break into sub-issues by feature)

---

## Delta Compression (16 hours)

**Goal**: Store diffs instead of full files (60-80% storage reduction)

### Setup (2 hours)
- [ ] Choose xdiff implementation (evaluate npm packages)
- [ ] Create `src/core/delta.ts` skeleton
- [ ] Design delta storage structure

### Implementation (10 hours)
- [ ] Implement `computeDelta(sourceBuffer, targetBuffer)`: Return delta
- [ ] Implement `applyDelta(sourceBuffer, deltaBuffer)`: Reconstruct target
- [ ] Add parent snapshot reference to Manifest
- [ ] Update `src/core/snapshot.ts`:
  - When creating snapshot, check parent exists
  - Compute delta if parent available
  - Fallback to full copy if parent missing
- [ ] Implement delta reconstruction with caching:
  - Lazy reconstruction (only on demand)
  - Cache reconstructed files (not re-compute)
  - Estimate performance impact
- [ ] Implement fallback (if delta corrupted, use full copy)
- [ ] Update `src/core/compare.ts` to handle delta reconstruction
- [ ] Update `src/core/rollback.ts` for delta-based files

### Testing & Commands (3 hours)
- [ ] Create `src/commands/delta-info.ts`:
  - Show delta chain
  - Show compression ratio
  - Show storage savings
  - Option: `--optimize` to compress old snapshots
- [ ] Write unit test: delta computation accuracy
- [ ] Write unit test: reconstruction correctness
- [ ] Write unit test: delta apply idempotency
- [ ] Benchmark: 1000 files, verify 60-80% reduction
- [ ] Manual test: large binary files, text files, mixed

### Integration (1 hour)
- [ ] Ensure Phase 1-3 still work with delta
- [ ] No performance regression on small projects

---

## Cherry-pick (12 hours)

**Goal**: Rollback individual hunks, not entire files

### Setup (1 hour)
- [ ] Create `src/core/hunk-parser.ts` skeleton
- [ ] Create `src/core/hunk-applicator.ts` skeleton
- [ ] Design hunk selection UI (interactive menu)

### Implementation (8 hours)
- [ ] Implement `parseHunks(unifiedDiff)`: Return structured hunks
  - Each hunk: startLineA, countA, startLineB, countB, lines[]
  - Handle edge cases (no newline at EOF, etc.)
- [ ] Implement `applyHunk(fileContent, hunk)`: Apply single hunk
- [ ] Implement `detectConflict(fileContent, hunk)`: Check if hunk applicable
  - Context lines must match
  - Added lines must not exist
  - Deleted lines must exist
- [ ] Implement `selectivelyApplyHunks(fileContent, selectedHunks)`: Apply subset
- [ ] Create `src/commands/cherry-pick.ts`:
  - Show available hunks
  - Let user select (interactive: y/n for each hunk)
  - Apply selected hunks
  - Report conflicts
- [ ] Handle conflict resolution:
  - Ask user to resolve manually
  - Offer skip this hunk
  - Offer use 3-way merge (Phase 2)

### Testing (2 hours)
- [ ] Write unit test: hunk parsing (various diff formats)
- [ ] Write unit test: hunk application success
- [ ] Write unit test: conflict detection accuracy
- [ ] Write unit test: edge cases (empty file, single line)
- [ ] Write integration test: real cherry-pick scenario
- [ ] Benchmark: parse/apply 100KB diff < 50ms

### Integration (1 hour)
- [ ] Integrate with Phase 2 transactions (rollback cherry-pick)
- [ ] Ensure hunk selection doesn't corrupt file

---

## Patch Format (12 hours)

**Goal**: Export/import diffs as standard patches

### Setup (1 hour)
- [ ] Design patch file format (unified diff + metadata header)
- [ ] Create `src/commands/patch-export.ts` skeleton
- [ ] Create `src/commands/patch-import.ts` skeleton

### Export Implementation (4 hours)
- [ ] Implement `generatePatch(snapshotA, snapshotB)`:
  - Compute diff (unified format)
  - Add metadata header (source, target, timestamp, stats)
  - Return as string or file
- [ ] Implement `addPatchMetadata(diff, metadata)`: Prepend header
- [ ] Create `src/commands/patch-export.ts` command:
  - Usage: `ai-track patch export <snapshot-a> <snapshot-b> > file.patch`
  - Options: `--include-metadata`, `--compression`
  - Output: valid unified diff that `patch` command can apply

### Import Implementation (4 hours)
- [ ] Implement `parsePatchFile(patchContent)`: Extract diff + metadata
- [ ] Implement `applyPatchToFile(fileContent, patch)`:
  - Use hunk applicator (or `patch` command-line)
  - Handle conflicts
  - Return result or error
- [ ] Create `src/commands/patch-import.ts` command:
  - Usage: `ai-track patch import < file.patch`
  - Options: `--3way` (use Phase 2 merge), `--reverse`
  - Apply patch to current state
  - Report result (success/conflicts)
- [ ] Implement 3-way merge for patches (if --3way):
  - Use base snapshot (if available)
  - Apply Phase 2 merge logic

### Testing (3 hours)
- [ ] Write unit test: patch export accuracy
- [ ] Write unit test: patch import correctness
- [ ] Write unit test: 3-way merge patches
- [ ] Write test: GNU patch command can apply exported patch
- [ ] Write test: reverse patch (B → A)
- [ ] Write test: partial/rejected apply
- [ ] Manual test: share patch between computers

### Integration (1 hour)
- [ ] Ensure patch format standard (can use with `patch` command)
- [ ] Metadata header doesn't break standard patch tools

---

## Directory Rename Detection (8 hours)

**Goal**: Detect folder moves, reduce false positives

### Implementation (6 hours)
- [ ] Create `src/core/directory-rename.ts`:
  - Implement hash-matching algorithm
  - Input: file changes (added, deleted, modified)
  - Output: directory renames with confidence
  - Algorithm: Group by path prefix, count hash matches, calculate confidence
- [ ] Implement 80% threshold:
  - If 80% of files in dir1/ match files in dir2/ → likely rename
- [ ] Add to comparison result: `directoryRenames: DirectoryRename[]`
- [ ] Update `src/core/compare.ts` to call directory rename detection
- [ ] Display rename in output (don't list individual adds/deletes)

### Testing (1 hour)
- [ ] Write unit test: directory rename detection accuracy
- [ ] Write unit test: false positive rate (target: < 5%)
- [ ] Write test: nested directory renames
- [ ] Write test: partial directory renames
- [ ] Benchmark: detection < 50ms

### Integration (1 hour)
- [ ] Integrate into compare output
- [ ] Ensure Phase 1-3 not affected

---

## Binary File Handling (10 hours)

**Goal**: Skip diff for binary, treat as opaque

### Setup (1 hour)
- [ ] Create `src/core/binary-detector.ts` skeleton
- [ ] Design binary detection strategy (magic bytes + extension)

### Detection Implementation (3 hours)
- [ ] Implement `isBinaryFile(filePath, buffer)`:
  - Check magic bytes (first 512 bytes)
  - Fallback to extension-based detection
  - Return: { isBinary: boolean, type: 'image' | 'archive' | 'executable' | 'document' | 'other' }
- [ ] Define binary magic bytes:
  - JPEG: 0xFF 0xD8 0xFF
  - PNG: 0x89 0x50 0x4E 0x47
  - PDF: 0x25 0x50 0x44 0x46
  - ZIP: 0x50 0x4B 0x03 0x04
  - ELF: 0x7F 0x45 0x4C 0x46
  - And more...
- [ ] Define binary extensions (.bin, .exe, .dll, .so, .jpg, .png, .pdf, etc.)

### Integration into Core (4 hours)
- [ ] Update `src/core/snapshot.ts`:
  - Detect binary during snapshot
  - Mark in metadata: `filetype: 'binary' | 'text'`
- [ ] Update `src/core/diff.ts`:
  - For binary files: Output "Binary files differ"
  - Don't generate unified diff
- [ ] Update `src/core/compare.ts`:
  - Binary files: Only track hash change
  - Don't attempt merge/rollback on binary
- [ ] Update `src/core/rollback.ts`:
  - Binary rollback: Copy entire file
  - No merge attempt
- [ ] Update manifest to store `filetype` field

### Testing (2 hours)
- [ ] Write unit test: binary detection accuracy (> 95%)
- [ ] Write test: various binary formats (images, PDFs, executables)
- [ ] Write test: rollback binary files
- [ ] Write test: mixed text + binary project
- [ ] Manual test: real binary files (from GitHub repos)

---

## Stash (12 hours)

**Goal**: Temporary storage for uncommitted changes

### Setup (1 hour)
- [ ] Design stash storage: `.ai-track/stashes/`
- [ ] Design stash naming: `stash@{0}`, `stash@{1}`, etc.
- [ ] Create `src/core/stash.ts` skeleton

### Implementation (8 hours)
- [ ] Implement `stashSave(message)`:
  - Compute diff: current state vs active snapshot
  - Save diff + metadata to file
  - Return stash ID
- [ ] Implement `stashApply(stashId)`:
  - Load stash diff
  - Apply to current state
  - Detect conflicts
  - Keep stash (can apply multiple times)
- [ ] Implement `stashPop(stashId)`:
  - Apply stash + delete stash
  - Verify deletion
- [ ] Implement `stashList()`:
  - List all stashes
  - Show: timestamp, message, stats (changes count)
- [ ] Implement `stashShow(stashId)`:
  - Show stash diff
  - Show stats
- [ ] Implement stash pruning:
  - Auto-cleanup stashes older than N days (configurable)
  - Or manual cleanup
- [ ] Handle conflict in stash apply:
  - Detect conflicts (if current state differs from base)
  - Report conflicts to user
  - Offer manual resolution

### Commands (2 hours)
- [ ] Create `src/commands/stash.ts`:
  - `ai-track stash save "<message>"` → Save stash
  - `ai-track stash apply [<stash-id>]` → Apply (default: latest)
  - `ai-track stash pop [<stash-id>]` → Apply + delete
  - `ai-track stash list` → List all stashes
  - `ai-track stash show [<stash-id>]` → Show diff
  - `ai-track stash drop [<stash-id>]` → Delete
  - `ai-track stash clear` → Delete all stashes

### Testing (1 hour)
- [ ] Write unit test: stash save/apply round-trip
- [ ] Write unit test: pop deletes stash
- [ ] Write unit test: list/show accuracy
- [ ] Write unit test: multiple stashes management
- [ ] Write test: conflict detection in stash apply
- [ ] Write test: stash cleanup/pruning
- [ ] Benchmark: all stash operations < 100ms

---

## Ignore Rule Validation (10 hours)

**Goal**: Validate ignore rules, catch typos early

### Setup (1 hour)
- [ ] Review existing `src/core/ignore.ts`
- [ ] Design validation rules
- [ ] Design error reporting format

### Validation Implementation (5 hours)
- [ ] Enhance ignore parser with validation:
  - Check regex/glob syntax validity
  - Check for circular patterns
  - Warn: too broad patterns (e.g., `.` alone)
  - Warn: redundant rules (nested patterns)
  - Warn: conflicting rules (both include + exclude)
- [ ] Implement error types:
  - `InvalidRegex`: Pattern has invalid regex syntax
  - `TooBoard`: Pattern too broad (potential data loss)
  - `SyntaxError`: Pattern format error
  - `CircularPattern`: Pattern includes itself
  - `Redundant`: Rule made redundant by earlier rule
- [ ] Implement auto-fix suggestions:
  - Common typos: `*.txtt` → `*.txt`
  - Pattern issues: suggest correct format
  - Redundancy: suggest consolidated rule
- [ ] Implement test mode:
  - Load ignore rules
  - Test against sample paths
  - Report mismatches (e.g., excluded path should match rule)

### Command & Integration (2 hours)
- [ ] Create `src/commands/ignore-validate.ts`:
  - Load `.ai-track-ignore` file
  - Run validation
  - Output errors + suggestions
  - Option: `--auto-fix` (apply suggestions)
- [ ] Hook into `.ai-track-ignore` file write:
  - After user saves file, validate automatically
  - Report errors (warning mode by default)
  - Could have strict mode (error mode)

### Testing (2 hours)
- [ ] Write unit test: validation accuracy (catch 90%+ errors)
- [ ] Write test: false positive rate (< 5%)
- [ ] Write test: auto-fix suggestions quality
- [ ] Benchmark: validation < 10ms per file
- [ ] Manual test: common typos and issues

---

## Symlink Support (12 hours)

**Goal**: Track symlinks (don't follow), handle properly in rollback

### Setup (1 hour)
- [ ] Review Node.js `fs.lstat()` API
- [ ] Design symlink metadata storage
- [ ] Create `src/core/symlink.ts` skeleton

### Detection & Storage (4 hours)
- [ ] Implement symlink detection in `src/core/snapshot.ts`:
  - Use `fs.lstat()` instead of `fs.stat()` (don't follow symlinks)
  - Check `isSymbolicLink()`
  - Store target path (not content)
- [ ] Add `SymlinkInfo` to `src/types.ts`:
  - `filePath: string`
  - `target: string` (symlink destination, can be relative/absolute)
  - `hash: string` (hash of target string, not content)
  - `isAbsolute: boolean`
- [ ] Update manifest to track symlinks separately
- [ ] Implement `readSymlinkTarget()`: Get target path
- [ ] Implement `isSymlinkBroken()`: Check if target exists
- [ ] Store even broken symlinks (preserve state)

### Comparison & Rollback (4 hours)
- [ ] Update `src/core/compare.ts`:
  - Detect symlink changes (target changed)
  - Mark as "modified" if target differs
  - Compare targets, not content
- [ ] Update `src/core/rollback.ts`:
  - Detect current symlink
  - If target differs from snapshot: remove + recreate
  - Use `fs.unlink()` + `fs.symlink()`
  - Preserve symlink even if broken
- [ ] Handle edge cases:
  - Relative vs absolute paths
  - Cross-platform differences (Windows junction points)
  - Circular symlinks (A → B → A)

### Circular Symlink Detection (2 hours)
- [ ] Implement cycle detection:
  - Walk symlink chain
  - Detect if we encounter same path twice
  - Prevent infinite loops
- [ ] Report circular symlinks to user (warning)
- [ ] Skip traversal of circular symlinks

### Testing (1 hour)
- [ ] Write unit test: symlink detection
- [ ] Write test: circular symlink handling (no infinite loop)
- [ ] Write test: rollback recreates symlink correctly
- [ ] Write test: broken symlinks preserved
- [ ] Cross-platform test (Linux/macOS)

---

## Case Sensitivity (12 hours)

**Goal**: Handle file systems with different case sensitivity (Linux vs macOS)

### Setup (1 hour)
- [ ] Research file system case sensitivity (Linux = sensitive, macOS = insensitive by default)
- [ ] Design case sensitivity detection
- [ ] Create `src/core/case-sensitivity.ts` skeleton

### Detection & Configuration (4 hours)
- [ ] Implement `detectCaseSensitivity()`:
  - Try creating files: `testfile.txt` and `TESTFILE.TXT`
  - If only one exists: case-insensitive
  - If two separate files: case-sensitive
  - Return: `{ caseInsensitive: boolean, casePreserving: boolean }`
- [ ] Add to `.ai-track/config.json`:
  - `filesystemConfig.caseInsensitive: boolean`
  - `filesystemConfig.casePreserving: boolean`
  - `filesystemConfig.autoDetected: boolean` (user can override)
- [ ] Allow manual override (user can set in config)

### Path Normalization & Comparison (4 hours)
- [ ] Implement `normalizePathForComparison(path)`:
  - If case-insensitive: return `path.toLowerCase()`
  - Else: return as-is
- [ ] Implement `detectCaseRename(oldPath, newPath)`:
  - If only casing differs: return true
  - For case-insensitive systems: may be actual rename or just case change
  - Decision: treat as rename or ignore (configurable)
- [ ] Update `src/core/compare.ts`:
  - Apply path normalization when needed
  - Detect case renames
- [ ] Implement case conflict detection:
  - Two files: `File.txt` and `file.txt` in same dir
  - On case-insensitive: conflict
  - On case-sensitive: allowed (different files)
  - Warn user about cross-platform issues

### Integration (2 hours)
- [ ] Update snapshot creation (store casing)
- [ ] Update compare logic (apply normalization)
- [ ] Update rollback (respect original casing)
- [ ] Handle cross-platform transfers (warn about conflicts)

### Testing (1 hour)
- [ ] Write unit test: case detection (various systems)
- [ ] Write test: case rename handling
- [ ] Write test: case conflict detection
- [ ] Write test: rollback with case sensitivity
- [ ] Manual test: cross-platform scenarios (create on macOS, use on Linux)

---

## Shallow Clone & Sparse Checkout (14 hours)

**Goal**: Reduce storage by keeping only recent snapshots or specific directories

### Setup (2 hours)
- [ ] Design shallow config: `{ shallow: true, depth: N }`
- [ ] Design sparse config: `{ sparse: true, patterns: string[] }`
- [ ] Create `src/core/shallow.ts` skeleton

### Shallow Clone Implementation (6 hours)
- [ ] Implement shallow config in `.ai-track/config.json`:
  - `shallow.enabled: boolean`
  - `shallow.depth: number` (keep last N snapshots)
- [ ] Update `src/core/snapshot.ts`:
  - Respect shallow config
  - Only keep last N snapshots
  - Mark older snapshots as "shallow" (not available locally)
- [ ] Implement `fetchHistory(fromRemote, startDate)`:
  - Fetch older snapshots from remote
  - Populate missing history
  - Convert shallow → full gradually
- [ ] Handle snapshot queries on shallow clone:
  - Query recent snapshots: available
  - Query old snapshots: not available (suggest fetch-history)
- [ ] Create `src/commands/shallow.ts`:
  - `ai-track shallow config` → Show current config
  - `ai-track shallow enable --depth 10` → Enable shallow (keep last 10)
  - `ai-track shallow disable` → Convert to full clone
  - `ai-track fetch-history --since <date>` → Fetch older snapshots

### Sparse Checkout Implementation (5 hours)
- [ ] Implement sparse config in `.ai-track/config.json`:
  - `sparse.enabled: boolean`
  - `sparse.patterns: string[]` (directories to include)
  - Patterns: glob-style (e.g., `src/**`, `docs/`, `*.json`)
- [ ] Update `src/core/snapshot.ts`:
  - When sparse: only snapshot files matching patterns
  - Mark snapshot as sparse in metadata
- [ ] Update `src/core/compare.ts`:
  - For sparse: only compare files in patterns
  - Significant performance improvement if patterns exclude 80% of files
- [ ] Update `src/core/rollback.ts`:
  - Restore only files in patterns
  - Don't touch other directories
- [ ] Update `src/core/watch.ts`:
  - For sparse: only monitor directories in patterns
  - Reduce CPU/memory usage
- [ ] Create `src/commands/sparse.ts`:
  - `ai-track sparse config` → Show current patterns
  - `ai-track sparse add <pattern>` → Add directory
  - `ai-track sparse remove <pattern>` → Remove directory
  - `ai-track sparse reset` → Include everything

### Testing (1 hour)
- [ ] Write unit test: shallow config application
- [ ] Write test: sparse pattern matching
- [ ] Write test: fetch-history restores older snapshots
- [ ] Write test: compare accuracy (only affected dirs)
- [ ] Benchmark: shallow restore < 50% storage
- [ ] Benchmark: sparse checkout < 20% storage (if 80% excluded)
- [ ] Benchmark: watch CPU/memory reduction

---

## Integration & Testing (16 hours)

**Goal**: Ensure all Phase 4 features work together + backward compatible

### Feature Integration (6 hours)
- [ ] Verify all 10 Phase 4 modules don't conflict
- [ ] Test delta compression with cherry-pick
- [ ] Test patches with stash
- [ ] Test shallow/sparse with other features
- [ ] Test binary handling with cherry-pick (should skip binary)
- [ ] Test symlink support with case sensitivity
- [ ] Add all Phase 4 commands to `src/cli.ts`

### Backward Compatibility (2 hours)
- [ ] Test: Old snapshots (no Phase 4 metadata) work
- [ ] Test: Gradual adoption (some features enabled, some not)
- [ ] Test: Migration (add Phase 4 features to existing projects)

### Comprehensive Testing (5 hours)
- [ ] Write integration test: All 10 features together
- [ ] Write end-to-end test: entire pipeline
- [ ] Performance regression test (Phase 1-4 overall)
- [ ] Stress test: 10000+ files, all Phase 4 features enabled
- [ ] Load test: 100 concurrent operations with Phase 4
- [ ] Chaos test: simulate crashes, recovery works

### Performance Testing (3 hours)
- [ ] Benchmark: Cherry-pick on 1000-file project
- [ ] Benchmark: Patch export/import on large history
- [ ] Benchmark: Stash operations on large projects
- [ ] Benchmark: Symlink handling (no regression)
- [ ] Benchmark: Case sensitivity handling (no regression)
- [ ] Overall: No slowdown on basic operations

---

## Documentation (6 hours)

- [ ] Update `README.md`:
  - Add section: "Advanced Features (Phase 4)"
  - Document all 10 features (overview + examples)
  - Link to detailed guides
- [ ] Create detailed guides:
  - "Cherry-picking Changes" (hunk selection, conflict resolution)
  - "Working with Patches" (export/import, 3-way merge)
  - "Using Stash for Context Switching"
  - "Storage Optimization" (delta, shallow, sparse)
  - "Cross-Platform Tips" (case sensitivity, symlinks, binary files)
- [ ] Add usage examples for each command
- [ ] Document performance characteristics
- [ ] Create troubleshooting guide for Phase 4 features

---

## Phase 4 Sign-off (2 hours)

- [ ] All 99 tasks completed
- [ ] All unit tests pass (npm test)
- [ ] All integration tests pass
- [ ] All 10 advanced features working correctly
- [ ] No performance regressions
- [ ] No data corruption in testing
- [ ] Backward compatibility verified
- [ ] Code reviewed and approved
- [ ] PR merged to main
- [ ] Tag release: v2.0.0 (major feature update)
- [ ] Mark checklist complete

---

## Notes & Risks

**Risks**:
1. Too many features → complexity, bugs
2. Performance regressions (Phase 4 heavier than Phase 1-3)
3. Edge cases in binary detection, symlink handling, case sensitivity
4. Storage optimization (delta, shallow, sparse) might make recovery harder

**Mitigations**:
1. Modular implementation, feature flags (disable if needed)
2. Extensive benchmarking, performance targets
3. Comprehensive unit tests (coverage > 95%)
4. Always backup before optimization features
5. Clear documentation of limitations

**Parallelization**:
- Can implement multiple Phase 4 modules in parallel:
  - Engineer A: Delta compression + Cherry-pick
  - Engineer B: Patch format + Directory rename
  - Engineer C: Binary handling + Stash
  - Engineer D: Ignore validation + Symlink + Case sensitivity
  - Engineer E: Shallow/Sparse
- Requires good coordination + frequent integration testing

---

**Created**: 2026-04-02
**Phase**: 4 of 4
**Estimate**: 8-12 days (2-3 engineers, with parallelization)
