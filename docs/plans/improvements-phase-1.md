# Plan: Core Improvements Phase 1 - Hiệu năng & Integrity

## 1. Context & Goals

**Mục tiêu chính:**
- Tăng hiệu năng quét file từ O(n hash) → O(k hash) với k << n (cache-based incremental scan).
- Thêm cơ chế kiểm tra tính toàn vẹn snapshot (FSCK).
- Thêm garbage collection để cleanup snapshot cũ và tiết kiệm storage.
- Đảm bảo hệ thống có thể handle thư mục lớn (100k+ files) mà không giật lag.

**Scope:**
- Tập trung vào **core logic**: snapshot, compare, scan.
- Bỏ qua UI/Server/CLI - chỉ cải thiện layer xử lý file.
- Phase này là nền tảng cho các phase tiếp theo (history, merge, delta).

---

## 2. Hiện trạng

**Quét file hiện tại (`src/core/snapshot.ts`):**
- `scanCurrentFiles()` quét **toàn bộ cây file** mỗi lần.
- Tính SHA-256 cho **tất cả file**, ngay cả file không đổi.
- Với 100k files, mỗi lần refresh tốn 5-10 giây.

**So sánh hiện tại (`src/core/compare.ts`):**
- Dùng Map index theo path/hash → O(n).
- Nhưng phải tính hash tất cả →병목ở `scanCurrentFiles()`.

**Storage hiện tại (`src/core/state.ts`):**
- Không có metadata về lần scan trước (mtime, inode).
- Không có gc logic → snapshot cũ tích tụ lâu dài.
- Không có fsck/verify.

**Manifest hiện tại (`src/types.ts`):**
```typescript
export interface SnapshotFileEntry {
  path: string;
  hash: string;
  size: number;
  mtimeMs: number;
  isBinary: boolean;
}
```
- Thiếu thông tin detect file thay đổi: `inode`, `uid`, `gid`, `mode`.

---

## 3. Phương án đề xuất

### 3.1 Incremental Scanning with Metadata Cache

**Ý tưởng:**
- Mỗi scan lưu **metadata hiện tại** (path, size, mtime, inode).
- Lần scan tiếp theo, so sánh metadata trước khi tính hash.
- Chỉ tính hash file **mà metadata thay đổi**.

**Cấu trúc metadata:**
```typescript
// Thêm vào snapshot manifest
export interface SnapshotMetadata {
  scannedAt: string;           // Lúc scan
  osType: string;              // darwin | linux | win32 (để detect platform change)
  filesMetadata: {
    [path: string]: FileMetadata;
  };
}

export interface FileMetadata {
  path: string;
  size: number;
  mtimeMs: number;
  inode?: number;              // Có thể dùng detect rename trên Unix
  uid?: number;
  gid?: number;
  mode?: number;               // File permission
}

// Trả về khi quét
export interface CurrentFileEntry {
  path: string;
  absolutePath: string;
  hash: string;                // Lazy: tính khi cần
  size: number;
  mtimeMs: number;
  inode?: number;
  isBinary: boolean;
  needsHashCheck: boolean;     // Flag: có thay đổi metadata?
}
```

**Thuật toán incremental scan:**
```typescript
async function incrementalScan(
  targetPath: string,
  lastMetadata?: SnapshotMetadata
): Promise<CurrentFileEntry[]> {
  const changedFiles: CurrentFileEntry[] = [];
  const unchangedByPath = new Map<string, CurrentFileEntry>();

  // Quét filesystem, nhưng lazy hash
  const allEntries = await collectFilesRecursiveWithMetadata(targetPath, ignoreRules);
  
  for (const entry of allEntries) {
    if (!lastMetadata) {
      // Lần đầu: tính hash toàn bộ
      changedFiles.push(await hashEntry(entry));
      continue;
    }

    const oldMeta = lastMetadata.filesMetadata[entry.path];
    
    if (!oldMeta) {
      // File mới
      changedFiles.push(await hashEntry(entry));
      continue;
    }

    // So sánh metadata
    if (isSameMetadata(entry, oldMeta)) {
      // File không đổi → dùng hash cũ
      unchangedByPath.set(entry.path, {
        ...entry,
        hash: oldMeta.hash, // Từ manifest cũ
        needsHashCheck: false,
      });
      continue;
    }

    // Metadata thay đổi → tính hash mới
    changedFiles.push(await hashEntry(entry));
  }

  // Return tất cả, nhưng unchanged files có `needsHashCheck: false`
  return [...changedFiles, ...unchangedByPath.values()];
}

function isSameMetadata(current: FileMetadata, old: FileMetadata): boolean {
  return (
    current.size === old.size &&
    current.mtimeMs === old.mtimeMs &&
    current.inode === old.inode
  );
}
```

