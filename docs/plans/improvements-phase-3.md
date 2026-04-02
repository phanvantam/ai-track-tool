# Plan: Core Improvements Phase 3 - History & Metadata

## 1. Context & Goals

**Mục tiêu chính:**
- Lưu **lịch sử snapshots** (snapshot chain, parent references).
- Thêm **reflog** để track tất cả thao tác (create, reset, rollback).
- Thêm **metadata & annotations** (author, summary, tags, notes).
- Cho phép **restore từ historical snapshots** (ngoài active snapshot).

**Scope:**
- Tập trung vào storage structure, manifest, state.
- Bỏ qua branching (khác) và cherry-pick (phase 4).
- Phase này tạo foundation cho auditability + recovery.

**Lý do quan trọng:**
- Hiện tại chỉ có 1 snapshot active → không có lịch sử.
- Reset snapshot → mất snapshot cũ → không thể quay lại.
- Không biết **ai, khi nào, tại sao** tạo snapshot.
- Không thể check "thay đổi giữa snapshot A và B".

---

## 2. Hiện trạng

**Snapshot structure hiện tại:**
```
storage/
├── state.json (1 activeSnapshotId)
└── snapshots/<uuid>/
    ├── manifest.json
    └── files/
```
- Chỉ 1 snapshot active.
- Không có reference về parent snapshot.
- Không có lịch sử khi reset.

**State hiện tại (`src/types.ts`):**
```typescript
export interface TrackState {
  activeSnapshotId: string;
  targetPath: string;
  storagePath: string;
  updatedAt: string;
}
```
- Minimal metadata, không có history.

**Manifest hiện tại:**
```typescript
export interface SnapshotManifest {
  snapshotId: string;
  createdAt: string;
  targetPath: string;
  ignoreRules: string[];
  files: SnapshotFileEntry[];
}
```
- Không có parent reference, author, message.

---

## 3. Phương án đề xuất

### 3.1 Snapshot Chain (DAG Structure)

**Ý tưởng:**
- Mỗi snapshot reference tới snapshot "parent" (hoặc null nếu root).
- Tạo thành **directed acyclic graph (DAG)** giống Git history.
- Cho phép restore từ bất kỳ historical snapshot nào.

**Cấu trúc mới:**

```typescript
// Cập nhật SnapshotManifest
export interface SnapshotManifest {
  snapshotId: string;
  parentId?: string;           // ← Reference to parent snapshot (or null)
  createdAt: string;
  targetPath: string;
  ignoreRules: string[];
  files: SnapshotFileEntry[];
  // Metadata mới (Phase 3)
  author?: string;             // User/AI created this snapshot
  email?: string;              // Author email
  summary?: string;            // One-line summary (like commit message)
  description?: string;        // Longer description
  tags?: string[];             // e.g., ["v1.0", "before-refactor"]
  checksum?: string;           // SHA-256 of all files combined (for integrity)
}

// Cập nhật TrackState
export interface TrackState {
  activeSnapshotId: string;
  targetPath: string;
  storagePath: string;
  updatedAt: string;
  // History info
  snapshotHistory?: string[];  // List of all snapshot IDs (reverse chronological)
  previousSnapshotId?: string; // For quick revert
}
```

