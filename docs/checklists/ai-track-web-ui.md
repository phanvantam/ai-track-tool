# Checklist: Giao diện web tương tác cho AI Track

## 1. Làm rõ yêu cầu

- [x] Xác nhận `web` sẽ là luồng tương tác chính.
- [!] Xác nhận CLI cũ vẫn phải giữ tương thích.
- [x] Xác nhận phase đầu chỉ hỗ trợ local, không có auth.
- [!] Xác nhận phase đầu chỉ hỗ trợ một session cho một `--path` mỗi tiến trình.
- [x] Xác nhận frontend dùng `React + Vite + Mantine`.

## 2. Khảo sát hiện trạng

- [x] Đọc lại `src/cli.ts` để xác định điểm thêm command `web`.
- [x] Đọc lại `src/core/watch.ts` để tái dùng watcher cho web session.
- [x] Đọc lại `src/core/snapshot.ts` để tái dùng `ensureSnapshot` và `resetSnapshot`.
- [x] Đọc lại `src/core/compare.ts` để tái dùng danh sách thay đổi.
- [x] Đọc lại `src/core/diff.ts` để tái dùng renderer diff.
- [x] Đọc lại `README.md` để xác định phần cần cập nhật.

## 3. Backend session

- [x] Thêm kiểu dữ liệu web session trong `src/types.ts`.
- [x] Tạo `src/server/session.ts` quản lý trạng thái server hiện tại.
- [x] Tạo hàm khởi tạo session theo `targetPath`.
- [x] Cho session tự tạo snapshot nếu chưa có state.
- [x] Cho session giữ watcher status, snapshot active, change list hiện tại.
- [x] Cho session có hàm refresh lại state và change list.
- [x] Cho session có hàm reset baseline.
- [x] Cho session có hàm rollback file.
- [x] Đảm bảo session dừng watcher sạch khi server tắt.

## 4. Backend realtime

- [x] Tạo `src/server/events.ts` để quản lý SSE clients.
- [x] Thêm hàm broadcast khi change list thay đổi.
- [x] Thêm hàm broadcast khi watcher lỗi.
- [x] Thêm cơ chế đóng kết nối SSE sạch.
- [x] Thêm fallback refresh nếu watcher bỏ lỡ event.

## 5. API và web server

- [x] Tạo `src/server/routes.ts`.
- [x] Thêm `GET /api/state`.
- [x] Thêm `GET /api/changes`.
- [x] Thêm `GET /api/diff?path=<relative-path>`.
- [x] Thêm `POST /api/rollback`.
- [x] Thêm `POST /api/reset-snapshot`.
- [x] Thêm `POST /api/refresh`.
- [x] Thêm endpoint SSE cho cập nhật realtime.
- [x] Tạo `src/server/app.ts` để khởi động HTTP server.
- [x] Thêm logic chọn cổng local và in URL.
- [x] Thêm `src/commands/web.ts`.
- [x] Thêm command `ai-track web --path <dir>` trong `src/cli.ts`.
- [!] Đảm bảo `web` không làm vỡ `watch` và `ui` cũ.

## 6. Frontend setup

- [x] Tạo `web/package.json`.
- [x] Tạo `web/vite.config.ts`.
- [x] Thêm dependency React.
- [x] Thêm dependency Mantine.
- [x] Thêm `web/index.html`.
- [x] Tạo entry `web/src/main.tsx`.
- [x] Tạo lớp gọi API trong `web/src/api.ts`.
- [x] Cấu hình build frontend để backend có thể serve file tĩnh.

## 7. Frontend layout

- [x] Tạo `web/src/App.tsx`.
- [x] Tạo `web/src/components/Layout.tsx`.
- [x] Tạo `web/src/components/StatusBar.tsx`.
- [x] Tạo `web/src/components/ChangeList.tsx`.
- [x] Tạo `web/src/components/DiffPanel.tsx`.
- [x] Dùng `AppShell` cho layout chính.
- [x] Hiển thị `targetPath` trong status bar.
- [x] Hiển thị snapshot active trong status bar.
- [x] Hiển thị watcher status trong status bar.
- [x] Hiển thị tổng số file changed.
- [x] Thêm bộ lọc all, added, modified, deleted.
- [x] Hiển thị diff file đang chọn trong panel riêng.

