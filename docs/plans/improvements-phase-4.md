# Kế hoạch cải tiến Phase 4: Tính năng nâng cao (Advanced Features)

## 1. Context & Goals

### Mục tiêu kinh doanh
- Hoàn thiện trải nghiệm người dùng với workflows nâng cao
- Tối ưu hóa dung lượng lưu trữ (delta compression, sparse checkout)
- Tăng cường tính tương thích (patch format, symlink, case sensitivity)
- Cải thiện độ tin cậy (binary handling, directory rename detection)
- Đạt gần ngang Git về tính năng (ngoại trừ branching)

### Phạm vi Phase 4
Phát triển 10 tính năng nâng cao, không phụ thuộc vào Phase 1-3 nhưng tổng hợp lợi ích từ chúng:
1. Delta compression (storage optimization)
2. Cherry-pick (hunk-level rollback)
3. Patch format (export/import diffs)
4. Directory rename detection (UX improvement)
5. Better binary file handling (robustness)
6. Stash / temporary storage (workflow)
7. Ignore rule validation (safety)
8. Symlink support (compatibility)
9. Case sensitivity handling (cross-platform)
10. Shallow clone / sparse checkout (storage)

---

## 2. Hiện trạng (Current State)

### Giới hạn hiện tại
- **Snapshot**: Lưu full file copy, không compression → dung lượng lớn
- **Rollback**: Toàn bộ file hoặc không gì → UX kém, không granular control
- **Binary files**: Treated như text, diff không có ý nghĩa
- **Symlinks**: Ignored hoàn toàn
- **Directory rename**: Không detect → cảnh báo giả tạo (false positives)
- **Ignore rules**: Không validate syntax, bugs khó phát hiện
- **Export**: Không có patch format chuẩn → khó chia sẻ changes
- **Case sensitivity**: Hardcoded logic, không handle macOS/Linux khác nhau
- **Stash**: Không có cách lưu trữ tạm thời changes

### Tác động lên core logic
- Storage module: Chỉ copy full files
- Rollback module: All-or-nothing strategy
- Compare module: Không phân biệt binary vs text
- Ignore module: Basic string matching
- State management: Không có stash storage

---

## 3. Phương án đề xuất (Proposed Solutions)

### 3.1 Delta Compression (Giảm dung lượng)

**Mô tả:**
Thay vì lưu full file copy, chỉ lưu phần khác biệt (delta) giữa snapshot hiện tại và previous snapshot. Giảm dung lượng 60-80% cho nhiều trường hợp.

**Cách thực hiện:**
- Sử dụng algorithm xdiff (giống Git) để tạo delta
- Lưu delta trong `.ai-track/deltas/` thay vì `.ai-track/snapshots/`
- Manifest chứa reference: `parent_snapshot_id` + `delta_hash`
- Khi rollback/compare, reconstruct file từ delta chain
- Fallback: Nếu delta file mất, fallback sang full file copy

**Data structure:**
```typescript
interface SnapshotDelta {
  snapshotId: string;
  parentSnapshotId: string | null;  // null = full copy
  fileDeltas: {
    [filePath: string]: {
      deltaHash: string;
      originalHash: string;
      compressedSize: number;
      uncompressedSize: number;
    };
  };
  createdAt: number;
  metadata?: object;
}
```

**Verification:**
- Reconstruct file từ delta chain = original file
- Storage usage < 20% của full copy strategy
- Performance: Reconstruct time < 100ms cho file 10MB

---

### 3.2 Cherry-pick (Rollback từng hunk)

**Mô tả:**
Người dùng có thể rollback từng hunk (paragraph) của file, không cần rollback toàn bộ file. Đối với các file thay đổi nhiều chỗ, chỉ revert phần cần thiết.

**Cách thực hiện:**
- Parse unified diff thành hunks
- User chọn hunks muốn revert
- Apply selected hunks lên current file
- Verify no conflicts sau apply

**Data structure:**
```typescript
interface HunkSelection {
  filePath: string;
  hunks: {
    hunkIndex: number;
    selected: boolean;
  }[];
}

interface CherryPickResult {
  success: boolean;
  appliedHunks: number;
  conflicts?: {
    filePath: string;
    conflictMarkers: string[];
  }[];
}
```

**Verification:**
- Apply hunks tạo file valid
- Conflict detection accurate
- File integrity check sau apply
- Undo cherry-pick có thể thực hiện (via stash or transaction)

---

### 3.3 Patch Format (Export/Import diffs)

**Mô tả:**
Export changes giữa 2 snapshots dưới dạng unified diff patch (chuẩn Git format), cho phép chia sẻ/apply trên system khác.

**Cách thực hiện:**
- Tạo unified diff giữa snapshot A → B
- Export: `patch create <snapshot-a> <snapshot-b> > changes.patch`
- Import: `patch apply changes.patch` (apply lên current state)
- Support 3-way merge patch (giống `git apply`)

