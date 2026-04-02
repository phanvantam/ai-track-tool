# Checklist: UI Modernization - Thực Thi Toàn Bộ

## Phase 1: Refactor Cấu Trúc (Days 1-5)

### 1.1 Setup thư mục + Hooks
- [ ] Tạo `src/hooks/` folder
- [ ] Tạo `src/hooks/useSessionManager.ts`
  - [ ] loadSessions function
  - [ ] addSession function
  - [ ] removeSession function
  - [ ] switchSession function
- [ ] Tạo `src/hooks/useHistoryManager.ts`
  - [ ] loadHistory function
  - [ ] loadHistoryDiff function
  - [ ] selectSnapshot function
- [ ] Tạo `src/hooks/useDiffManager.ts`
  - [ ] loadCurrentDiff function
  - [ ] selectFile function
- [ ] Tạo `src/hooks/useConfigManager.ts`
  - [ ] loadConfig function
  - [ ] saveConfig function
- [ ] Tạo `src/hooks/useConfirmDialog.ts`
  - [ ] Dialog state management
  - [ ] Confirm/cancel handlers

### 1.2 Container Components
- [ ] Tạo `src/containers/` folder
- [ ] Tạo `src/containers/SessionContainer.tsx`
  - [ ] SessionState management (gọi hook)
  - [ ] ProjectToolbar rendering
- [ ] Tạo `src/containers/FileTreeContainer.tsx`
  - [ ] FileTree wrapper
  - [ ] Selected path management
- [ ] Tạo `src/containers/InspectorContainer.tsx`
  - [ ] Tab state management
  - [ ] 5 tabs rendering
- [ ] Tạo `src/containers/MainLayout.tsx`
  - [ ] AppShell layout
  - [ ] Grid layout

### 1.3 Dialog/Modal Components
- [ ] Tạo `src/components/dialogs/` folder
- [ ] Tạo `src/components/dialogs/ConfirmDialog.tsx` (generic)
  - [ ] Props: title, message, onConfirm, onCancel
  - [ ] Confirm/Cancel buttons
- [ ] Tạo `src/components/dialogs/AddProjectModal.tsx`
  - [ ] Input path
  - [ ] Loading state
- [ ] Tạo `src/components/dialogs/SettingsModal.tsx`
  - [ ] Config form
  - [ ] Save config
- [ ] Tạo `src/components/dialogs/GuideModal.tsx`
  - [ ] Help content

### 1.4 Refactor App.tsx
- [ ] Import hooks + containers
- [ ] Gọi useSessionManager hook
- [ ] Gọi useHistoryManager hook
- [ ] Gọi useDiffManager hook
- [ ] Gọi useConfigManager hook
- [ ] Gọi useConfirmDialog hook
- [ ] Render MainLayout
- [ ] Test: Session list, switch, diff không bị lỗi
- [ ] App.tsx giảm từ 940 → 150 dòng ✓

---

## Phase 2: Tách InspectorPanel (Days 6-10)

### 2.1 Tạo Inspector Tabs
- [ ] Tạo `src/components/inspector/` folder
- [ ] Tạo `src/components/inspector/DiffTab.tsx` (150 dòng)
  - [ ] Diff viewer
  - [ ] File patch rendering
- [ ] Tạo `src/components/inspector/HistoryTab.tsx` (150 dòng)
  - [ ] Snapshot list
  - [ ] History graph
  - [ ] Select snapshot
- [ ] Tạo `src/components/inspector/HealthTab.tsx` (100 dòng)
  - [ ] Fsck report display
  - [ ] Run fsck button
- [ ] Tạo `src/components/inspector/ReflogTab.tsx` (100 dòng)
  - [ ] Reflog entries list
  - [ ] Pagination
- [ ] Tạo `src/components/inspector/SnapshotDrawer.tsx` (150 dòng)
  - [ ] Snapshot details
  - [ ] Actions: restore, delete, tag

### 2.2 Tách Hooks Inspector
- [ ] Tạo `src/hooks/useSnapshotHistory.ts`
  - [ ] Load history data
  - [ ] Filter/search snapshots
- [ ] Tạo `src/hooks/useDiffRenderer.ts`
  - [ ] Format diff lines
  - [ ] Syntax highlighting prep

### 2.3 Update InspectorPanel.tsx
- [ ] Import 5 tabs components
- [ ] Import useSnapshotHistory
- [ ] Refactor to tab orchestrator (50 dòng)
  - [ ] Tab state (selectedTab)
  - [ ] Render tabs
- [ ] Test: Tất cả tabs hoạt động

### 2.4 InspectorPanel giảm từ 792 → 50 dòng ✓

---

## Phase 3: Design System + CSS (Days 11-13)

### 3.1 Design Tokens
- [ ] Tạo `src/styles/tokens.css`
  - [ ] Colors: bg-primary, bg-secondary, bg-tertiary, border, text-*
  - [ ] Spacing: xs (4px), sm (8px), md (16px), lg (24px), xl (32px)
  - [ ] Radius: sm (6px), md (10px), lg (16px)
  - [ ] Shadows, transitions, fonts
- [ ] Verify tokens in DevTools

### 3.2 CSS Modules
- [ ] Tạo `src/styles/layout.module.css`
  - [ ] AppShell, Grid, Splitter styles