**Hiệu năng:**
- Lần 1: O(n hash) = 10s cho 100k files.
- Lần 2+ chỉ 10% files đổi: O(0.1n) = 1s.
- Với thư mục ổn định: ~100ms (chỉ quét inode/mtime).

---

### 3.2 FSCK - File System Consistency Check

**Mục đích:**
- Verify tính toàn vẹn snapshot.
- Phát hiện file bị hỏng hoặc xóa khỏi storage.
- Repair tự động nếu có thể.

**Cấu trúc module `src/core/fsck.ts`:**
```typescript
export interface FsckReport {
  status: "ok" | "error" | "repaired";
  errors: FsckError[];
  stats: {
    filesChecked: number;
    errorCount: number;
    repairedCount: number;
    elapsedMs: number;
  };
}

export interface FsckError {
  type: "hash_mismatch" | "missing_file" | "orphan_file" | "corrupt_manifest";
  path?: string;
  expected?: string;
  actual?: string;
  severity: "critical" | "warning";
  fixable: boolean;
}

export async function fsck(
  targetPath: string,
  options: { repair?: boolean; verbose?: boolean } = {}
): Promise<FsckReport> {
  const state = await readState(targetPath);
  const manifest = await readManifest(state.storagePath, state.activeSnapshotId);
  const snapshotFilesRoot = path.join(
    state.storagePath,
    "snapshots",
    manifest.snapshotId,
    "files"
  );

  const errors: FsckError[] = [];
  let repairedCount = 0;

  // Check 1: Verify manifest syntax
  if (!manifest.snapshotId || !manifest.files) {
    errors.push({
      type: "corrupt_manifest",
      severity: "critical",
      fixable: false,
    });
    return { status: "error", errors, stats: { filesChecked: 0, errorCount: 1, repairedCount: 0, elapsedMs: 0 } };
  }

  // Check 2: Verify mỗi file snapshot tồn tại & hash trùng
  for (const snapshotFile of manifest.files) {
    const snapshotAbsPath = path.join(snapshotFilesRoot, snapshotFile.path);
    
    try {
      const content = await readFile(snapshotAbsPath);
      const actualHash = hashBuffer(content);
      
      if (actualHash !== snapshotFile.hash) {
        errors.push({
          type: "hash_mismatch",
          path: snapshotFile.path,
          expected: snapshotFile.hash,
          actual: actualHash,
          severity: "critical",
          fixable: false, // Không thể repair nếu hash không khớp (có thể file bị corrupt)
        });
      }
    } catch {
      errors.push({
        type: "missing_file",
        path: snapshotFile.path,
        severity: "critical",
        fixable: options.repair, // Có thể xóa entry này khỏi manifest nếu repair
      });
      
      if (options.repair) {
        // Loại bỏ file này khỏi manifest
        manifest.files = manifest.files.filter((f) => f.path !== snapshotFile.path);
        repairedCount++;
      }
    }
  }

  // Check 3: Tìm orphan files (files ở storage nhưng không trong manifest)
  const manifestPaths = new Set(manifest.files.map((f) => f.path));
  const actualFiles = await getAllFilesInDir(snapshotFilesRoot);
  
  for (const actualFile of actualFiles) {
    if (!manifestPaths.has(actualFile)) {
      errors.push({
        type: "orphan_file",
        path: actualFile,
        severity: "warning",
        fixable: true, // Có thể xóa orphan file
      });
      
      if (options.repair) {
        await rm(path.join(snapshotFilesRoot, actualFile), { force: true });
        repairedCount++;
      }
    }
  }

  // Nếu repair, ghi lại manifest
  if (options.repair && repairedCount > 0) {
    await writeManifest(state.storagePath, manifest);
  }

  const status = errors.length === 0 ? "ok" : options.repair ? "repaired" : "error";
  return {
    status,
    errors,
    stats: {
      filesChecked: manifest.files.length,
      errorCount: errors.filter((e) => e.severity === "critical").length,
      repairedCount,
      elapsedMs: Date.now(), // TODO: track elapsed time
    },
  };
}
```