**Patch format:**
```
--- a/path/to/file.txt
+++ b/path/to/file.txt
@@ -1,3 +1,4 @@
 context line
-removed line
+added line
 context line
```

**Data structure:**
```typescript
interface PatchMetadata {
  sourceSnapshot: string;
  targetSnapshot: string;
  timestamp: number;
  filesAffected: string[];
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}
```

**Verification:**
- Patch format = valid unified diff (can apply with `patch` command)
- Apply patch → recreate target snapshot state
- Support forward/reverse apply
- Conflict markers accurate khi có collision

---

### 3.4 Directory Rename Detection

**Mô tả:**
Detect khi directory bị rename (move), không cảnh báo false positives (deleted + added). Cải thiện UX khi user tổ chức lại folder structure.

**Cách thực hiện:**
- Sau khi compare, phát hiện pattern: `dir1/` → `dir2/` (files có path prefix match)
- Use hash matching: Nếu files trong `dir1/file.txt` và `dir2/file.txt` có hash giống nhau + cùng relative path → directory rename
- Threshold: 80% files match → classify as rename
- Mark in comparison result: `{ type: 'renamed', old: 'dir1', new: 'dir2' }`

**Heuristics:**
- File count giống nhau trong old/new dir
- Relative paths giống nhau (chỉ parent dir khác)
- File hashes match
- Rename happens atomically (cùng snapshot)

**Data structure:**
```typescript
interface DirectoryRename {
  oldPath: string;
  newPath: string;
  filesAffected: number;
  confidence: number;  // 0-1
  detection: 'hash_match' | 'path_pattern' | 'heuristic';
}

interface ComparisonResult {
  files: FileChange[];
  directoryRenames: DirectoryRename[];
}
```

**Verification:**
- Directory rename detected = no false positive added/removed files
- Confidence > 0.8 = reliable detection
- No confusion với actual file delete + add
- Performance: Detection < 50ms

---

### 3.5 Better Binary File Handling

**Mô tả:**
Chuyên biệt xử lý binary files (images, PDFs, .exe, etc.): không generate diff, chỉ track presence/change status.

**Cách thực hiện:**
- Detect binary: Check magic bytes (first 512 bytes), hoặc by extension
- Binary file tracking: `{ type: 'binary', hash, size, modified }`
- Rollback binary: Copy entire file (không merge)
- Diff output: `"Binary files differ"` (như Git)
- Don't try 3-way merge binary files

**Binary detection:**
```typescript
function isBinaryFile(filePath: string, buffer: Buffer): boolean {
  // Check magic bytes
  const magicBytes = [
    [0xFF, 0xD8, 0xFF],  // JPEG
    [0x89, 0x50, 0x4E, 0x47],  // PNG
    [0x47, 0x49, 0x46],  // GIF
    [0x25, 0x50, 0x44, 0x46],  // PDF
    [0x50, 0x4B, 0x03, 0x04],  // ZIP
  ];
  
  // Also check extension
  const binaryExtensions = ['.bin', '.exe', '.dll', '.so', '.jpg', '.png', '.gif', '.pdf'];
}
```

**Data structure:**
```typescript
interface BinaryFileInfo {
  filePath: string;
  size: number;
  hash: string;
  modified: boolean;
  type: 'image' | 'archive' | 'executable' | 'document' | 'other';
}
```

**Verification:**
- Binary detection accuracy > 95%
- Rollback binary files = exact copy
- Diff binary files = "Binary files differ"
- No merge attempt on binary
- Storage = efficient (no delta decompress attempt)

---

### 3.6 Stash / Temporary Storage

**Mô tả:**
Cho phép lưu trữ tạm thời current changes mà không commit snapshot. Người dùng có thể switch context (rollback) rồi apply lại stash sau.

**Workflow:**
```
1. User có uncommitted changes (current state vs snapshot)
2. stash save → lưu diff vào stash storage
3. rollback → revert tất cả changes
4. ... do other work ...
5. stash apply → apply changes lại
6. stash pop → apply + delete stash
7. stash list → xem danh sách stashes
```

**Cách thực hiện:**
- Lưu stash trong `.ai-track/stashes/`
- Mỗi stash = diff + metadata (timestamp, message, snapshot reference)
- Multiple stashes: `stash@{0}`, `stash@{1}`, etc.
- Stash can apply with/without conflict resolution

**Data structure:**
```typescript
interface Stash {
  stashId: string;
  message: string;
  timestamp: number;
  baseSnapshot: string;  // snapshot when stash was created
  diff: string;  // unified diff format
  stats: {
    filesAffected: number;
    insertions: number;
    deletions: number;
  };
}

interface StashStorage {
  stashes: Stash[];
  current: number;  // index of last accessed stash
}
```

**Verification:**
- Stash save → diff capture accurate
- Stash apply → file state = original changes
- Stash pop → stash deleted after apply
- Conflict handling consistent with merge
- Multiple stashes manageable