**Thuật toán:**
```typescript
export async function createSnapshotWithParent(
  targetPath: string,
  options: {
    ignoreRules?: string[];
    author?: string;
    summary?: string;
    description?: string;
  } = {}
): Promise<{ state: TrackState; manifest: SnapshotManifest }> {
  const targetPathNorm = await normalizeTargetPath(targetPath);
  const existingState = await readStateIfExists(targetPath);
  
  // Get parent snapshot
  const parentId = existingState?.activeSnapshotId;
  
  // Create new snapshot
  const snapshotId = createSnapshotId();
  const mergedIgnoreRules = options.ignoreRules || await loadIgnoreRules(targetPath);
  const currentFiles = await scanCurrentFiles(targetPathNorm, mergedIgnoreRules);
  const storagePath = await resolveStorageRoot(targetPath);
  const snapshotRoot = getSnapshotRoot(storagePath, snapshotId);
  const snapshotFilesRoot = path.join(snapshotRoot, "files");

  await mkdir(snapshotFilesRoot, { recursive: true });

  // Copy files
  for (const file of currentFiles) {
    const destPath = path.join(snapshotFilesRoot, file.path);
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyFile(file.absolutePath, destPath);
  }

  // Create manifest with parent reference
  const manifest: SnapshotManifest = {
    snapshotId,
    parentId,                    // ← Reference to parent
    createdAt: new Date().toISOString(),
    targetPath: targetPathNorm,
    ignoreRules: mergedIgnoreRules,
    files: toSnapshotFileEntries(currentFiles),
    author: options.author || "unknown",
    summary: options.summary,
    description: options.description,
    tags: [],
    checksum: calculateManifestChecksum(currentFiles),
  };

  await writeManifest(storagePath, manifest);

  // Update state with history
  const newState: TrackState = {
    activeSnapshotId: snapshotId,
    targetPath: targetPathNorm,
    storagePath,
    updatedAt: new Date().toISOString(),
    previousSnapshotId: parentId,
    snapshotHistory: [
      snapshotId,
      ...(existingState?.snapshotHistory || [])
    ],
  };

  await writeState(newState);

  return { state: newState, manifest };
}
```

---

### 3.2 Reflog (Operation Log)

**Mục đích:**
- Log tất cả thao tác: create, reset, rollback, restore.
- Cho phép undo lên snapshot trước đó.
- Audit trail cho accountability.

**Cấu trúc:**
```typescript
export interface ReflogEntry {
  id: string;                    // UUID
  timestamp: string;
  action: "create" | "reset" | "rollback" | "restore" | "tag" | "gc";
  fromSnapshotId?: string;       // Snapshot trước
  toSnapshotId?: string;         // Snapshot sau
  reason?: string;               // Why (e.g., "user reset")
  author?: string;               // Who
  filesAffected?: number;        // How many files changed
  metadata?: {
    [key: string]: string;       // Custom metadata
  };
}

export interface Reflog {
  entries: ReflogEntry[];
}
```

**Module `src/core/reflog.ts` (mới):**

```typescript
const REFLOG_PATH = (storagePath: string) =>
  path.join(storagePath, ".reflog.jsonl");

export async function appendReflogEntry(
  storagePath: string,
  entry: Omit<ReflogEntry, "id" | "timestamp">
): Promise<ReflogEntry> {
  const reflogEntry: ReflogEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const reflogPath = REFLOG_PATH(storagePath);
  const line = JSON.stringify(reflogEntry);
  await appendFile(reflogPath, `${line}\n`, "utf8");

  return reflogEntry;
}

export async function readReflog(storagePath: string): Promise<ReflogEntry[]> {
  const reflogPath = REFLOG_PATH(storagePath);
  
  if (!await exists(reflogPath)) {
    return [];
  }

  const content = await readFile(reflogPath, "utf8");
  return content
    .trim()
    .split("\n")
    .filter((line) => line)
    .map((line) => JSON.parse(line) as ReflogEntry);
}

export async function getReflogStats(storagePath: string): Promise<{
  totalEntries: number;
  actionCounts: Record<string, number>;
  oldestEntry?: ReflogEntry;
  newestEntry?: ReflogEntry;
}> {
  const entries = await readReflog(storagePath);
  
  const actionCounts: Record<string, number> = {};
  for (const entry of entries) {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
  }

  return {
    totalEntries: entries.length,
    actionCounts,
    oldestEntry: entries[0],
    newestEntry: entries[entries.length - 1],
  };
}

export async function reflogUndo(
  targetPath: string,
  stepBack: number = 1
): Promise<void> {
  const state = await readState(targetPath);
  const entries = await readReflog(state.storagePath);
  
  if (stepBack < 1 || stepBack > entries.length) {
    throw new Error(`Invalid step: ${stepBack}`);
  }

  // Find entry to revert to
  let targetEntry: ReflogEntry | null = null;
  for (let i = entries.length - 1 - stepBack; i >= 0; i--) {
    if (entries[i].toSnapshotId) {
      targetEntry = entries[i];
      break;
    }
  }

  if (!targetEntry || !targetEntry.toSnapshotId) {
    throw new Error("Cannot find snapshot to revert to");
  }

  // Switch to target snapshot
  const manifest = await readManifest(state.storagePath, targetEntry.toSnapshotId);
  state.previousSnapshotId = state.activeSnapshotId;
  state.activeSnapshotId = targetEntry.toSnapshotId;
  state.updatedAt = new Date().toISOString();
  await writeState(state);

  // Log the undo
  await appendReflogEntry(state.storagePath, {
    action: "restore",
    fromSnapshotId: targetEntry.toSnapshotId,
    toSnapshotId: state.activeSnapshotId,
    reason: `undo ${stepBack} step(s)`,
    author: "system",
  });
}
```