**Dùng trong CLI:**
```bash
ai-track fsck --path /project                 # Kiểm tra
ai-track fsck --path /project --repair        # Kiểm tra + sửa tự động
ai-track fsck --path /project --verbose       # Chi tiết lỗi
```

---

### 3.3 Garbage Collection (GC)

**Mục đích:**
- Xóa snapshot cũ theo policy (giữ N snapshots gần nhất hoặc N ngày gần nhất).
- Xóa unreferenced files trong object storage (nếu implement delta sau này).

**Cấu trúc config mới:**
```typescript
export interface AppConfig {
  storageDir: string | null;
  projects: string[];
  gc: {
    autoEnabled: boolean;      // Tự động GC khi vượt quota
    keepSnapshots: number;     // Giữ mấy snapshots gần nhất
    keepDays: number;          // Hoặc giữ N ngày gần nhất
    runIntervalDays: number;   // Chạy GC mỗi N ngày
  };
}
```

**Module `src/core/gc.ts`:**
```typescript
export interface GcOptions {
  keepSnapshots?: number;      // Default: 10
  keepDays?: number;           // Default: 30
  dryRun?: boolean;            // Chỉ preview, không xóa
  verbose?: boolean;
}

export interface GcReport {
  deletedSnapshots: string[];  // List snapshot IDs xóa
  freedSpace: number;          // Bytes giải phóng
  elapsedMs: number;
}

export async function gc(
  targetPath: string,
  options: GcOptions = {}
): Promise<GcReport> {
  const state = await readState(targetPath);
  const config = await readAppConfig();
  const gcConfig = config.gc || { keepSnapshots: 10, keepDays: 30 };
  
  // Đọc danh sách snapshots (nếu có history - phase 3)
  // Tạm thời: chỉ giữ active snapshot, xóa những snapshot nào cũ hơn
  
  const snapshotsDir = path.join(state.storagePath, "snapshots");
  const allSnapshots = await readdir(snapshotsDir);
  
  // Sort by mtime, giữ cái mới nhất
  const sortedByMtime = await Promise.all(
    allSnapshots.map(async (id) => {
      const manifestPath = path.join(snapshotsDir, id, "manifest.json");
      const manifest = await readManifest(state.storagePath, id);
      return { id, createdAt: new Date(manifest.createdAt) };
    })
  ).then((items) => items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  
  // Xác định cái nào xóa
  const toDelete = sortedByMtime.slice(gcConfig.keepSnapshots).filter((snap) => {
    const ageMs = Date.now() - snap.createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays > gcConfig.keepDays;
  });
  
  let freedSpace = 0;
  const deletedSnapshots: string[] = [];
  
  if (!options.dryRun) {
    for (const snap of toDelete) {
      const snapPath = path.join(snapshotsDir, snap.id);
      const size = await dirSize(snapPath);
      await rm(snapPath, { recursive: true, force: true });
      freedSpace += size;
      deletedSnapshots.push(snap.id);
      
      if (options.verbose) {
        console.log(`Deleted snapshot ${snap.id} (${formatBytes(size)})`);
      }
    }
  }
  
  return {
    deletedSnapshots,
    freedSpace,
    elapsedMs: 0, // TODO: track
  };
}

export async function autoGc(targetPath: string): Promise<void> {
  const config = await readAppConfig();
  const gcConfig = config.gc || {};
  
  if (!gcConfig.autoEnabled) return;
  
  // Check nếu đã chạy GC gần đây
  const lastGcPath = path.join(
    await resolveStorageRoot(targetPath),
    ".last-gc"
  );
  
  try {
    const lastGc = await readFile(lastGcPath, "utf8");
    const lastGcTime = parseInt(lastGc, 10);
    const elapsedMs = Date.now() - lastGcTime;
    const intervalMs = (gcConfig.runIntervalDays || 7) * 24 * 60 * 60 * 1000;
    
    if (elapsedMs < intervalMs) return; // Chưa đến lúc
  } catch {
    // Lần đầu chạy GC
  }
  
  await gc(targetPath, { verbose: false });
  
  // Ghi thời gian GC cuối cùng
  const storagePath = await resolveStorageRoot(targetPath);
  await writeFile(
    path.join(storagePath, ".last-gc"),
    Date.now().toString(),
    "utf8"
  );
}
```

