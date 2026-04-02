# Phase 5: Performance Optimization Checklist

**MỤC TIÊU:** Tối ưu hiệu năng với Virtualization, Lazy Loading, Memoization

**NGÀY BẮT ĐẦU:** 2026-04-02

---

## 1. CẢI CHUẨN BỊ & DEPENDENCIES

- [ ] 1.1 - Cài đặt react-window: `npm install react-window`
- [ ] 1.2 - Cài đặt @types/react-window: `npm install --save-dev @types/react-window`
- [ ] 1.3 - Kiểm tra npm install thành công, không lỗi
- [ ] 1.4 - Chạy build kiểm tra không có lỗi sau khi thêm dependencies

---

## 2. VIRTUALIZATION FILETREE

- [ ] 2.1 - Phân tích cấu trúc FileTree component hiện tại
- [ ] 2.2 - Tạo VirtualFileTree component sử dụng FixedSizeList
- [ ] 2.3 - Cấu hình itemSize=32px, outerElementType=DIV
- [ ] 2.4 - Migrate TreeNode render logic sang VirtualFileTree
- [ ] 2.5 - Thêm itemData: { files, selectedPath, onSelect }
- [ ] 2.6 - Kiểm tra scroll smooth, không có DOM leak
- [ ] 2.7 - Test với 1000+ mock files, verify 60fps scroll
- [ ] 2.8 - Chạy typecheck & lint, sửa lỗi nếu có

---

## 3. VIRTUALIZATION HISTORYTAB

- [ ] 3.1 - Phân tích cấu trúc HistoryTab snapshots hiện tại
- [ ] 3.2 - Tạo VirtualSnapshotList component sử dụng VariableSizeList
- [ ] 3.3 - Cấu hình itemSize=80px cho mỗi snapshot item
- [ ] 3.4 - Migrate SnapshotItem render logic
- [ ] 3.5 - Thêm search filter seamless với virtual list
- [ ] 3.6 - Test với 100+ snapshots, verify scroll smooth
- [ ] 3.7 - Kiểm tra selection, expand/collapse logic
- [ ] 3.8 - Chạy typecheck & lint

---

## 4. VIRTUALIZATION REFLOGTAB

- [ ] 4.1 - Phân tích cấu trúc ReflogTab hiện tại
- [ ] 4.2 - Tạo VirtualReflogList component sử dụng VariableSizeList
- [ ] 4.3 - Cấu hình itemSize=48px cho reflog entry
- [ ] 4.4 - Migrate ReflogEntry render logic
- [ ] 4.5 - Test scroll performance với large lists
- [ ] 4.6 - Chạy typecheck & lint

---

## 5. LAZY LOADING TABS

- [ ] 5.1 - Phân tích HealthTab: identify runFsck() bottleneck
- [ ] 5.2 - Phân tích ReflogTab: heavy rendering, not frequently used
- [ ] 5.3 - Thêm activeTab state trong InspectorPanel
- [ ] 5.4 - Implement conditional render cho HealthTab: `{activeTab === 'Health' && <HealthTab />}`
- [ ] 5.5 - Implement conditional render cho ReflogTab
- [ ] 5.6 - Thêm useEffect load data when tab becomes active
  - [ ] 5.6.1 - HealthTab: loadFsck() when activeTab === 'Health'
  - [ ] 5.6.2 - ReflogTab: loadReflog() when activeTab === 'Reflog'
- [ ] 5.7 - Kiểm tra tab switching: no initial render delay
- [ ] 5.8 - Chạy typecheck & lint

---

## 6. MEMOIZATION - React.memo

- [ ] 6.1 - Wrap TreeNode với React.memo
- [ ] 6.2 - Implement custom comparator cho TreeNode (path, selectedPath, isExpanded)
- [ ] 6.3 - Wrap SnapshotItem với React.memo
- [ ] 6.4 - Implement custom comparator cho SnapshotItem (id, isSelected)
- [ ] 6.5 - Wrap ReflogEntry với React.memo
- [ ] 6.6 - Verify memo props đúng, không re-render không cần thiết
- [ ] 6.7 - Chạy typecheck & lint

---

## 7. MEMOIZATION - useMemo

