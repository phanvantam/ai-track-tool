# Plan: Giao diện web tương tác cho AI Track

## 1. Context & Goals

- Mục tiêu là thay TUI bằng giao diện web dễ dùng hơn.
- Hiện tại tool đã có CLI và TUI terminal.
- TUI dùng được nhưng vẫn bất tiện.
- Web UI phải giúp xem thay đổi, diff và rollback nhanh hơn.
- Vẫn giữ ràng buộc: không dùng git.
- Ưu tiên tận dụng lõi snapshot, compare, rollback, watch hiện có.

## 2. Hiện trạng

- Repo không có `docs/architecture.md`, `docs/coding-standards.md`, `docs/code-structure.md`.
- Tool hiện chạy hoàn toàn bằng CLI Node.js.
- Đã có các lệnh `start`, `diff`, `ui`, `rollback`, `watch`.
- Đã có watcher filesystem và snapshot lifecycle cơ bản.
- Chưa có HTTP server, API hay frontend web.
- Chưa có mô hình đồng bộ thay đổi từ backend sang UI web.
- `README.md` vẫn mô tả tool theo góc nhìn CLI.

## 3. Phương án đề xuất

### 3.1 Hướng nhỏ nhất đúng yêu cầu

- Không bỏ CLI hiện có.
- Bổ sung một lệnh mới: `ai-track web --path <dir>`.
- Lệnh này sẽ:
- tự tạo snapshot nếu chưa có state
- khởi động web server cục bộ
- mở trang web hoặc in URL local
- theo dõi filesystem và đẩy cập nhật lên UI
- cho phép rollback và reset baseline ngay trên web

### 3.2 Kiến trúc web tối thiểu

- Backend vẫn là Node.js hiện có.
- Thêm HTTP server nhẹ, không cần framework nặng.
- Phase đầu có thể dùng `node:http` thuần.
- Frontend nên dùng thư viện UI thay vì HTML thuần.
- Đề xuất: React + Vite + Mantine.
- Lý do: Mantine có layout, button, badge, modal, notification đẹp sẵn.
- Lý do: ít boilerplate hơn `shadcn/ui`, phù hợp repo nhỏ.
- Giữ backend API đơn giản, chỉ nâng lớp trình bày.

### 3.3 Mô hình dữ liệu và API

- API đọc trạng thái hiện tại:
- `GET /api/state`
- trả về `targetPath`, `snapshotId`, watcher status, tổng số file changed
- API đọc danh sách thay đổi:
- `GET /api/changes`
- API đọc diff một file:
- `GET /api/diff?path=<relative-path>`
- API rollback một file:
- `POST /api/rollback`
- API reset baseline:
- `POST /api/reset-snapshot`
- API refresh thủ công:
- `POST /api/refresh`

### 3.4 Cơ chế cập nhật realtime

- Không dùng polling mặc định nếu không cần.
- Ưu tiên SSE trước.
- SSE đủ cho luồng một chiều từ server sang browser.
- Khi filesystem đổi, backend re-scan rồi phát event cập nhật.
- Frontend nhận event và refresh danh sách, diff, status.
- Nếu SSE phức tạp hơn dự kiến, fallback ngắn hạn là polling chu kỳ ngắn.

### 3.5 Thiết kế giao diện web

- Bố cục 2 cột:
- trái là danh sách file changed
- phải là diff file đang chọn
- thanh trên cùng hiển thị `targetPath`, snapshot active, watcher status
- thanh thao tác có nút:
- refresh
- reset baseline
- rollback file đang chọn
- bộ lọc trạng thái: all, added, modified, deleted
- thông báo ngắn sau mỗi hành động
- Dùng component library để tránh giao diện thô.
- Áp dụng `AppShell`, `Badge`, `Tabs`, `Button`, `ScrollArea`, `Alert`, `Notification` của Mantine.
- Diff text vẫn là text patch, chỉ bọc trong component hiển thị đẹp hơn.

### 3.6 Tích hợp với lõi hiện có