**Dùng trong CLI:**
```bash
ai-track gc --path /project                   # GC với config mặc định
ai-track gc --path /project --keep-snapshots 5 --keep-days 7
ai-track gc --path /project --dry-run          # Preview
ai-track gc --path /project --verbose
```

---

### 3.4 Better Metadata in Manifest

**Cập nhật SnapshotFileEntry:**
```typescript
export interface SnapshotFileEntry {
  path: string;
  hash: string;
  size: number;
  mtimeMs: number;
  isBinary: boolean;
  // Thêm
  inode?: number;              // Unix inode (detect rename)
  uid?: number;
  gid?: number;
  mode?: number;               // File permission
}

export interface SnapshotManifest {
  snapshotId: string;
  createdAt: string;
  targetPath: string;
  ignoreRules: string[];
  files: SnapshotFileEntry[];
  // Thêm
  osType: string;              // Platform: darwin | linux | win32
  scannedAt: string;           // Lúc scan hoàn thành
  filesMetadata?: {             // Cache để incremental scan
    [path: string]: {
      size: number;
      mtimeMs: number;
      inode?: number;
    };
  };
}
```

---

## 4. Task Breakdown

### Phase 1.1: Incremental Scanning
- [ ] **T1.1.1** Thêm `FileMetadata` interface + cập nhật `SnapshotFileEntry`
- [ ] **T1.1.2** Implement `isSameMetadata()` để so sánh metadata
- [ ] **T1.1.3** Implement `incrementalScan()` trong `snapshot.ts`
- [ ] **T1.1.4** Refactor `scanCurrentFiles()` để dùng `incrementalScan()` khi có cache
- [ ] **T1.1.5** Cập nhật `createSnapshot()` để lưu metadata vào manifest
- [ ] **T1.1.6** Test incremental scan (benchmark: 100k files)
- [ ] **T1.1.7** Cập nhật `compare.ts` để dùng `needsHashCheck` flag

### Phase 1.2: FSCK
- [ ] **T1.2.1** Tạo module `src/core/fsck.ts` với interfaces
- [ ] **T1.2.2** Implement hash verification (check mỗi file snapshot)
- [ ] **T1.2.3** Implement missing file detection
- [ ] **T1.2.4** Implement orphan file detection
- [ ] **T1.2.5** Implement repair mode
- [ ] **T1.2.6** Test fsck (hash mismatch, missing files, orphans)
- [ ] **T1.2.7** Thêm command `fsck` trong `src/commands/fsck.ts`
- [ ] **T1.2.8** Cập nhật CLI (`src/cli.ts`) với `fsck` command

### Phase 1.3: Garbage Collection
- [ ] **T1.3.1** Tạo module `src/core/gc.ts` với interfaces
- [ ] **T1.3.2** Implement snapshot listing (từ manifest)
- [ ] **T1.3.3** Implement retention policy (keep N snapshots + age-based)
- [ ] **T1.3.4** Implement dry-run mode
- [ ] **T1.3.5** Implement auto-GC trigger
- [ ] **T1.3.6** Test GC (delete old snapshots, verify disk space freed)
- [ ] **T1.3.7** Thêm command `gc` trong `src/commands/gc.ts`
- [ ] **T1.3.8** Cập nhật CLI với `gc` command
- [ ] **T1.3.9** Cập nhật `AppConfig` interface với gc settings

### Phase 1.4: Integration & Testing
- [ ] **T1.4.1** Cập nhật `resetSnapshot()` để trigger `autoGc()` khi threshold vượt
- [ ] **T1.4.2** Thêm test file `tests/fsck.test.ts`
- [ ] **T1.4.3** Thêm test file `tests/gc.test.ts`
- [ ] **T1.4.4** Thêm test file `tests/incremental-scan.test.ts`
- [ ] **T1.4.5** Benchmark incremental scan vs full scan (1k, 10k, 100k files)
- [ ] **T1.4.6** Update `README.md` với hướng dùng fsck + gc

---

## 5. Files dự kiến ảnh hưởng

