# Plan: Phase 2 - Tách InspectorPanel thành 5 Tabs riêng biệt

## 1. Context & Goals

**Mục tiêu:** Tách component InspectorPanel.tsx (792 dòng) thành 5 component con độc lập, mỗi cái ~150 dòng, để cải thiện:
- Khả năng bảo trì (mỗi tab có trách nhiệm riêng)
- Tái sử dụng code (các tab có thể import riêng lẻ)
- Khả năng test (dễ unit test từng tab)

**Tabs cần tách:**
1. **DiffTab** - Hiển thị diff file được chọn
2. **HistoryTab** - Danh sách snapshots và graph visualization
3. **HealthTab** - FSCK, GC reports và tools
4. **ReflogTab** - Reflog entries list
5. **SnapshotDrawer** - Drawer chi tiết snapshot (overview/tags/compare)

**Yêu cầu không thay đổi:**
- UI/UX giữ nguyên 100%
- Props structure tương tự
- State management tương tự
- Responsive design

## 2. Hiện trạng

**InspectorPanel.tsx (792 dòng):**
- Chứa 4 Tabs.Panel + 3 Modal/Drawer
- 79 prop đầu vào (quá lớn)
- State tại 1 level: tagInput, noteDraft, confirmState, drawerOpened, drawerTab, compareDiffOpened
- Helper functions: formatTimestamp, shortId, countChildSnapshots, countBranchNodes, labelForDiffType, getDiffLineClass

**Props được truyền:**
- session, selectedChange, diff, canRollback, loading
- history, selectedSnapshotId, snapshotDiffs, selectedSnapshotDiffPath, snapshotDiffText
- lockInfo, fsckReport, gcReport
- 9+ callback functions (onRollback, onRunFsck, etc.)

**Cấu trúc thư mục hiện tại:**
```
web/src/
├── components/
│   ├── DiffPanel.tsx (tồn tại)
│   ├── InspectorPanel.tsx ← cần tách
│   └── ...
├── containers/
│   └── InspectorContainer.tsx ← orchestrator
└── hooks/
    └── useHistoryManager.ts
```

## 3. Phương án đề xuất

### 3.1 Tạo thư mục inspector/ chứa 5 tabs
```
web/src/components/inspector/
├── index.ts                  # Export tất cả components
├── DiffTab.tsx              # ~80 dòng
├── HistoryTab.tsx           # ~160 dòng
├── HealthTab.tsx            # ~100 dòng
├── ReflogTab.tsx            # ~120 dòng
├── SnapshotDrawer.tsx       # ~180 dòng
├── types.ts                 # Shared types
└── helpers.ts               # Helper functions (formatTimestamp, shortId, etc.)
```

### 3.2 Refactor InspectorPanel.tsx
- Giữ nguyên hơn 99% structure (chỉ import từ inspector/)
- Làm orchestrator: tab selection + props passing
- Size: ~100 dòng

### 3.3 Props distribution

**DiffTab:**
```ts
interface DiffTabProps {
  selectedChange: ChangeEntry | null;
  diff: string;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}
```

**HistoryTab:**
```ts
interface HistoryTabProps {
  history: SessionHistoryView | null;
  historyLoading: boolean;
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshotId: string) => void;
  onRefreshHistory: () => void;
  onOpenSnapshotDrawer: () => void;  // callback để mở drawer
}
```

**HealthTab:**
```ts
interface HealthTabProps {
  lockInfo: LockInfo | null;
  fsckReport: FsckReport | null;
  gcReport: GarbageCollectionReport | null;
  loading: boolean;
  onRunFsck: (repair: boolean) => void;
  onRunGc: (dryRun: boolean) => void;
}
```

**ReflogTab:**
```ts
interface ReflogTabProps {
  history: SessionHistoryView | null;
}
```

**SnapshotDrawer:**
```ts
interface SnapshotDrawerProps {
  opened: boolean;
  onClose: () => void;
  selectedSnapshot: SessionHistoryView["snapshots"][0] | null;
  snapshotDiffs: SnapshotDiffEntry[];
  selectedSnapshotDiffPath: string | null;
  snapshotDiffText: string;
  loading: boolean;
  onSelectSnapshotDiffPath: (path: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onCreateTag: (snapshotId: string, tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onSaveNote: (snapshotId: string, content: string) => void;
  onDeleteNote: (snapshotId: string) => void;
}
```

### 3.4 State management
- **InspectorPanel level**: selectedTab (Diff|History|Health|Reflog), drawerOpened, compareDiffOpened
- **SnapshotDrawer level**: drawerTab (overview|metadata|compare), tagInput, noteDraft
- **Confirm dialog**: ở InspectorPanel, truyền confirmState + handler xuống từng tab cần

## 4. Task Breakdown

