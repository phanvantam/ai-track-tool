# Checklist: Tự động theo dõi và giao diện tương tác cho AI Track

## 1. Làm rõ yêu cầu

- [x] Xác nhận `watch` là luồng dùng chính cho người dùng cuối.
- [x] Xác nhận `start`, `diff`, `ui`, `rollback` cũ vẫn phải giữ tương thích.
- [x] Xác nhận `watch` sẽ tự tạo snapshot khi chưa có state.
- [x] Xác nhận `ui` chạy trực tiếp chưa cần tự tạo snapshot ở pha này.
- [x] Xác nhận `s` trong UI sẽ thay active snapshot bằng baseline mới.

## 2. Khảo sát hiện trạng

- [x] Đọc lại `src/cli.ts` để xác định điểm thêm command `watch`.
- [x] Đọc lại `src/commands/ui.ts` để xác định phần cần tách state.
- [x] Đọc lại `src/core/snapshot.ts` để tái sử dụng logic tạo snapshot.
- [x] Đọc lại `src/core/compare.ts` để tái sử dụng logic re-scan và change list.
- [x] Đọc lại `src/core/state.ts` để xác định cách kiểm tra snapshot active.

## 3. Core watch

- [x] Thêm kiểu dữ liệu cần thiết cho watch state trong `src/types.ts`.
- [x] Tạo `src/core/watch.ts` để bọc `fs.watch`.
- [x] Thêm hàm subscribe watcher theo `targetPath`.
- [x] Thêm debounce cho refresh khi nhận nhiều event liên tiếp.
- [x] Thêm cơ chế fallback refresh định kỳ an toàn.
- [x] Thêm cách dừng watcher sạch khi thoát UI.

## 4. Snapshot lifecycle

- [x] Thêm hàm kiểm tra state hiện có cho `targetPath`.
- [x] Thêm hàm tạo snapshot nếu chưa có active snapshot.
- [x] Thêm hàm reset snapshot để chấp nhận trạng thái hiện tại làm baseline mới.
- [x] Đảm bảo reset snapshot cập nhật `state.json` đúng.
- [x] Đảm bảo `diff` tiếp tục đọc snapshot active mới nhất.

## 5. Command layer

- [x] Thêm command `ai-track watch --path <dir>` trong `src/cli.ts`.
- [x] Tạo `src/commands/watch.ts`.
- [x] Cho `watch` tự tạo snapshot nếu chưa có state.
- [x] Cho `watch` mở UI ngay sau khi chuẩn bị state.
- [x] Giữ nguyên hành vi các command cũ.

## 6. UI stateful

- [x] Tách UI hiện tại thành state có thể refresh nhiều lần.
- [x] Giữ selection hợp lệ sau mỗi lần refresh.
- [x] Tự cập nhật danh sách thay đổi khi watcher báo event.
- [x] Tự cập nhật khung diff theo file đang chọn.
- [x] Thêm thanh trạng thái hiển thị `targetPath`.
- [x] Thêm thanh trạng thái hiển thị snapshot active.
- [x] Thêm thanh trạng thái hiển thị số file changed.
- [x] Thêm thanh trạng thái hiển thị trạng thái watcher.
- [x] Thêm thông báo ngắn sau rollback.
- [x] Thêm phím `R` để refresh thủ công.
- [x] Thêm phím `s` để reset snapshot.
- [x] Thêm cảnh báo ngắn khi reset snapshot thành công.

## 7. Tương tác rollback

- [x] Đảm bảo `r` rollback file đang chọn vẫn hoạt động sau khi UI stateful.
- [x] Tự refresh danh sách sau rollback.
- [x] Tự chọn file hợp lệ kế tiếp nếu file cũ không còn thay đổi.
- [x] Đảm bảo rollback không làm vỡ watcher đang chạy.

## 8. Test

- [x] Cập nhật test snapshot cho luồng reset snapshot.
- [x] Viết test cho kiểm tra state hiện có.
- [x] Viết test cho `watch` tự tạo snapshot khi chưa có state.
- [x] Viết test cho debounce refresh.
- [x] Viết test cho reset snapshot xóa trạng thái diff hiện tại.
- [x] Viết test cho command `watch` không làm vỡ command cũ.
- [x] Chạy `npm run build`.
- [x] Chạy `npm test`.