**Dùng trong CLI:**
```bash
ai-track reflog --path <dir> --limit 20              # View reflog
ai-track reflog --path <dir> --stats                 # Statistics
ai-track reflog-undo --path <dir> --step 1           # Undo 1 step
ai-track reflog-undo --path <dir> --step 5           # Undo 5 steps
```

---

### 3.3 Snapshot Tagging & Annotations

**Ý tưởng:**
- Cho phép gán **tags** cho snapshots quan trọng (e.g., "v1.0", "before-refactor").
- Cho phép **notes** (tương tự git notes).

**Module update:**

```typescript
export interface SnapshotTag {
  name: string;                  // e.g., "v1.0"
  snapshotId: string;
  createdAt: string;
  author?: string;
}

export interface SnapshotNote {
  snapshotId: string;
  content: string;               // Multi-line note
  createdAt: string;
  author?: string;
}

export async function tagSnapshot(
  storagePath: string,
  snapshotId: string,
  tagName: string,
  author?: string
): Promise<void> {
  const tagsPath = path.join(storagePath, ".tags.json");
  
  let tags: SnapshotTag[] = [];
  if (await exists(tagsPath)) {
    const content = await readFile(tagsPath, "utf8");
    tags = JSON.parse(content);
  }

  // Check duplicate tag
  if (tags.some((t) => t.name === tagName)) {
    throw new Error(`Tag "${tagName}" already exists`);
  }

  tags.push({
    name: tagName,
    snapshotId,
    createdAt: new Date().toISOString(),
    author,
  });

  await writeFile(tagsPath, JSON.stringify(tags, null, 2), "utf8");
}

export async function addSnapshotNote(
  storagePath: string,
  snapshotId: string,
  content: string,
  author?: string
): Promise<void> {
  const notesPath = path.join(storagePath, ".notes.jsonl");
  
  const note: SnapshotNote = {
    snapshotId,
    content,
    createdAt: new Date().toISOString(),
    author,
  };

  const line = JSON.stringify(note);
  await appendFile(notesPath, `${line}\n`, "utf8");
}

export async function getSnapshotNotes(
  storagePath: string,
  snapshotId: string
): Promise<SnapshotNote[]> {
  const notesPath = path.join(storagePath, ".notes.jsonl");
  
  if (!await exists(notesPath)) {
    return [];
  }

  const content = await readFile(notesPath, "utf8");
  return content
    .trim()
    .split("\n")
    .filter((line) => line)
    .map((line) => JSON.parse(line) as SnapshotNote)
    .filter((note) => note.snapshotId === snapshotId);
}
```

**Dùng trong CLI:**
```bash
ai-track tag --path <dir> --snapshot <id> --name v1.0
ai-track tag --path <dir> --list                     # List all tags
ai-track note --path <dir> --snapshot <id> --add "Important baseline"
ai-track note --path <dir> --snapshot <id> --view
```

---

### 3.4 Snapshot Traversal (Log & Diff Between Snapshots)

**Ý tưởng:**
- `ai-track log` hiển thị history snapshots.
- `ai-track diff-snapshot` so sánh 2 snapshots.

**Module `src/core/snapshot-log.ts` (mới):**