### Core modules (cần thay đổi):
- `src/types.ts` - Thêm interfaces (FileMetadata, FsckReport, GcReport)
- `src/core/snapshot.ts` - Thêm incremental scan logic
- `src/core/state.ts` - Không đổi (nhưng read/write manifest mới)
- `src/core/compare.ts` - Tối ưu dùng `needsHashCheck` flag

### Modules mới:
- `src/core/fsck.ts` - FSCK logic (mới)
- `src/core/gc.ts` - GC logic (mới)

### Commands (cần thêm):
- `src/commands/fsck.ts` - CLI fsck command (mới)
- `src/commands/gc.ts` - CLI gc command (mới)

### CLI entry:
- `src/cli.ts` - Thêm `fsck` + `gc` commands

### Tests (mới):
- `tests/fsck.test.ts`
- `tests/gc.test.ts`
- `tests/incremental-scan.test.ts`

### Docs:
- `README.md` - Cập nhật usage
- `docs/plans/improvements-phase-1.md` - Plan này

---

## 6. Rủi ro & Câu hỏi mở

### Rủi ro cao:
1. **Platform-specific inode:** Unix inode không có trên Windows → cần fallback tới size+mtime.
2. **Incremental scan false positives:** File mtime có thể giả mạo → hash vẫn cần khi nghi ngờ.
3. **GC xóa nhầm active snapshot:** Cần guard `activeSnapshotId` không nằm trong delete list.

### Câu hỏi mở:
1. **Trigger autoGC khi nào?** (Storage vượt ngưỡng? Mỗi lần reset snapshot? Định kỳ?)
2. **Keep policy nào tốt hơn?** (Keep N recent? Or age-based? Or hybrid?)
3. **Có cần giữ deleted snapshot reference cho phase 3 (history)?** (Cần lưu `parent_id`)
4. **Fsck có nên auto-repair hay hỏi user trước?** (Recommend: hỏi `-–repair` flag rõ ràng)
5. **Inode cách nào detect platform-specific?** (Dùng `process.platform` check)

### Assumptions:
- File thay đổi nếu size hoặc mtime hoặc inode thay đổi → hash match.
- GC chỉ xóa snapshots không phải active (không xóa state.activeSnapshotId).
- FSCK không modify filesystem, chỉ verify snapshot storage tính toàn vẹn.

---

## 7. Verification

### Functional Tests:
- [ ] Incremental scan lần 2 nhanh hơn lần 1 ≥5x (với 100k files, 90% không đổi).
- [ ] FSCK phát hiện hash mismatch file.
- [ ] FSCK phát hiện missing file trong snapshot.
- [ ] FSCK phát hiện orphan file.
- [ ] FSCK repair mode fix errors.
- [ ] GC xóa snapshots cũ hơn age threshold.
- [ ] GC giữ lại N snapshots gần nhất.
- [ ] GC không xóa active snapshot.
- [ ] AutoGC chỉ chạy sau interval (không spam).

### Performance Benchmarks:
- [ ] 1k files: scan < 100ms (incremental), full < 200ms.
- [ ] 10k files: scan < 500ms (incremental), full < 2s.
- [ ] 100k files: scan < 1s (incremental), full < 10s.
- [ ] FSCK verify 100k files < 5s.

### Edge Cases:
- [ ] Empty project (0 files).
- [ ] Single large file (1GB+).
- [ ] Many small files (1M+ files).
- [ ] Filesystem with symlinks (skip/error handling).
- [ ] Case-insensitive filesystem (macOS/Windows).
- [ ] Files with special characters in path.
- [ ] Permission denied on some files (report warning, continue).

### Integration:
- [ ] `ai-track start` tự động lưu metadata để incremental scan.
- [ ] `ai-track diff` chỉ hash file thay đổi.
- [ ] `ai-track fsck` detect corrupted snapshots.
- [ ] `ai-track gc` cleanup cũ snapshots.
- [ ] CLI commands có help text rõ ràng (`--help`).

---

## 8. Acceptance Criteria

### Phase 1 Completion:
1. ✅ Code pass tất cả tests (unit + integration).
2. ✅ Performance benchmark đạt target (incremental 5x nhanh).
3. ✅ FSCK + GC commands hoạt động đúng.
4. ✅ Backward compatible với snapshot cũ (fallback full scan nếu không có metadata).
5. ✅ README/docs cập nhật hướng dùng.
6. ✅ No breaking changes cho existing API/CLI.