## 9. Manual verification

- [x] Chạy `watch --path <dir>` trên thư mục mẫu chưa có state.
- [x] Kiểm tra snapshot được tạo tự động.
- [!] Sửa file và xác nhận UI tự cập nhật.
- [!] Thêm file và xác nhận UI tự cập nhật.
- [!] Xóa file và xác nhận UI tự cập nhật.
- [!] Dùng `r` để rollback file và xác nhận UI cập nhật lại.
- [!] Dùng `s` để tạo baseline mới và xác nhận diff về rỗng.
- [x] Kiểm tra `diff --path <dir>` vẫn đúng sau khi reset snapshot.

## 10. Docs

- [x] Cập nhật `README.md` để đưa `watch` thành cách dùng chính.
- [x] Giảm ví dụ thao tác tay nhiều bước trong `README.md`.
- [x] Thêm mô tả phím tắt UI mới.
- [x] Ghi rõ giới hạn của `fs.watch` và cơ chế refresh fallback.

## 11. Đóng task

- [x] Rà soát diff để giữ phạm vi nhỏ nhất.
- [x] Rà soát lại hành vi command cũ không bị vỡ.
- [x] Ghi rõ điểm còn `unknown` nếu chưa xử lý được.

## Execution Log

| Step | Status | Notes | Timestamp |
|------|--------|-------|-----------|
| 1.1  | [x]    | Chốt `watch` là luồng chính | 2026-04-01 21:12 |
| 1.2  | [x]    | Giữ tương thích command cũ | 2026-04-01 21:12 |
| 1.3  | [x]    | `watch` tự tạo snapshot | 2026-04-01 21:12 |
| 1.4  | [x]    | `ui` trực tiếp không tự tạo snapshot | 2026-04-01 21:12 |
| 1.5  | [x]    | `s` thay active snapshot | 2026-04-01 21:12 |
| 2.1  | [x]    | Đã rà `src/cli.ts` | 2026-04-01 21:12 |
| 2.2  | [x]    | Đã rà `src/commands/ui.ts` | 2026-04-01 21:12 |
| 2.3  | [x]    | Đã rà `src/core/snapshot.ts` | 2026-04-01 21:12 |
| 2.4  | [x]    | Đã rà `src/core/compare.ts` | 2026-04-01 21:12 |
| 2.5  | [x]    | Đã rà `src/core/state.ts` | 2026-04-01 21:12 |
| 3.1  | [x]    | Thêm `WatchStatus` và `WatchController` | 2026-04-01 21:22 |
| 3.2  | [x]    | Tạo `src/core/watch.ts` | 2026-04-01 21:22 |
| 3.3  | [x]    | Có subscribe watcher theo `targetPath` | 2026-04-01 21:22 |
| 3.4  | [x]    | Có debounce refresh | 2026-04-01 21:22 |
| 3.5  | [x]    | Có fallback refresh định kỳ | 2026-04-01 21:22 |
| 3.6  | [x]    | Watcher dừng sạch khi thoát UI | 2026-04-01 21:22 |
| 4.1  | [x]    | Thêm `readStateIfExists` và `hasState` | 2026-04-01 21:22 |
| 4.2  | [x]    | Thêm `ensureSnapshot` | 2026-04-01 21:22 |
| 4.3  | [x]    | Thêm `resetSnapshot` | 2026-04-01 21:22 |
| 4.4  | [x]    | Reset snapshot cập nhật state đúng | 2026-04-01 21:22 |
| 4.5  | [x]    | `diff` đọc active snapshot mới | 2026-04-01 21:22 |
| 5.1  | [x]    | Thêm command `watch` | 2026-04-01 21:22 |
| 5.2  | [x]    | Tạo `src/commands/watch.ts` | 2026-04-01 21:22 |
| 5.3  | [x]    | `watch` tự tạo snapshot | 2026-04-01 21:22 |
| 5.4  | [x]    | `watch` mở UI ngay sau chuẩn bị state | 2026-04-01 21:22 |
| 5.5  | [x]    | Command cũ vẫn build và test pass | 2026-04-01 21:22 |
| 6.1  | [x]    | UI chuyển sang stateful | 2026-04-01 21:22 |
| 6.2  | [x]    | Giữ selection theo path | 2026-04-01 21:22 |
| 6.3  | [x]    | UI reload khi watcher báo event | 2026-04-01 21:22 |
| 6.4  | [x]    | Diff sync theo file đang chọn | 2026-04-01 21:22 |
| 6.5  | [x]    | Có status `targetPath` | 2026-04-01 21:22 |
| 6.6  | [x]    | Có status snapshot active | 2026-04-01 21:22 |
| 6.7  | [x]    | Có status số file changed | 2026-04-01 21:22 |
| 6.8  | [x]    | Có status watcher | 2026-04-01 21:22 |
| 6.9  | [x]    | Có thông báo sau rollback | 2026-04-01 21:22 |
| 6.10 | [x]    | Thêm phím `R` | 2026-04-01 21:22 |
| 6.11 | [x]    | Thêm phím `s` | 2026-04-01 21:22 |
| 6.12 | [x]    | Có thông báo baseline mới | 2026-04-01 21:22 |
| 7.1  | [x]    | `r` vẫn gọi rollback trong UI | 2026-04-01 21:22 |
| 7.2  | [x]    | Rollback xong tự reload | 2026-04-01 21:22 |
| 7.3  | [x]    | Tự chọn file hợp lệ tiếp theo | 2026-04-01 21:22 |
| 7.4  | [x]    | Rollback không dừng watcher | 2026-04-01 21:22 |
| 8.1  | [x]    | Bổ sung test reset snapshot | 2026-04-01 21:22 |
| 8.2  | [x]    | Có test state hiện có | 2026-04-01 21:22 |
| 8.3  | [x]    | Có test `watch` tự tạo snapshot | 2026-04-01 21:22 |
| 8.4  | [x]    | Có test debounce | 2026-04-01 21:22 |
| 8.5  | [x]    | Có test diff rỗng sau reset | 2026-04-01 21:22 |
| 8.6  | [x]    | Có test command `watch` smoke | 2026-04-01 21:22 |
| 8.7  | [x]    | `npm run build` pass | 2026-04-01 21:22 |
| 8.8  | [x]    | `npm test` pass 10 tests | 2026-04-01 21:22 |
| 9.1  | [x]    | Đã chạy `watch` trên thư mục mẫu | 2026-04-01 21:22 |
| 9.2  | [x]    | Snapshot được tạo tự động | 2026-04-01 21:22 |
| 9.3  | [!]    | Đã smoke-test watcher; chưa quan sát UI trực tiếp | 2026-04-01 21:22 |
| 9.4  | [!]    | Đã smoke-test watcher; chưa quan sát UI trực tiếp | 2026-04-01 21:22 |
| 9.5  | [!]    | Đã smoke-test watcher; chưa quan sát UI trực tiếp | 2026-04-01 21:22 |
| 9.6  | [!]    | Rollback UI chưa manual tương tác; core đã test | 2026-04-01 21:22 |
| 9.7  | [!]    | Reset baseline qua UI chưa manual; core đã test | 2026-04-01 21:22 |
| 9.8  | [x]    | `diff` vẫn đúng sau reset snapshot | 2026-04-01 21:22 |
| 10.1 | [x]    | README đưa `watch` thành luồng chính | 2026-04-01 21:22 |
| 10.2 | [x]    | Đã giảm ví dụ thao tác tay | 2026-04-01 21:22 |
| 10.3 | [x]    | Đã thêm phím tắt UI | 2026-04-01 21:22 |
| 10.4 | [x]    | Đã ghi giới hạn `fs.watch` và fallback | 2026-04-01 21:22 |
| 11.1 | [x]    | Đã rà soát diff theo phạm vi nhỏ | 2026-04-01 21:22 |
| 11.2 | [x]    | Command cũ vẫn còn và test pass | 2026-04-01 21:22 |
| 11.3 | [x]    | Điểm còn thiếu chỉ ở verify UI thủ công | 2026-04-01 21:22 |