```typescript
export async function getSnapshotLog(
  storagePath: string,
  limit?: number
): Promise<SnapshotManifest[]> {
  const state = await readStateIfExists(storagePath);
  if (!state) return [];

  const snapshots: SnapshotManifest[] = [];
  let currentId: string | undefined = state.activeSnapshotId;
  let count = 0;

  while (currentId && (!limit || count < limit)) {
    const manifest = await readManifest(storagePath, currentId);
    snapshots.push(manifest);
    currentId = manifest.parentId;
    count++;
  }

  return snapshots;
}

export async function diffSnapshots(
  storagePath: string,
  snapshotIdA: string,
  snapshotIdB: string
): Promise<ChangeEntry[]> {
  const manifestA = await readManifest(storagePath, snapshotIdA);
  const manifestB = await readManifest(storagePath, snapshotIdB);

  // A là "snapshot" (old), B là "current" (new)
  const filesA = manifestA.files;
  const filesB = manifestB.files;

  const mapA = new Map(filesA.map((f) => [f.path, f]));
  const mapB = new Map(filesB.map((f) => [f.path, f]));

  const changes: ChangeEntry[] = [];

  // Check B files vs A files
  for (const fileB of filesB) {
    const fileA = mapA.get(fileB.path);

    if (!fileA) {
      // Added in B
      changes.push({
        path: fileB.path,
        type: "added",
        isBinary: fileB.isBinary,
        beforeAbsolutePath: null,
        afterAbsolutePath: path.join(storagePath, "snapshots", snapshotIdB, "files", fileB.path),
      });
    } else if (fileA.hash !== fileB.hash) {
      // Modified
      changes.push({
        path: fileB.path,
        type: "modified",
        isBinary: fileA.isBinary || fileB.isBinary,
        beforeAbsolutePath: path.join(storagePath, "snapshots", snapshotIdA, "files", fileA.path),
        afterAbsolutePath: path.join(storagePath, "snapshots", snapshotIdB, "files", fileB.path),
      });
    }
  }

  // Check A files vs B files (for deleted)
  for (const fileA of filesA) {
    if (!mapB.has(fileA.path)) {
      changes.push({
        path: fileA.path,
        type: "deleted",
        isBinary: fileA.isBinary,
        beforeAbsolutePath: path.join(storagePath, "snapshots", snapshotIdA, "files", fileA.path),
        afterAbsolutePath: null,
      });
    }
  }

  return changes.sort((a, b) => a.path.localeCompare(b.path));
}
```

**Dùng trong CLI:**
```bash
ai-track log --path <dir> --limit 10                 # Show 10 recent snapshots
ai-track log --path <dir> --oneline                  # Short format
ai-track diff-snapshot --path <dir> <snapshot-a> <snapshot-b>
```

---

## 4. Task Breakdown

### Phase 3.1: Snapshot Chain
- [ ] **T3.1.1** Cập nhật `SnapshotManifest` interface (thêm parentId, author, summary, v.v.)
- [ ] **T3.1.2** Cập nhật `TrackState` interface (thêm history, previousSnapshotId)
- [ ] **T3.1.3** Implement `createSnapshotWithParent()`
- [ ] **T3.1.4** Update `resetSnapshot()` để preserve chain
- [ ] **T3.1.5** Update manifest read/write (`state.ts`)
- [ ] **T3.1.6** Test snapshot chain (create, reset, verify parent links)
- [ ] **T3.1.7** Compute checksum (SHA-256 tất cả files combined)

### Phase 3.2: Reflog
- [ ] **T3.2.1** Tạo module `src/core/reflog.ts`
- [ ] **T3.2.2** Implement `appendReflogEntry()`
- [ ] **T3.2.3** Implement `readReflog()`
- [ ] **T3.2.4** Implement `reflogUndo()`
- [ ] **T3.2.5** Implement `getReflogStats()`
- [ ] **T3.2.6** Update `createSnapshotWithParent()` → log reflog entry
- [ ] **T3.2.7** Update `rollbackFile()` → log reflog entry
- [ ] **T3.2.8** Test reflog (append, read, undo, stats)
- [ ] **T3.2.9** Add commands `reflog`, `reflog-undo` trong CLI

### Phase 3.3: Tagging & Notes
- [ ] **T3.3.1** Implement `tagSnapshot()`
- [ ] **T3.3.2** Implement `addSnapshotNote()`
- [ ] **T3.3.3** Implement `getSnapshotNotes()`
- [ ] **T3.3.4** Test tagging (create, list, prevent duplicates)
- [ ] **T3.3.5** Test notes (add, read, multi-note per snapshot)
- [ ] **T3.3.6** Add commands `tag`, `note` trong CLI

