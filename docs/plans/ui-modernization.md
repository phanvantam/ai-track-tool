# Plan: UI Modernization - Refactor & Tối Ưu Hóa

## 1. Context & Goals

**Mục tiêu chính:**
- Refactor App.tsx (940 dòng) → modular architecture
- Tách InspectorPanel (792 dòng) thành tabs riêng
- Tạo design system với CSS tokens
- Cải tiến UX: splitter, command palette, virtualization
- Tăng tính bảo trì, performance, accessibility

**Giá trị mang lại:**
- Giảm complexity từ 940 → 150 dòng (App.tsx)
- Tăng reusability component từ 1 lần → 5+ lần dùng
- Tăng performance khi scale (1000+ files, snapshots)
- UX modern → mobile-friendly

---

## 2. Hiện Trạng

### Vấn đề cấu trúc:
- **App.tsx**: 940 dòng, 45+ state hooks, logic lộn xộn
- **InspectorPanel**: 792 dòng, ghi 5 tabs (Diff/History/Health/Reflog/Snapshot)
- **State management**: 3 chain useEffect, race condition tiềm ẩn
- **CSS**: 665 dòng vanilla, magic numbers, không có tokens
- **Layout**: Grid cứng 380px, không resize được

### Performance issues:
- Diff viewer render từng dòng riêng rẽ
- History graph 12 node cứng
- Sidebar component không dùng

---

## 3. Phương Án Đề Xuất

### Phase 1: Refactor Cấu Trúc (Tuần 1-2)
**Mục tiêu:** App.tsx → 150 dòng + hooks + containers

**Tasks:**
1. Tạo custom hooks:
   - `useSessionManager` (load sessions, switch, CRUD)
   - `useHistoryManager` (fetch history, diff, snapshot)
   - `useDiffManager` (current file diff state)
   - `useConfigManager` (config CRUD)
   - `useConfirmDialog` (generic confirm logic)

2. Tách component container:
   - `SessionContainer` (quản lý session list + toolbar)
   - `FileTreeContainer` (wrapper FileTree)
   - `InspectorContainer` (orchestrator 5 tabs)
   - `MainLayout` (page structure)

3. Tách modal/dialog:
   - `ConfirmDialog` (generic)
   - `AddProjectModal`
   - `SettingsModal`
   - `GuideModal`

### Phase 2: Tách InspectorPanel (Tuần 2-3)
**Mục tiêu:** 792 dòng → 5 component ~150 dòng mỗi cái

**Tasks:**
1. Tách inspector tabs:
   - `DiffTab.tsx` (current file diff)
   - `HistoryTab.tsx` (snapshot history + graph)
   - `HealthTab.tsx` (fsck report)
   - `ReflogTab.tsx` (reflog entries)
   - `SnapshotDrawer.tsx` (chi tiết snapshot)

2. Tạo `InspectorPanel.tsx` gọn (chỉ tab orchestrator)

3. Tách hooks inspector:
   - `useSnapshotHistory` (load, filter, search)
   - `useDiffRenderer` (diff calculation)

### Phase 3: Design System + CSS Tokens (Tuần 3)
**Mục tiêu:** 665 dòng CSS → modular + tokens

**Tasks:**
1. Tạo `styles/tokens.css`:
   - Colors: bg-primary, bg-secondary, border, text-*
   - Spacing: xs, sm, md, lg, xl
   - Radius: sm, md, lg
   - Shadows, fonts, transitions

2. Tách CSS modules:
   - `styles/layout.module.css`
   - `styles/components/button.module.css`
   - `styles/components/card.module.css`
   - `styles/components/badge.module.css`
   - `styles/components/tree.module.css`
   - `styles/components/modal.module.css`

3. Lồng tokens vào styles

### Phase 4: UX Layer (Tuần 4)
**Mục tiêu:** Modern, responsive, interactive

**Tasks:**
1. Splitter resizable (react-resizable-panels):
   - FileTree ↔ Inspector draggable
   - Lưu width vào localStorage

2. Command palette:
   - Ctrl+K mở search file nhanh
   - Ctrl+P history search

3. Responsive layout:
   - Desktop: FileTree trái, Inspector phải
   - Mobile: Tab qua lại

4. Keyboard shortcuts:
   - Tab navigate files
   - Enter mở chi tiết
   - Esc đóng modal

### Phase 5: Performance Optimization (Tuần 5)
**Mục tiêu:** Scale đến 1000+ items

**Tasks:**
1. Virtualization:
   - FileTree: react-window 1000+ files
   - History: virtualize snapshots
   - Reflog: virtualize entries