- [ ] Tạo `src/styles/components/button.module.css`
- [ ] Tạo `src/styles/components/card.module.css`
- [ ] Tạo `src/styles/components/badge.module.css`
- [ ] Tạo `src/styles/components/tree.module.css`
- [ ] Tạo `src/styles/components/modal.module.css`

### 3.3 Migrate Styles
- [ ] Update App.tsx import tokens + modules
- [ ] Update components use CSS modules
- [ ] Remove magic colors từ inline styles
- [ ] Verify theme still dark ✓

### 3.4 Refactor styles.css
- [ ] Giảm từ 665 → 100 dòng (global resets + base)
- [ ] Move component styles → modules

---

## Phase 4: UX Layer (Days 14-17)

### 4.1 Splitter Resizable
- [ ] npm i react-resizable-panels
- [ ] Add splitter vào MainLayout
  - [ ] FileTree (380px default) ↔ Inspector
  - [ ] Draggable
- [ ] localStorage: save FileTree width
- [ ] Test: Drag resize FileTree, reload → width persist ✓

### 4.2 Command Palette
- [ ] npm i cmdk (hoặc tự build nhẹ)
- [ ] Tạo `src/components/CommandPalette.tsx`
  - [ ] Ctrl+K mở
  - [ ] Search file quick
  - [ ] Show recent actions
- [ ] Integrate vào App.tsx
- [ ] Test: Ctrl+K mở/đóng ✓

### 4.3 Responsive Layout
- [ ] Update MainLayout CSS
  - [ ] Desktop (>1024px): FileTree left, Inspector right (default)
  - [ ] Tablet (640-1024px): Stack vertical hoặc drawer
  - [ ] Mobile (<640px): Tab qua lại
- [ ] Test 3 breakpoints trên DevTools

### 4.4 Keyboard Shortcuts
- [ ] npm i react-hotkeys-hook
- [ ] Implement shortcuts:
  - [ ] Tab navigate files
  - [ ] Enter open details
  - [ ] Esc close modal
  - [ ] Ctrl+S save config
- [ ] Test tất cả shortcuts ✓

---

## Phase 5: Performance Optimization (Days 18-20)

### 5.1 Virtualization
- [ ] npm i react-window
- [ ] FileTree: virtualize 1000+ files
  - [ ] Test với 1000+ mock files
- [ ] HistoryTab: virtualize snapshots
  - [ ] Test với 100+ snapshots
- [ ] ReflogTab: virtualize entries

### 5.2 Lazy Loading
- [ ] Health tab: load chỉ khi active
- [ ] Reflog tab: load chỉ khi active
- [ ] Snapshot details: load on demand

### 5.3 Memoization
- [ ] React.memo TreeNode
- [ ] useMemo diff calculation
- [ ] useMemo history graph render

### 5.4 Performance Audit
- [ ] Chrome DevTools: LCP < 2s ✓
- [ ] FCP < 1s ✓
- [ ] No layout shifts ✓

---

## Post-Implementation Tests

### Functional Tests
- [ ] Session add/remove/switch
- [ ] File tree select/deselect
- [ ] Diff viewer show correct patch
- [ ] History tab load snapshots
- [ ] Health tab run fsck
- [ ] Reflog tab show entries
- [ ] Snapshot drawer actions (restore, delete, tag)
- [ ] Config save/load
- [ ] All modals open/close
- [ ] All keyboard shortcuts work

### UI/UX Tests
- [ ] Dark theme consistent
- [ ] Font sizes readable
- [ ] Spacing (padding/margin) balanced
- [ ] Colors accessible (contrast ratio ≥ 4.5:1)
- [ ] Splitter drag smooth
- [ ] Command palette responsive
- [ ] Mobile layout stacks correctly
- [ ] Touch targets ≥ 44px

### Performance Tests
- [ ] LCP < 2s
- [ ] FCP < 1s
- [ ] First input delay < 100ms
- [ ] Virtual scroll 1000+ items smooth
- [ ] No memory leaks

### Accessibility Tests
- [ ] Tab navigate all interactive elements
- [ ] Screen reader announces labels
- [ ] Focus visible
- [ ] No keyboard traps
- [ ] Modal backdrop + focus trap

### Regression Tests
- [ ] Existing features still work
- [ ] No console errors
- [ ] No broken styles
- [ ] Network requests same count

---

## Code Review Checklist

- [ ] App.tsx < 200 dòng
- [ ] Hooks pure functions (no side effects outside useEffect)
- [ ] Components < 300 dòng mỗi cái
- [ ] CSS modules scoped (no global pollution)
- [ ] No magic numbers (use tokens)
- [ ] Comments explain why, not what
- [ ] Consistent naming conventions
- [ ] No console.log left
- [ ] TypeScript strict mode (no `any`)

---

## Completion Criteria

✓ Phase 1: App.tsx 940 → 150 dòng
✓ Phase 2: InspectorPanel 792 → 50 dòng
✓ Phase 3: CSS 665 → 100 dòng + modular
✓ Phase 4: Modern UX (splitter, cmd palette, responsive)
✓ Phase 5: Performance optimized (virtualization)
✓ All tests passing
✓ No regressions
✓ Documentation updated