- [ ] 7.1 - Thêm useMemo trong DiffTab cho parseDiffText(diffText)
- [ ] 7.2 - Thêm useMemo trong HistoryTab cho filtered snapshots (search query)
- [ ] 7.3 - Thêm useMemo trong HealthTab nếu có expensive calculation
- [ ] 7.4 - Kiểm tra dependency array chính xác
- [ ] 7.5 - Verify useMemo giúp giảm re-compute
- [ ] 7.6 - Chạy typecheck & lint

---

## 8. USEABILITY - useCallback

- [ ] 8.1 - Thêm useCallback cho handleSelectFile trong FileTree
- [ ] 8.2 - Thêm useCallback cho handleSelectSnapshot trong HistoryTab
- [ ] 8.3 - Thêm useCallback cho tab switch handler
- [ ] 8.4 - Kiểm tra dependency array chính xác
- [ ] 8.5 - Verify không có stale closure bugs
- [ ] 8.6 - Chạy typecheck & lint

---

## 9. CODE SPLITTING (Optional)

- [ ] 9.1 - Implement lazy() cho DiffTab
- [ ] 9.2 - Implement lazy() cho HistoryTab
- [ ] 9.3 - Implement lazy() cho HealthTab
- [ ] 9.4 - Implement lazy() cho ReflogTab
- [ ] 9.5 - Thêm Suspense wrapper với loading fallback
- [ ] 9.6 - Kiểm tra chunk files được tạo đúng
- [ ] 9.7 - Verify initial bundle size giảm

---

## 10. PERFORMANCE MEASUREMENT

- [ ] 10.1 - Mở Chrome DevTools Performance tab
- [ ] 10.2 - Record trace khi scroll FileTree (1000+ files)
- [ ] 10.3 - Verify FCP < 1s
- [ ] 10.4 - Verify LCP < 2s
- [ ] 10.5 - Verify CLS < 0.1
- [ ] 10.6 - Verify FID < 100ms
- [ ] 10.7 - Record trace khi scroll HistoryTab (100+ snapshots)
- [ ] 10.8 - Verify smooth 60fps scroll
- [ ] 10.9 - Kiểm tra memory usage ổn định (no leaks)

---

## 11. BUNDLE ANALYSIS

- [ ] 11.1 - Chạy `npm run build:web`
- [ ] 11.2 - Cài đặt source-map-explorer: `npm install -g source-map-explorer`
- [ ] 11.3 - Chạy `source-map-explorer 'web/dist/**/*.js'`
- [ ] 11.4 - Kiểm tra vendor bundle size (expected large)
- [ ] 11.5 - Kiểm tra app bundle < 100KB
- [ ] 11.6 - Kiểm tra component chunks < 50KB mỗi cái
- [ ] 11.7 - So sánh bundle size before/after (document kết quả)

---

## 12. TESTING & VERIFICATION

- [ ] 12.1 - FileTree 1000+ files: scroll mượt (60fps)
- [ ] 12.2 - HistoryTab 100+ snapshots: không lag
- [ ] 12.3 - ReflogTab large list: scroll nhanh
- [ ] 12.4 - Health tab: load on first active, no initial delay
- [ ] 12.5 - Reflog tab: load on first active
- [ ] 12.6 - Không có console errors
- [ ] 12.7 - Memory usage stable (no gradual increase during scroll)
- [ ] 12.8 - Bundle size analyzed & documented

---

## 13. DOCUMENTATION & CLEANUP

- [ ] 13.1 - Viết comments cho VirtualFileTree component
- [ ] 13.2 - Viết comments cho VirtualSnapshotList component
- [ ] 13.3 - Viết comments cho lazy loading logic
- [ ] 13.4 - Thêm JSDoc cho memoization functions
- [ ] 13.5 - Cập nhật docs/performance.md với optimization techniques
- [ ] 13.6 - Tạo BEFORE/AFTER performance report
- [ ] 13.7 - Chạy final typecheck & lint

---

## 14. FINAL CHECKS

- [ ] 14.1 - Chạy `npm run typecheck`
- [ ] 14.2 - Chạy `npm run lint`
- [ ] 14.3 - Chạy `npm run build:web` - build thành công
- [ ] 14.4 - Chạy `npm run build:cli` - build thành công
- [ ] 14.5 - Không có warnings
- [ ] 14.6 - Git status clean (all changes committed or staged)

---

## Execution Log

| Step | Status | Notes | Timestamp |
|------|--------|-------|-----------|
| Start | [-] | Beginning Phase 5 execution | 2026-04-02 |