## 8. Frontend interaction

- [x] Nối SSE từ frontend để tự cập nhật UI.
- [x] Thêm nút refresh thủ công.
- [x] Thêm nút rollback file đang chọn.
- [x] Thêm nút reset baseline.
- [x] Thêm notification sau rollback thành công.
- [x] Thêm notification sau reset baseline thành công.
- [x] Thêm trạng thái loading khi gọi API.
- [x] Thêm hiển thị lỗi khi API hoặc SSE lỗi.
- [x] Giữ file đang chọn nếu vẫn còn trong danh sách sau refresh.

## 9. Test

- [x] Viết test cho session backend.
- [x] Viết test cho API `state`.
- [x] Viết test cho API `changes`.
- [x] Viết test cho API `diff`.
- [x] Viết test cho API `rollback`.
- [x] Viết test cho API `reset-snapshot`.
- [x] Viết test cho SSE broadcast khi file thay đổi.
- [x] Viết test cho command `web`.
- [x] Chạy build backend.
- [x] Chạy test backend.
- [x] Chạy build frontend.

## 10. Manual verification

- [x] Chạy `ai-track web --path <dir>` trên thư mục mẫu chưa có state.
- [x] Kiểm tra snapshot được tạo tự động.
- [!] Mở web UI và xác nhận URL local dùng được.
- [!] Xác nhận danh sách thay đổi hiển thị đúng.
- [!] Chọn file và xác nhận panel diff đúng.
- [x] Sửa file và xác nhận UI tự cập nhật.
- [!] Thêm file và xác nhận UI tự cập nhật.
- [!] Xóa file và xác nhận UI tự cập nhật.
- [x] Bấm rollback và xác nhận file được khôi phục.
- [x] Bấm reset baseline và xác nhận danh sách diff về rỗng.
- [x] Kiểm tra `diff --path <dir>` vẫn đúng sau khi reset.

## 11. Docs

- [x] Cập nhật `README.md` để đưa `web` thành cách dùng chính.
- [x] Thêm ví dụ chạy `ai-track web --path <dir>`.
- [x] Ghi rõ `watch` và `ui` vẫn còn để debug hoặc fallback.
- [!] Ghi rõ giới hạn local-only và một session mỗi tiến trình.

## 12. Đóng task

- [x] Rà soát diff để giữ phạm vi nhỏ nhất.
- [x] Rà soát dependency mới có thực sự cần thiết.
- [x] Ghi rõ điểm còn `unknown` nếu chưa xử lý được.

## Execution Log