### Phase 2a: Tạo cấu trúc & helpers
- [ ] Tạo folder `web/src/components/inspector/`
- [ ] Tạo `helpers.ts` với: formatTimestamp, shortId, countChildSnapshots, countBranchNodes, labelForDiffType, getDiffLineClass
- [ ] Tạo `types.ts` với: DiffTabProps, HistoryTabProps, v.v.
- [ ] Tạo `index.ts` export tất cả

### Phase 2b: Tách DiffTab (80 dòng)
- [ ] Tạo `DiffTab.tsx`
- [ ] Copy code từ Tabs.Panel value="diff"
- [ ] Import DiffPanel component
- [ ] Type props, export

### Phase 2c: Tách HealthTab (100 dòng)
- [ ] Tạo `HealthTab.tsx`
- [ ] Copy code từ Tabs.Panel value="health"
- [ ] Handle openConfirm callback truyền từ InspectorPanel
- [ ] Type props, export

### Phase 2d: Tách ReflogTab (120 dòng)
- [ ] Tạo `ReflogTab.tsx`
- [ ] Copy code từ Tabs.Panel value="reflog"
- [ ] Type props, export

### Phase 2e: Tách HistoryTab (160 dòng)
- [ ] Tạo `HistoryTab.tsx`
- [ ] Copy code từ Tabs.Panel value="history"
- [ ] Handle drawer open event
- [ ] Type props, export

### Phase 2f: Tách SnapshotDrawer (180 dòng)
- [ ] Tạo `SnapshotDrawer.tsx`
- [ ] Copy code từ Drawer component
- [ ] State management: drawerTab, tagInput, noteDraft
- [ ] Handle confirm dialog callbacks
- [ ] Type props, export

### Phase 2g: Refactor InspectorPanel (100 dòng)
- [ ] Import 5 tabs từ inspector/
- [ ] State: selectedTab, drawerOpened, compareDiffOpened, confirmState
- [ ] Render: Tabs + conditional panel rendering
- [ ] Modal confirm dialog (giữ nguyên)

### Phase 2h: Test & verification
- [ ] Xem tất cả tabs hoạt động
- [ ] Click tab chuyển view đúng
- [ ] Snapshot drawer open/close đúng
- [ ] Diff/History/Health/Reflog content hiển thị
- [ ] No console errors
- [ ] No type errors

## 5. Files dự kiến ảnh hưởng

**Tạo mới:**
- `web/src/components/inspector/index.ts`
- `web/src/components/inspector/types.ts`
- `web/src/components/inspector/helpers.ts`
- `web/src/components/inspector/DiffTab.tsx`
- `web/src/components/inspector/HistoryTab.tsx`
- `web/src/components/inspector/HealthTab.tsx`
- `web/src/components/inspector/ReflogTab.tsx`
- `web/src/components/inspector/SnapshotDrawer.tsx`

**Cập nhật:**
- `web/src/components/InspectorPanel.tsx` (refactor)
- `web/src/containers/InspectorContainer.tsx` (minimal change)

## 6. Rủi ro & Câu hỏi mở

**Rủi ro:**
- Confirm dialog state truyền qua nhiều component → dễ prop drilling (mitigate: callback pattern)
- SnapshotDrawer state phức tạp (3 drawer states) → có thể tách thêm
- Performance nếu history quá lớn (>500 snapshots)

**Giả định:**
- InspectorContainer không cần thay đổi logic (chỉ import paths)
- DiffPanel.tsx giữ nguyên
- Mantine Tabs component hỗ trợ đủ props

**Câu hỏi để xác nhận:**
- Confirm dialog có cần tách thành component riêng không? (Hiện không, giữ ở InspectorPanel)
- Có cần optimize history list pagination không? (Hiện không, giữ slice(0, 12))

## 7. Verification

**Checklist kiểm chứng:**
- [ ] Build pass (npm run build)
- [ ] No TypeScript errors
- [ ] No console errors khi navigate tabs
- [ ] Diff tab: chọn file, xem diff, rollback button hoạt động
- [ ] History tab: xem snapshot list, click mở drawer
- [ ] Health tab: xem lock info, run FSCK/GC buttons hoạt động
- [ ] Reflog tab: xem reflog entries
- [ ] SnapshotDrawer:
  - [ ] Overview tab: xem snapshot info + restore button
  - [ ] Tags & note tab: add/delete tags, save/delete note
  - [ ] Compare tab: xem diff files, click xem chi tiết diff
- [ ] Confirm dialog: tất cả confirm actions (restore, delete, etc.) hoạt động
- [ ] Props types match (no type errors)
- [ ] Performance: smooth khi toggle tabs

---

**Status:** Ready for implementation
**Estimated effort:** 2-3 hours
**Complexity:** Low (pure refactoring, no logic change)