---

### 3.7 Ignore Rule Validation

**Mô tả:**
Validate `.ai-track-ignore` rules syntax khi file được written. Phát hiện typos, invalid patterns sớm.

**Cách thực hiện:**
- Parse ignore file theo gitignore format
- Validate mỗi rule: check regex syntax, pattern format
- Report errors: line number, rule, reason
- Test rule against sample paths (unit test style)
- Auto-fix suggestions (nếu có typo common)

**Validation rules:**
- Regex syntax valid
- No circular patterns
- Pattern not too broad (warning nếu `.` alone)
- Escaping correct
- Comments valid (line starts with `#`)

**Error reporting:**
```typescript
interface IgnoreValidationError {
  line: number;
  rule: string;
  error: 'invalid_regex' | 'too_broad' | 'syntax_error' | 'unknown';
  message: string;
  suggestion?: string;
}
```

**Verification:**
- Validation catches 90%+ of common errors
- False positive rate < 5%
- Performance: Validate file < 10ms
- Auto-fix suggestions helpful

---

### 3.8 Symlink Support

**Mô tả:**
Properly handle symbolic links: track them separately (don't follow), can rollback/restore symlinks.

**Cách thực hiện:**
- Detect symlink: `fs.lstat()` + `isSymbolicLink()`
- Store symlink info: `{ type: 'symlink', target, hash }`
- Hash = hash of target path (not content)
- Rollback symlink: Recreate symlink (don't copy content)
- Diff symlink: Track target change

**Data structure:**
```typescript
interface SymlinkInfo {
  filePath: string;
  type: 'symlink';
  target: string;  // symlink destination
  hash: string;  // hash of 'target' string
  isAbsolute: boolean;
}
```

**Special handling:**
- Circular symlinks: Detect + warn, don't follow
- Symlink outside project: Warn, store as relative if possible
- Broken symlinks: Track target, don't validate existence
- Cross-platform: Handle Windows junction points

**Verification:**
- Symlink detection accurate
- Rollback symlink creates correct link
- No infinite loops (circular symlink handling)
- Broken symlinks preserved
- Performance: No regression

---

### 3.9 Case Sensitivity Handling

**Mô tả:**
Handle file systems với case sensitivity khác nhau (Linux = case-sensitive, macOS = case-insensitive by default). Detect rename vs case change.

**Cách thực hiện:**
- Config: Store `caseInsensitive: boolean` per project
- Auto-detect: Check filesystem capability
- File tracking: Normalize paths cho comparison nếu case-insensitive
- Detect case rename: Nếu only casing changed → mark as renamed (or ignore based on config)
- Conflict detection: `File.txt` vs `file.txt` = conflict nếu case-insensitive

**Logic:**
```typescript
function normalizePathForComparison(path: string, caseInsensitive: boolean): string {
  return caseInsensitive ? path.toLowerCase() : path;
}

function detectCaseChange(oldPath: string, newPath: string, caseInsensitive: boolean): boolean {
  return caseInsensitive && 
         oldPath.toLowerCase() === newPath.toLowerCase() &&
         oldPath !== newPath;
}
```

**Data structure:**
```typescript
interface FilesystemConfig {
  caseInsensitive: boolean;
  casePreserving: boolean;  // e.g., NTFS on Windows
}

interface CaseSensitivityIssue {
  type: 'case_conflict' | 'case_rename';
  paths: string[];
  recommendation: 'allow' | 'warn' | 'error';
}
```

**Verification:**
- Auto-detection accurate
- Case rename handled correctly
- No false conflicts on case-insensitive systems
- Performance: No regression
- User can override auto-detection

---

### 3.10 Shallow Clone / Sparse Checkout

**Mô tdescribe:**
Restore không cần toàn bộ snapshot history, chỉ recent snapshots hoặc specific directories. Giảm dung lượng khi đơn.

**Shallow clone**: Restore chỉ N recent snapshots, không full history
**Sparse checkout**: Restore chỉ specific directories, không toàn bộ project

**Cách thực hiện:**

**Shallow clone:**
- Config: `--depth N` khi restore
- Manifest history: Keep only last N snapshots
- Old snapshots: Mark as "shallow" (not available, can fetch if needed)
- Fetch older: `ai-track fetch-history --since <date>`

**Sparse checkout:**
- Config: `.ai-track/sparse-checkout` file (list directories)
- Restore: Chỉ files matching sparse pattern
- Compare: Chỉ files trong sparse pattern
- Watch: Chỉ monitor sparse directories

**Data structure:**
```typescript
interface ShallowConfig {
  shallow: boolean;
  depth?: number;  // number of recent snapshots
  sparseCheckout?: boolean;
  sparsePatterns?: string[];  // directories to include
}

interface SnapshotMetadata {
  isShallow: boolean;
  availableFromRemote?: string;  // URL to fetch if needed
}
```

**Verification:**
- Shallow restore < 50% storage of full restore
- Sparse checkout < 20% storage nếu exclude 80% dirs
- Can still query full history via remote
- Performance: No regression
- Can convert shallow → full later

---

## 4. Task Breakdown

### Phase 4.1: Delta Compression (T4.1.x)

**T4.1.1**: Implement xdiff algorithm wrapper (npm package or custom)
- Evaluate xdiff npm packages vs custom implementation
- Create `src/core/delta.ts` module
- Implement `computeDelta(source, target): Buffer`
- Implement `applyDelta(source, delta): Buffer`
- Unit test coverage > 95%

**T4.1.2**: Integrate delta into snapshot creation
- Modify `src/core/snapshot.ts`
- When creating new snapshot: check if parent exists → compute delta
- Fallback to full copy if parent missing/corrupted
- Update `Manifest` structure for delta metadata

**T4.1.3**: Update manifest + state for delta tracking
- Add to `SnapshotDelta` interface in `src/types.ts`
- Add `parentSnapshotId`, `fileDeltas` fields
- Migration: Detect old manifest format → convert to delta-aware

**T4.1.4**: Implement delta reconstruction
- Reconstruct file from delta chain
- Handle corruption: fall back to alternative snapshot
- Cache reconstructed files (not re-compute every time)
- Performance: < 100ms for typical files

**T4.1.5**: Update compare/rollback for delta
- Modify `src/core/compare.ts` to handle delta reconstruction
- Modify `src/core/rollback.ts` to apply delta changes
- Ensure backward compatibility (old full-copy snapshots still work)

**T4.1.6**: Implement storage cleanup for old snapshots
- Add `src/core/gc.ts` (if not in Phase 1): compress old snapshots to delta
- GC policy: Keep last 10 full copies, rest as delta chain
- Safety: Never delete if delta reconstruction fails

**T4.1.7**: Add delta diagnostics command
- `src/commands/delta-info.ts`
- Show delta chain, compression ratio, storage savings
- Verify delta integrity

**T4.1.8**: Comprehensive testing
- Test delta computation accuracy (binary + text)
- Test reconstruction correctness
- Test storage savings (benchmark: 1000 file project)
- Test performance (delta compute, apply, reconstruct)

---

### Phase 4.2: Cherry-pick (T4.2.x)

**T4.2.1**: Implement hunk parser
- Create `src/core/hunk-parser.ts`
- Parse unified diff into hunks
- Hunk = `{ startLineA, countA, startLineB, countB, lines[] }`
- Handle edge cases (no newline at EOF, etc.)

**T4.2.2**: Implement hunk applicator
- Create `src/core/hunk-applicator.ts`
- Apply selected hunks to file
- Detect conflicts: lines already present/missing
- Return conflict report if needed

**T4.2.3**: Create cherry-pick command
- `src/commands/cherry-pick.ts`
- Interactive UI: user select hunks to apply
- Show diff before/after
- Rollback support (via transaction/stash)

**T4.2.4**: Integrate with compare/diff
- Modify `src/core/diff.ts` to output structured hunks
- Add metadata: hunk index, complexity, conflict risk

**T4.2.5**: Conflict detection for hunks
- Detect when hunk context doesn't match
- Warn user before apply
- Suggest manual merge if conflict high

**T4.2.6**: Testing
- Test hunk parsing (various diff formats)
- Test apply success/conflict cases
- Test edge cases (empty file, single line, etc.)
- Performance: Parse/apply 100KB diff < 50ms

---

### Phase 4.3: Patch Format (T4.3.x)

**T4.3.1**: Implement patch export
- Create `src/commands/patch-export.ts`
- Compute diff: `snapshot-a` → `snapshot-b`
- Output unified diff format
- Include metadata: source, target, timestamp, stats

**T4.3.2**: Implement patch import
- Create `src/commands/patch-import.ts`
- Parse patch file (unified diff format)
- Apply patches with 3-way merge (if base snapshot available)
- Report conflicts

**T4.3.3**: Patch metadata + header
- Add patch header: source snapshot, timestamp, author, message
- Store metadata in `.ai-track/patches/`
- Index patches for search/retrieval

**T4.3.4**: Support 3-way merge for patches
- If patch specifies base snapshot → use 3-way merge
- Detect conflicts from Phase 2
- Report merge result

**T4.3.5**: Bidirectional patch support
- Support forward patch: A → B
- Support reverse patch: B → A
- Support rejecting/partial apply

**T4.3.6**: Testing
- Test export accuracy (patch recreates B from A)
- Test import correctness (apply patch ≈ target state)
- Test 3-way merge patches
- Test conflict markers
- Interoperability: Can apply patch with GNU patch command?

---

### Phase 4.4: Directory Rename Detection (T4.4.x)

**T4.4.1**: Implement directory rename heuristics
- Create `src/core/directory-rename.ts`
- Implement hash-matching algorithm
- Threshold: 80% files match
- Output: `DirectoryRename[]` with confidence

**T4.4.2**: Integrate into compare logic
- Modify `src/core/compare.ts` to detect directory renames
- After initial comparison, check for rename patterns
- Update comparison result with `directoryRenames`

**T4.4.3**: Display rename in UI/output
- Show directory rename in comparison output
- Don't list individual file adds/deletes for renamed dirs
- User can confirm/reject rename detection

**T4.4.4**: Testing
- Test detection accuracy (80%+ precision)
- Test false positive rate (< 5%)
- Test edge cases (partial rename, nested renames)
- Performance: Detection < 50ms

---

### Phase 4.5: Binary File Handling (T4.5.x)

**T4.5.1**: Implement binary detection
- Create `src/core/binary-detector.ts`
- Magic byte detection (JPEG, PNG, PDF, etc.)
- Extension-based fallback
- Return: `boolean` or `{ isBinary: true, type: string }`

**T4.5.2**: Update snapshot creation
- Detect binary files during snapshot
- Mark in metadata: `{ type: 'binary', ... }`
- Don't attempt compression/delta on binary

**T4.5.3**: Update diff logic
- For binary files: Output "Binary files differ"
- Don't generate unified diff
- Store file hash instead

**T4.5.4**: Update compare/rollback
- Binary rollback: Copy entire file
- No merge attempt on binary
- No line-by-line diff

**T4.5.5**: Update manifest
- Add `filetype: 'binary' | 'text'` to file metadata
- Preserve binary type across snapshots

**T4.5.6**: Testing
- Test detection accuracy (> 95%)
- Test various binary formats (images, PDFs, executables)
- Test rollback binary files
- Test mixed projects (text + binary)
- Performance: No regression

---

### Phase 4.6: Stash (T4.6.x)

**T4.6.1**: Implement stash storage
- Create `src/core/stash.ts`
- Store stashes in `.ai-track/stashes/` directory
- Metadata: timestamp, message, base snapshot, diff
- Stash index: latest stash = `stash@{0}`

**T4.6.2**: Implement stash save
- Compute diff: current state vs active snapshot
- Save diff + metadata
- Message (optional): user-provided description
- Return stash ID

**T4.6.3**: Implement stash apply
- Apply stash diff to current state
- Detect conflicts (if current state differs from base)
- Report conflicts, don't auto-resolve
- Keep stash (can apply again)

**T4.6.4**: Implement stash pop
- Apply stash + delete stash
- Equivalent to: apply + delete

**T4.6.5**: Implement stash list
- List all stashes with metadata
- Show: timestamp, message, stats (changes count)
- Sortable by time/message

**T4.6.6**: Implement stash show
- Show diff of specific stash
- Compare stash to current state
- Compare stash to base snapshot

**T4.6.7**: Testing
- Test save/apply round-trip
- Test pop (delete after apply)
- Test list/show accuracy
- Test multiple stashes
- Test conflict detection
- Performance: All operations < 100ms

---

### Phase 4.7: Ignore Rule Validation (T4.7.x)

**T4.7.1**: Enhance ignore file parser
- Modify `src/core/ignore.ts`
- Add rule validation: syntax check, pattern validation
- Report: line number, error type, suggestion

**T4.7.2**: Implement validation rules
- Check regex/glob syntax
- Check for circular patterns (pattern excludes itself)
- Warn: too broad patterns (e.g., `.` alone)
- Warn: redundant rules (nested patterns)

**T4.7.3**: Add test mode
- Load ignore file → validate all rules
- Test against sample paths: check if expected
- Report mismatches

**T4.7.4**: Auto-fix suggestions
- Common typos: `*.txtt` → `*.txt`
- Pattern issues: suggest correct format
- Redundancy: suggest consolidated rule

**T4.7.5**: Validate on file write
- Hook: After user saves `.ai-track-ignore`
- Run validation automatically
- Report errors to user (warning or error mode)

**T4.7.6**: Command for validation
- `src/commands/ignore-validate.ts`
- Run validation manually
- Test rule against sample paths

**T4.7.7**: Testing
- Test validation accuracy (catch 90%+ errors)
- Test false positives (< 5%)
- Test auto-fix suggestions
- Test performance (validate file < 10ms)

---

### Phase 4.8: Symlink Support (T4.8.x)

**T4.8.1**: Implement symlink detection
- Update `src/core/snapshot.ts`
- Use `fs.lstat()` to detect symlinks
- Don't follow symlinks (track target, not content)

**T4.8.2**: Store symlink metadata
- Update `src/types.ts`: `SymlinkInfo` interface
- Hash = hash of target string
- Store target path (absolute or relative)
- Track symlink in manifest separately from regular files

**T4.8.3**: Handle symlink in compare
- Detect target change (symlink re-linked to new target)
- Mark as "modified" (symlink diff)
- Compare target paths, not content

**T4.8.4**: Handle symlink in rollback
- Detect current symlink target
- If different from snapshot: unlink + recreate
- Preserve symlink (don't copy content)

**T4.8.5**: Circular symlink detection
- Detect cycles (A → B → A)
- Prevent infinite loops
- Warn user, skip traversal

**T4.8.6**: Cross-platform symlink handling
- Linux/macOS: Use `fs.symlink()`
- Windows: Use junction points or skip
- Config option: enable/disable symlink support

**T4.8.7**: Testing
- Test symlink detection
- Test circular symlink handling
- Test rollback symlink creation
- Test cross-platform behavior
- Test broken symlinks (preserve target)

---

### Phase 4.9: Case Sensitivity (T4.9.x)

**T4.9.1**: Implement case sensitivity detection
- Auto-detect filesystem (check capability)
- Create `src/core/case-sensitivity.ts`
- Return: `{ caseInsensitive: boolean, casePreserving: boolean }`

**T4.9.2**: Add config option
- Store in `.ai-track/config.json`: `caseInsensitive`
- Allow user override (manual config)
- Default: auto-detect

**T4.9.3**: Normalize paths for comparison
- When `caseInsensitive = true`: lowercase for comparison
- Preserve original casing in storage
- File `File.txt` vs `file.txt` = potential conflict

**T4.9.4**: Detect case rename vs real rename
- Compare: `oldPath.toLowerCase() === newPath.toLowerCase()`
- If match but casing differs = case rename
- Decision: Treat as rename or ignore based on config

**T4.9.5**: Case conflict detection
- Two files: `File.txt` and `file.txt` in same dir
- On case-insensitive system = conflict
- On case-sensitive system = allowed (different files)
- Warn user if mismatch

**T4.9.6**: Update compare/rollback logic
- Apply normalization when needed
- Detect case conflicts
- Handle case rename appropriately

**T4.9.7**: Testing
- Test case detection on macOS, Linux, Windows
- Test case rename handling
- Test case conflict detection
- Test rollback with case sensitivity
- Cross-platform compatibility

---

### Phase 4.10: Shallow Clone & Sparse Checkout (T4.10.x)

**T4.10.1**: Implement shallow config
- Create `src/core/shallow.ts`
- Config: `{ shallow: true, depth: N }`
- Restore: Keep only last N snapshots in history

**T4.10.2**: Implement sparse checkout config
- Config: `{ sparseCheckout: true, sparsePatterns: string[] }`
- Patterns: directories/files to include
- Restore: Only files matching patterns

**T4.10.3**: Update snapshot creation
- When sparse: Only snapshot files in patterns
- Mark as sparse in metadata
- Store which directories excluded

**T4.10.4**: Update compare/rollback
- For shallow: Only compare recent snapshots
- For sparse: Only affected directories
- Performance: Significant reduction if 80%+ excluded

**T4.10.5**: Implement fetch-history command
- For shallow clones: Fetch older snapshots from remote
- Populate missing history
- Convert shallow → full gradually

**T4.10.6**: Update watch
- For sparse: Only monitor included directories
- Ignore events outside patterns
- Reduced CPU/memory usage

**T4.10.7**: Testing
- Test shallow restore (< 50% storage)
- Test sparse checkout (< 20% storage if 80% excluded)
- Test fetch-history (restore older snapshots)
- Test compare accuracy (only affected dirs)
- Performance: Watch should use < 50% CPU/memory

---

## 5. Files dự kiến ảnh hưởng (Affected Files)

### Existing Files (Modify):
- `src/types.ts` - Add new interfaces (SymlinkInfo, BinaryFileInfo, DirectoryRename, etc.)
- `src/core/snapshot.ts` - Add delta, binary detection, symlink, sparse, shallow support
- `src/core/compare.ts` - Add directory rename, case sensitivity, sparse filtering
- `src/core/rollback.ts` - Add cherry-pick, binary handling, symlink support
- `src/core/diff.ts` - Add hunk parsing, binary diff, symlink diff
- `src/core/ignore.ts` - Add validation, case sensitivity
- `src/core/watch.ts` - Add sparse watch, binary skip
- `src/core/config.ts` - Add shallow, sparse, case sensitivity config
- `src/core/state.ts` - Add stash storage reference

### New Core Modules (Create):
- `src/core/delta.ts` - xdiff algorithm (compute/apply)
- `src/core/hunk-parser.ts` - Parse hunks from diff
- `src/core/hunk-applicator.ts` - Apply hunks to file
- `src/core/directory-rename.ts` - Detect directory renames
- `src/core/binary-detector.ts` - Detect binary files
- `src/core/stash.ts` - Stash management
- `src/core/case-sensitivity.ts` - Case handling
- `src/core/shallow.ts` - Shallow/sparse config
- `src/core/symlink.ts` - Symlink handling (optional, if complex)

### New Commands (Create):
- `src/commands/cherry-pick.ts` - Cherry-pick command
- `src/commands/patch-export.ts` - Export patch
- `src/commands/patch-import.ts` - Import patch
- `src/commands/stash.ts` - Stash management (save/apply/pop/list)
- `src/commands/ignore-validate.ts` - Validate ignore rules
- `src/commands/delta-info.ts` - Show delta compression info
- `src/commands/shallow.ts` - Configure shallow clone
- `src/commands/sparse.ts` - Configure sparse checkout
- `src/commands/fetch-history.ts` - Fetch older snapshots

### Tests (Create):
- `tests/delta.test.ts` - Delta compression tests
- `tests/cherry-pick.test.ts` - Cherry-pick tests
- `tests/patch.test.ts` - Patch export/import tests
- `tests/directory-rename.test.ts` - Directory rename detection
- `tests/binary-handling.test.ts` - Binary file handling
- `tests/stash.test.ts` - Stash tests
- `tests/case-sensitivity.test.ts` - Case sensitivity tests
- `tests/symlink.test.ts` - Symlink tests
- `tests/ignore-validation.test.ts` - Ignore validation tests
- `tests/shallow-sparse.test.ts` - Shallow/sparse tests

### Updated Entry Point:
- `src/cli.ts` - Add new command registrations (cherry-pick, patch-export, patch-import, stash, ignore-validate, delta-info, shallow, sparse, fetch-history)

---

## 6. Rủi ro & Câu hỏi mở (Risks & Open Questions)

### Rủi ro (Risks)

1. **Delta Compression Complexity**
   - Risk: xdiff algorithm implementation/bugs → data corruption
   - Mitigation: Use well-tested npm package (xdiff-js or similar), extensive unit tests, data integrity checks

2. **Cherry-pick Conflict Handling**
   - Risk: Conflict markers confusing for users, wrong hunk selection
   - Mitigation: Clear UI, preview before apply, undo support (via transaction)

3. **Case Sensitivity Cross-Platform Issues**
   - Risk: Data loss if file `File.txt` on macOS becomes `file.txt` on Linux
   - Mitigation: Detect conflicts early, warn user, require explicit confirmation

4. **Symlink Security**
   - Risk: Symlink attack (link outside project, unauthorized access)
   - Mitigation: Validate symlink target is within project, warn for external links

5. **Backward Compatibility**
   - Risk: Old snapshots without delta/metadata breaks
   - Mitigation: Graceful fallback (treat old snapshots as full copies), migration path clear

6. **Performance Degradation**
   - Risk: Too many features → compare/rollback becomes slow
   - Mitigation: Benchmarking required, feature flags to disable expensive features

### Câu hỏi mở (Open Questions)

1. **Delta Compression**
   - Should we use existing npm xdiff package or implement custom?
   - What's acceptable storage overhead for backward compatibility (keep full copies)?
   - How to handle delta chain corruption (missing intermediate snapshots)?

2. **Cherry-pick UI**
   - Interactive CLI hunk selection or batch mode with hunk file?
   - Should undo cherry-pick automatically create stash or transaction?

3. **Patch Format**
   - Use standard unified diff + custom header or custom format?
   - Should patch file include snapshot IDs or just stats?

4. **Directory Rename**
   - Is 80% file match threshold correct or should be configurable?
   - Should we support partial directory renames (80% of files, not all)?

5. **Stash Behavior**
   - Should stash be project-wide or per-branch (if branching added later)?
   - Auto-cleanup old stashes or manual only?

6. **Case Sensitivity Auto-detect**
   - How to handle file systems that are case-insensitive but case-preserving (NTFS)?
   - User override sufficient or need per-file rules?

7. **Symlink Support**
   - Should we support Windows junction points same as symlinks?
   - Limit to absolute/relative symlink targets or allow external?

8. **Shallow Clone**
   - How to handle snapshots with missing history (old snapshots deleted)?
   - Should fetch-history require remote URL or auto-detect?

9. **Sparse Checkout**
   - Should sparse patterns be stored in repo or local config?
   - Can user change sparse patterns between operations?

10. **Performance Targets**
    - Are < 100ms delta compute, < 50ms directory rename, < 100ms stash operations acceptable?
    - Should we add async operations for large projects?

---

## 7. Verification & Acceptance Criteria

### Phase 4.1: Delta Compression
- [ ] Patch: Delta compression reduces storage by 60-80% in typical projects
- [ ] Patch: Reconstruct file from delta chain = original file
- [ ] Patch: Delta compute/apply < 100ms per file
- [ ] Patch: Fallback to full copy works reliably
- [ ] Patch: All unit tests pass

### Phase 4.2: Cherry-pick
- [ ] Patch: Hunk parsing handles all unified diff edge cases
- [ ] Patch: Cherry-pick apply succeeds without corruption
- [ ] Patch: Conflict detection accurate, false positive < 5%
- [ ] Patch: Undo cherry-pick restores original state
- [ ] Patch: All unit tests pass

### Phase 4.3: Patch Format
- [ ] Patch: Exported patch = valid unified diff format
- [ ] Patch: Apply patch recreates target snapshot state
- [ ] Patch: 3-way merge patches handle conflicts correctly
- [ ] Patch: Reverse patch (B → A) works
- [ ] Patch: GNU patch command can apply exported patch
- [ ] Patch: All unit tests pass

### Phase 4.4: Directory Rename Detection
- [ ] Patch: Directory rename detected with 80%+ precision
- [ ] Patch: False positive rate < 5%
- [ ] Patch: Detection < 50ms
- [ ] Patch: Works with nested directories
- [ ] Patch: All unit tests pass

### Phase 4.5: Binary File Handling
- [ ] Patch: Binary detection accuracy > 95%
- [ ] Patch: Binary files don't generate diff
- [ ] Patch: Binary rollback = exact copy
- [ ] Patch: No merge attempt on binary
- [ ] Patch: All unit tests pass

### Phase 4.6: Stash
- [ ] Patch: Stash save captures current changes accurately
- [ ] Patch: Stash apply restores changes without corruption
- [ ] Patch: Stash pop deletes stash after apply
- [ ] Patch: Multiple stashes manageable (list/show)
- [ ] Patch: Conflict detection in stash apply works
- [ ] Patch: All unit tests pass

### Phase 4.7: Ignore Rule Validation
- [ ] Patch: Validation catches 90%+ of common errors
- [ ] Patch: False positive rate < 5%
- [ ] Patch: Validation < 10ms per file
- [ ] Patch: Auto-fix suggestions helpful
- [ ] Patch: All unit tests pass

### Phase 4.8: Symlink Support
- [ ] Patch: Symlink detection accurate
- [ ] Patch: Symlink rollback creates correct link
- [ ] Patch: Circular symlinks handled safely (no infinite loop)
- [ ] Patch: Broken symlinks preserved
- [ ] Patch: Cross-platform compatibility (Linux/macOS/Windows)
- [ ] Patch: All unit tests pass

### Phase 4.9: Case Sensitivity
- [ ] Patch: Case detection accurate on macOS/Linux/Windows
- [ ] Patch: Case rename detected vs real rename
- [ ] Patch: Case conflict detected and warned
- [ ] Patch: Cross-platform file transfers handled safely
- [ ] Patch: All unit tests pass

### Phase 4.10: Shallow Clone & Sparse Checkout
- [ ] Patch: Shallow restore < 50% storage of full
- [ ] Patch: Sparse checkout < 20% storage (if 80% excluded)
- [ ] Patch: Fetch-history restores older snapshots
- [ ] Patch: Compare accuracy unchanged (only affected dirs)
- [ ] Patch: Watch use < 50% CPU/memory (sparse)
- [ ] Patch: All unit tests pass

### Integration Tests
- [ ] Patch: All Phase 4 features work together (delta + cherry-pick + stash + patch)
- [ ] Patch: Backward compatibility maintained (old snapshots still work)
- [ ] Patch: No performance regression on large projects (1000+ files)
- [ ] Patch: No data corruption in any scenario
- [ ] Patch: All integration tests pass

---

## 8. Phụ lục: Dependencies & Libraries

### Recommended npm packages:
- **xdiff**: For delta compression (e.g., `xdiff-js` or `binary-diff`)
  - Alternative: Implement custom using line/byte diff algorithms
  
- **ignore**: Already used for gitignore patterns
  - Extend for validation (e.g., `ignore-sync` or custom validation)

- **ignore-pattern**: Validate patterns (custom implementation likely needed)

- **symlink-or-copy**: Cross-platform symlink support (optional)

### Internal utilities:
- Use existing diff/compare logic
- Extend state management for stash/shallow config
- Reuse transaction/locking from Phase 2

---

## 9. Tóm tắt (Summary)

Phase 4 hoàn thiện AI-Track-Tool với 10 tính năng nâng cao:
- **Performance**: Delta compression (60-80% storage saving)
- **Workflow**: Cherry-pick, stash, patch format (user flexibility)
- **Robustness**: Binary handling, symlink support, case sensitivity, ignore validation
- **Scalability**: Shallow clone, sparse checkout (reduce storage/compute)
- **UX**: Directory rename detection (fewer false positives)

**Ước tính độ phức tạp**: 
- Tier 1 (Cherry-pick, Patch, Directory rename): Medium-High complexity, 5-7 days each
- Tier 2 (Delta compression, Binary handling, Stash): Medium-High complexity, 4-6 days each
- Tier 3 (Ignore validation, Symlink, Case sensitivity, Shallow/sparse): Low-Medium complexity, 2-4 days each

**Total estimated effort**: 40-60 development days (depending on team size/parallelization)

---

**Created**: 2026-04-02  
**Status**: Draft - Ready for Review & Implementation Planning