- Không viết lại `compare`, `snapshot`, `rollback`.
- Tách thêm một lớp service để UI web và CLI cùng dùng.
- `watch` hiện có cần được tái dùng cho web server session.
- Diff renderer hiện có có thể trả text patch cho web hiển thị.
- Nếu cần HTML highlight, làm ở frontend, không đổi lõi diff.

### 3.7 Quản lý phiên chạy

- Pha đầu chỉ cần một session cho một `--path` mỗi tiến trình.
- Không hỗ trợ multi-user.
- Không hỗ trợ nhiều project trong một server.
- Không cần auth vì chỉ chạy local.
- Nếu cổng bận, chọn cổng kế tiếp hoặc báo lỗi rõ ràng.

### 3.8 Giữ phạm vi nhỏ

- Không làm desktop app.
- Không làm auth.
- Không làm lưu cấu hình frontend.
- Không làm rollback theo từng hunk.
- Không làm nhiều session song song trong cùng một tiến trình.
- Không tự thiết kế design system riêng ở phase đầu.
- Không thêm state management nặng như Redux.

## 4. Task Breakdown

1. Khảo sát lõi hiện có để tách service dùng chung cho web.
2. Thêm command `web --path <dir>` trong CLI.
3. Thêm module web server local.
4. Thêm API `state`, `changes`, `diff`, `rollback`, `reset-snapshot`, `refresh`.
5. Thêm SSE hoặc fallback polling cho cập nhật realtime.
6. Khởi tạo frontend React + Vite + Mantine.
7. Dựng layout web hiển thị danh sách thay đổi và diff.
8. Nối action rollback và reset baseline từ frontend sang API.
9. Hiển thị trạng thái watcher, snapshot, số file changed trên UI.
10. Viết test cho API và luồng watch cập nhật web state.
11. Cập nhật `README.md` để đưa `web` thành luồng tương tác chính.

## 5. Files dự kiến ảnh hưởng

- `README.md`
- `package.json`
- `src/cli.ts`
- `src/commands/watch.ts`
- `src/commands/web.ts`
- `src/core/watch.ts`
- `src/core/compare.ts`
- `src/core/diff.ts`
- `src/core/rollback.ts`
- `src/core/snapshot.ts`
- `src/core/state.ts`
- `src/types.ts`
- `src/server/app.ts`
- `src/server/routes.ts`
- `src/server/events.ts`
- `src/server/session.ts`
- `web/package.json`
- `web/vite.config.ts`
- `web/index.html`
- `web/src/main.tsx`
- `web/src/App.tsx`
- `web/src/api.ts`
- `web/src/components/Layout.tsx`
- `web/src/components/ChangeList.tsx`
- `web/src/components/DiffPanel.tsx`
- `web/src/components/StatusBar.tsx`
- `web/src/styles.css`
- `tests/web.test.ts`
- `tests/watch.test.ts`

## 6. Rủi ro & Câu hỏi mở

- Chưa có chuẩn frontend trong repo.
- `node:http` thuần đủ nhẹ nhưng dễ làm mã route lộn xộn.
- Thêm React + Mantine làm tăng số dependency đáng kể.
- SSE cần xử lý đóng kết nối sạch để tránh leak.
- Với thư mục lớn, re-scan toàn bộ có thể làm UI giật.
- Mở browser tự động là tiện nhưng có thể lỗi theo OS.
- Diff text lớn có thể làm web UI chậm nếu render toàn bộ.
- Cần chốt cách build frontend rồi serve file tĩnh từ backend.
- Unknown: có cần giữ TUI song song lâu dài không.

## 7. Verification

- `ai-track web --path <dir>` tự tạo snapshot khi chưa có state.
- Server khởi động và trả URL local hợp lệ.
- Trang web hiển thị danh sách thay đổi hiện tại bằng UI library.
- Chọn file trên web hiển thị đúng diff trong panel riêng.
- Khi sửa, thêm, xóa file, UI web tự cập nhật.
- Nút rollback khôi phục đúng file đang chọn.
- Nút reset baseline làm danh sách diff về rỗng.
- `diff --path <dir>` và `watch --path <dir>` cũ không bị vỡ.
- `README.md` mô tả `web` là luồng tương tác tiện nhất.