2. Lazy tab loading:
   - Health/Reflog tab chỉ load khi active

3. Memoization:
   - React.memo TreeNode
   - useMemo diff calculation

---

## 4. Task Breakdown

### Phase 1: Refactor
- [ ] Tạo thư mục `src/hooks/` + 5 custom hooks
- [ ] Tạo thư mục `src/containers/` + 4 components
- [ ] Tạo thư mục `src/components/dialogs/` + 4 modals
- [ ] Refactor App.tsx gọi hooks + containers
- [ ] Test: Toàn bộ flows ngành ng không thay đổi

### Phase 2: Tách Inspector
- [ ] Tạo `src/components/inspector/` + 5 tabs
- [ ] Tách `useSnapshotHistory` hook
- [ ] Tách `useDiffRenderer` hook
- [ ] Update InspectorContainer gọi tabs
- [ ] Test: Diff/History/Health/Reflog tabs

### Phase 3: Design System
- [ ] Tạo `src/styles/tokens.css`
- [ ] Tạo `src/styles/layout.module.css`
- [ ] Tạo `src/styles/components/` folder + modules
- [ ] Update App.tsx import tokens
- [ ] Thay thế inline styles → CSS modules

### Phase 4: UX
- [ ] npm i react-resizable-panels
- [ ] Thêm splitter MainLayout
- [ ] Implement command palette
- [ ] Responsive breakpoints
- [ ] Keyboard shortcuts handler

### Phase 5: Performance
- [ ] npm i react-window
- [ ] Virtualize FileTree
- [ ] Virtualize History list
- [ ] Lazy load Health/Reflog tabs

---

## 5. Files Dự Kiến Ảnh Hưởng

### Tạo mới:
```
src/
  hooks/
    useSessionManager.ts
    useHistoryManager.ts
    useDiffManager.ts
    useConfigManager.ts
    useConfirmDialog.ts
    useSnapshotHistory.ts
    useDiffRenderer.ts
  containers/
    SessionContainer.tsx
    FileTreeContainer.tsx
    InspectorContainer.tsx
    MainLayout.tsx
  components/
    dialogs/
      ConfirmDialog.tsx
      AddProjectModal.tsx
      SettingsModal.tsx
      GuideModal.tsx
    inspector/
      DiffTab.tsx
      HistoryTab.tsx
      HealthTab.tsx
      ReflogTab.tsx
      SnapshotDrawer.tsx
  styles/
    tokens.css
    layout.module.css
    components/
      button.module.css
      card.module.css
      badge.module.css
      tree.module.css
      modal.module.css
```

### Chỉnh sửa:
- `src/App.tsx` (940 → 150 dòng)
- `src/components/InspectorPanel.tsx` (792 → 50 dòng)
- `src/styles.css` (665 → 100 dòng, move to modules)

### Xóa:
- `src/components/Sidebar.tsx` (unused)

---

## 6. Rủi Ro & Câu Hỏi Mở

| Rủi ro | Giảm thiểu |
|--------|-----------|
| State không đồng bộ khi refactor | Unit test từng hook riêng |
| Performance drop khi virtual | Profile before/after |
| Breakpoint responsive quá phức | Mobile-first, 3 breakpoints xs/sm/md/lg |
| CSS modules không consistent | Linting + component storybook |

**Câu hỏi mở:**
- Dùng Tailwind hay CSS modules? → CSS modules (không add dependency)
- Virtualize khi nào? → Khi 100+ items
- Mobile UI cần ntn? → Tab drawer hoặc vertical stack

---

## 7. Verification

**Test checklist:**
- [ ] Session load/switch không bị lỗi
- [ ] Diff/History/Health/Reflog tabs hoạt động đúng
- [ ] Modal không bị lồng nhau
- [ ] Responsive desktop/tablet/mobile
- [ ] Keyboard shortcuts hoạt động
- [ ] Performance LCP < 2s, FCP < 1s
- [ ] Accessibility: tab order, ARIA labels
- [ ] Theme tokens thay đổi → màu đổi ngay

---

## Timeline

| Phase | Duration | Result |
|-------|----------|--------|
| 1. Refactor | 5 days | App.tsx 150 dòng |
| 2. Inspector | 5 days | 5 tabs riêng |
| 3. Design System | 3 days | CSS tokens |
| 4. UX | 4 days | Splitter, command palette |
| 5. Performance | 3 days | Virtualization |
| **Total** | **20 days** | **Modern, maintainable UI** |

---

## Kết luận

Refactor từ cơ bản lên UX, không rewrite toàn bộ. Ưu tiên Phase 1-2 (cấu trúc), sau đó tối ưu UX/Performance.