### Phase 3.4: Snapshot Traversal
- [ ] **T3.4.1** Tạo module `src/core/snapshot-log.ts`
- [ ] **T3.4.2** Implement `getSnapshotLog()`
- [ ] **T3.4.3** Implement `diffSnapshots()`
- [ ] **T3.4.4** Test snapshot log (traverse chain, limit)
- [ ] **T3.4.5** Test diff between 2 snapshots
- [ ] **T3.4.6** Add commands `log`, `diff-snapshot` trong CLI

### Phase 3.5: Integration & Testing
- [ ] **T3.5.1** Update `resetSnapshot()` → use reflog + chain
- [ ] **T3.5.2** Update GC logic từ Phase 1 → preserve tagged snapshots
- [ ] **T3.5.3** Add test file `tests/snapshot-history.test.ts`
- [ ] **T3.5.4** Add test file `tests/reflog.test.ts`
- [ ] **T3.5.5** Integration test: create chain, tag, reflog-undo
- [ ] **T3.5.6** Update `README.md` với history + reflog workflow

---

## 5. Files dự kiến ảnh hưởng

### Core modules (cần thay đổi):
- `src/types.ts` - Cập nhật SnapshotManifest, TrackState (thêm history fields)
- `src/core/snapshot.ts` - Update `createSnapshot()` → `createSnapshotWithParent()`
- `src/core/state.ts` - Update read/write state + manifest
- `src/core/rollback.ts` - Add reflog entry khi rollback

### Modules mới:
- `src/core/reflog.ts` - Reflog operations (mới)
- `src/core/snapshot-log.ts` - Snapshot history traversal (mới)
- `src/core/tagging.ts` - Tagging + notes (mới, optional: có thể inline trong reflog)

### Commands (cần thêm):
- `src/commands/log.ts` - CLI snapshot log command (mới)
- `src/commands/diff-snapshot.ts` - CLI diff snapshots command (mới)
- `src/commands/reflog.ts` - CLI reflog command (mới)
- `src/commands/reflog-undo.ts` - CLI reflog undo command (mới)
- `src/commands/tag.ts` - CLI tag command (mới)
- `src/commands/note.ts` - CLI note command (mới)

### CLI entry:
- `src/cli.ts` - Thêm 6 commands trên

### Tests (mới):
- `tests/snapshot-history.test.ts`
- `tests/reflog.test.ts`

---

## 6. Rủi ro & Câu hỏi mở

### Rủi ro:
1. **Orphan snapshots:** Nếu user delete tag → snapshot nào orphan? (GC xóa nó?)
2. **Reflog size:** Với hàng ngàn operations → reflog file tăng → slow append/read.
3. **Tag naming conflict:** Nếu user tag với cùng name → overwrite hay error?
4. **History traversal:** Nếu snapshot chain broken (parent deleted) → fail gracefully?

### Câu hỏi mở:
1. **Default author name?** (From env? "unknown"? Config?)
2. **Reflog retention policy?** (Keep all? Cleanup after GC?)
3. **Checksum algorithm?** (SHA-256? CRC32? For what purpose?)
4. **Tag auto-increment?** (v1.0, v1.1, v1.2?)
5. **History limit default?** (Keep all? Or last N?)

---

## 7. Verification

### Functional:
- [ ] Snapshot chain link parent correctly.
- [ ] `getSnapshotLog()` traverse từ active tới root.
- [ ] Reflog log tất cả operations.
- [ ] Reflog undo restore tới previous snapshot.
- [ ] Tag snapshot, list tags, verify association.
- [ ] Add note, read notes, multi-note per snapshot.
- [ ] Diff 2 snapshots detect added/modified/deleted.

### Performance:
- [ ] Reflog append < 1ms per entry.
- [ ] Snapshot log traverse (10 snapshots) < 100ms.
- [ ] Tag/note operations < 10ms.

### Edge Cases:
- [ ] Root snapshot (no parent).
- [ ] Deep chain (100+ snapshots).
- [ ] Orphan snapshots (reference deleted parent).

---

## 8. Acceptance Criteria

### Phase 3 Completion:
1. ✅ Snapshot chain structure lưu parent references.
2. ✅ Reflog track tất cả operations.
3. ✅ User có thể tag + note snapshots.
4. ✅ User có thể view history + diff between snapshots.
5. ✅ Reflog undo (revert N steps).
6. ✅ GC respect tagged snapshots (không xóa).
7. ✅ Backward compatible (old manifests có fallback).
8. ✅ README/docs cập nhật history workflow.