| Step | Status | Notes | Timestamp |
|------|--------|-------|-----------|
| 1.1  | [x]    | Chốt `web` là luồng chính | 2026-04-01 21:32 |
| 1.2  | [!]    | User cho phép thay đổi CLI cũ | 2026-04-01 21:32 |
| 1.3  | [x]    | Phase đầu local-only, không auth | 2026-04-01 21:32 |
| 1.4  | [!]    | User yêu cầu nhiều project trong một web | 2026-04-01 21:32 |
| 1.5  | [x]    | Chốt React + Vite + Mantine | 2026-04-01 21:32 |
| 2.1  | [x]    | Đã rà `src/cli.ts` | 2026-04-01 21:44 |
| 2.2  | [x]    | Đã rà `src/core/watch.ts` | 2026-04-01 21:44 |
| 2.3  | [x]    | Đã rà `src/core/snapshot.ts` | 2026-04-01 21:44 |
| 2.4  | [x]    | Đã rà `src/core/compare.ts` | 2026-04-01 21:44 |
| 2.5  | [x]    | Đã rà `src/core/diff.ts` | 2026-04-01 21:44 |
| 2.6  | [x]    | Đã rà `README.md` | 2026-04-01 21:44 |
| 3.1  | [x]    | Thêm kiểu session web | 2026-04-01 21:44 |
| 3.2  | [x]    | Tạo `SessionManager` | 2026-04-01 21:44 |
| 3.3  | [x]    | Khởi tạo session theo `targetPath` | 2026-04-01 21:44 |
| 3.4  | [x]    | Session tự tạo snapshot | 2026-04-01 21:44 |
| 3.5  | [x]    | Session giữ status và change list | 2026-04-01 21:44 |
| 3.6  | [x]    | Có hàm refresh session | 2026-04-01 21:44 |
| 3.7  | [x]    | Có hàm reset baseline | 2026-04-01 21:44 |
| 3.8  | [x]    | Có hàm rollback file | 2026-04-01 21:44 |
| 3.9  | [x]    | Dừng watcher sạch khi đóng server | 2026-04-01 21:44 |
| 4.1  | [x]    | Tạo `SseHub` | 2026-04-01 21:44 |
| 4.2  | [x]    | Broadcast khi session đổi | 2026-04-01 21:44 |
| 4.3  | [x]    | Broadcast lỗi watcher | 2026-04-01 21:44 |
| 4.4  | [x]    | SSE đóng kết nối sạch | 2026-04-01 21:44 |
| 4.5  | [x]    | Watcher có fallback refresh | 2026-04-01 21:44 |
| 5.1  | [x]    | Tạo `src/server/routes.ts` | 2026-04-01 21:44 |
| 5.2  | [x]    | Có API `state` | 2026-04-01 21:44 |
| 5.3  | [x]    | Có API `changes` | 2026-04-01 21:44 |
| 5.4  | [x]    | Có API `diff` | 2026-04-01 21:44 |
| 5.5  | [x]    | Có API `rollback` | 2026-04-01 21:44 |
| 5.6  | [x]    | Có API `reset-snapshot` | 2026-04-01 21:44 |
| 5.7  | [x]    | Có API `refresh` | 2026-04-01 21:44 |
| 5.8  | [x]    | Có endpoint SSE | 2026-04-01 21:44 |
| 5.9  | [x]    | Tạo `src/server/app.ts` | 2026-04-01 21:44 |
| 5.10 | [x]    | Có logic chọn cổng local | 2026-04-01 21:44 |
| 5.11 | [x]    | Tạo `src/commands/web.ts` | 2026-04-01 21:44 |
| 5.12 | [x]    | Thêm command `web` | 2026-04-01 21:44 |
| 5.13 | [!]    | Chưa manual rà `watch` và `ui` cũ | 2026-04-01 21:44 |
| 6.1  | [x]    | Tạo `web/package.json` | 2026-04-01 21:44 |
| 6.2  | [x]    | Tạo `web/vite.config.ts` | 2026-04-01 21:44 |
| 6.3  | [x]    | Thêm React | 2026-04-01 21:44 |
| 6.4  | [x]    | Thêm Mantine | 2026-04-01 21:44 |
| 6.5  | [x]    | Tạo `web/index.html` | 2026-04-01 21:44 |
| 6.6  | [x]    | Tạo `main.tsx` | 2026-04-01 21:44 |
| 6.7  | [x]    | Tạo lớp API frontend | 2026-04-01 21:44 |
| 6.8  | [x]    | Backend serve được `web/dist` | 2026-04-01 21:44 |
| 7.1  | [x]    | Tạo `App.tsx` | 2026-04-01 21:44 |
| 7.2  | [x]    | Tạo `Layout.tsx` | 2026-04-01 21:44 |
| 7.3  | [x]    | Tạo `StatusBar.tsx` | 2026-04-01 21:44 |
| 7.4  | [x]    | Tạo `ChangeList.tsx` | 2026-04-01 21:44 |
| 7.5  | [x]    | Tạo `DiffPanel.tsx` | 2026-04-01 21:44 |
| 7.6  | [x]    | Dùng `AppShell` | 2026-04-01 21:44 |
| 7.7  | [x]    | Hiển thị `targetPath` | 2026-04-01 21:44 |
| 7.8  | [x]    | Hiển thị snapshot active | 2026-04-01 21:44 |
| 7.9  | [x]    | Hiển thị watcher status | 2026-04-01 21:44 |
| 7.10 | [x]    | Hiển thị tổng số file changed | 2026-04-01 21:44 |
| 7.11 | [x]    | Có bộ lọc trạng thái | 2026-04-01 21:44 |
| 7.12 | [x]    | Diff có panel riêng | 2026-04-01 21:44 |
| 8.1  | [x]    | Frontend nối SSE | 2026-04-01 21:44 |
| 8.2  | [x]    | Có nút refresh | 2026-04-01 21:44 |
| 8.3  | [x]    | Có nút rollback | 2026-04-01 21:44 |
| 8.4  | [x]    | Có nút reset baseline | 2026-04-01 21:44 |
| 8.5  | [x]    | Có notification rollback | 2026-04-01 21:44 |
| 8.6  | [x]    | Có notification reset | 2026-04-01 21:44 |
| 8.7  | [x]    | Có loading khi gọi API | 2026-04-01 21:44 |
| 8.8  | [x]    | Có hiển thị lỗi API và SSE | 2026-04-01 21:44 |
| 8.9  | [x]    | Giữ file đang chọn sau refresh | 2026-04-01 21:44 |
| 9.1  | [x]    | Có test session backend | 2026-04-01 21:44 |
| 9.2  | [x]    | Có test API `state` | 2026-04-01 21:44 |
| 9.3  | [x]    | Có test API `changes` | 2026-04-01 21:44 |
| 9.4  | [x]    | Có test API `diff` | 2026-04-01 21:44 |
| 9.5  | [x]    | Có test API `rollback` | 2026-04-01 21:44 |
| 9.6  | [x]    | Có test API `reset-snapshot` | 2026-04-01 21:44 |
| 9.7  | [x]    | Có test SSE qua thay đổi session | 2026-04-01 21:44 |
| 9.8  | [x]    | Có test command `web` | 2026-04-01 21:44 |
| 9.9  | [x]    | `npm run build` pass | 2026-04-01 21:44 |
| 9.10 | [x]    | `npm test` pass 13 tests | 2026-04-01 21:44 |
| 9.11 | [x]    | `npm run build:web` pass | 2026-04-01 21:44 |
| 10.1 | [x]    | Đã chạy `web` với thư mục mẫu | 2026-04-01 21:44 |
| 10.2 | [x]    | Snapshot được tạo tự động | 2026-04-01 21:44 |
| 10.3 | [!]    | Đã fetch HTML; chưa nhìn browser thật | 2026-04-01 21:44 |
| 10.4 | [!]    | Đã verify qua API; chưa nhìn browser thật | 2026-04-01 21:44 |
| 10.5 | [!]    | Diff panel chưa manual trong browser | 2026-04-01 21:44 |
| 10.6 | [x]    | Realtime sửa file đã verify qua API | 2026-04-01 21:44 |
| 10.7 | [!]    | Add file chưa manual trong browser | 2026-04-01 21:44 |
| 10.8 | [!]    | Delete file chưa manual trong browser | 2026-04-01 21:44 |
| 10.9 | [x]    | Rollback đã verify qua API | 2026-04-01 21:44 |
| 10.10 | [x]   | Reset baseline đã verify qua API | 2026-04-01 21:44 |
| 10.11 | [x]   | `diff` vẫn đúng sau reset | 2026-04-01 21:44 |
| 11.1 | [x]    | README đưa `web` thành chính | 2026-04-01 21:44 |
| 11.2 | [x]    | Có ví dụ chạy `web` | 2026-04-01 21:44 |
| 11.3 | [x]    | Ghi `watch` và `ui` là fallback | 2026-04-01 21:44 |
| 11.4 | [!]    | README đã ghi local-only; không còn giới hạn một session | 2026-04-01 21:44 |
| 12.1 | [x]    | Đã rà soát diff | 2026-04-01 21:44 |
| 12.2 | [x]    | Dependency mới chỉ gồm React, Vite, Mantine | 2026-04-01 21:44 |
| 12.3 | [x]    | Điểm còn thiếu là manual browser verify | 2026-04-01 21:44 |
