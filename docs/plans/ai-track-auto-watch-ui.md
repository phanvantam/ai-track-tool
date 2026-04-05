# Plan: Tự động theo dõi và giao diện tương tác cho AI Track

## 1. Context & Goals

- Mục tiêu là giảm thao tác tay khi dùng `ai-track`.
- Hiện tại user phải tự gọi `start`, rồi `diff`, rồi `ui`, rồi `rollback`.
- Cách này đúng kỹ thuật nhưng UX kém.
- Cần bổ sung cơ chế tự động theo dõi thay đổi và giao diện tương tác tốt hơn.
- Vẫn giữ nguyên ràng buộc: không dùng git.
- Ưu tiên diff nhỏ, tận dụng lõi snapshot, compare, rollback hiện có.

## 2. Hiện trạng

- Repo không có `docs/architecture.md`, `docs/coding-standards.md`, `docs/code-structure.md`.
- CLI hiện có 4 lệnh: `start`, `diff`, `ui`, `rollback`.
- `start` chỉ tạo snapshot baseline một lần.
- `diff` chỉ chạy khi user gọi tay.
- `ui` mở TUI nhưng không tự watch filesystem.
- `rollback` vẫn yêu cầu user nhập file đích bằng tay hoặc chọn trong UI.
- Chưa có lệnh hợp nhất kiểu `watch` hoặc `open` để tự động cập nhật giao diện.
- `README.md` phản ánh đúng vấn đề: luồng sử dụng nhiều bước tay.

## 3. Phương án đề xuất

### 3.1 Hướng nhỏ nhất đúng yêu cầu

- Không bỏ lệnh cũ.
- Bổ sung một luồng chính mới để user không phải phối hợp nhiều lệnh.
- Đề xuất thêm lệnh `ai-track watch --path <dir>`.
- Lệnh này sẽ:
- Tạo snapshot nếu chưa có snapshot active.
- Mở TUI ngay sau khi chuẩn bị state.
- Theo dõi thay đổi filesystem theo thời gian thực.
- Tự refresh danh sách thay đổi và khung diff.
- Cho phép rollback trực tiếp trong UI.

### 3.2 Thay đổi hành vi UI

- UI phải chuyển từ mô hình đọc một lần sang mô hình stateful.
- Khi file thay đổi, UI tự re-scan và cập nhật danh sách.
- Khi file đang chọn vẫn còn tồn tại trong danh sách thay đổi, giữ selection.
- Khi file bị rollback hoặc không còn thay đổi, UI tự chọn file hợp lệ kế tiếp.
- Thêm thanh trạng thái thể hiện:
- thư mục đang theo dõi
- snapshot active
- số file changed
- trạng thái watch đang hoạt động hay lỗi

### 3.3 Cơ chế watch

- Ưu tiên dùng `fs.watch` của Node.js trước.
- Không thêm dependency mới nếu chưa cần.
- Vì `fs.watch` có hành vi không ổn định giữa platform, cần bọc qua lớp adapter riêng.
- Khi nhận event, không re-scan ngay lập tức cho từng event.
- Dùng debounce ngắn để gom nhiều thay đổi liên tiếp.
- Nếu watcher lỗi hoặc bị mất event, cho phép refresh toàn bộ theo chu kỳ an toàn ngắn.

### 3.4 Luồng lệnh đề xuất

- `ai-track watch --path <dir>`
: luồng dùng chính cho người dùng cuối.
- `ai-track ui --path <dir>`
: vẫn giữ, nhưng chỉ mở UI với snapshot hiện có.
- `ai-track start --path <dir>`
: vẫn giữ cho trường hợp script hóa hoặc khởi tạo riêng.
- `ai-track diff --path <dir>`
: vẫn giữ cho debug hoặc CI local.

### 3.5 Hướng tối ưu UX

- Trong UI, thêm phím tắt rõ ràng:
- `r` rollback file đang chọn
- `R` refresh thủ công
- `s` tạo lại snapshot từ trạng thái hiện tại
- `q` thoát
- Hiển thị thông báo ngắn sau hành động, không bắt user đoán trạng thái.
- Nếu chưa có snapshot active mà user mở `ui`, cho phép hỏi tạo snapshot luôn hoặc tự tạo nếu vào từ `watch`.

### 3.6 Tạo lại snapshot

- Cần thêm hành vi “chấp nhận trạng thái hiện tại làm baseline mới”.
- Không nên bắt user thoát UI rồi chạy `start` lại.
- Đề xuất thêm action `s` trong UI và hàm `resetSnapshot(targetPath)`.
- Hành vi này sẽ thay active snapshot bằng snapshot mới.
- Snapshot cũ có thể giữ lại tạm thời, nhưng phase đầu chỉ cần giữ active snapshot và không cần UI quản lý lịch sử.

### 3.7 Giữ phạm vi nhỏ

- Không làm daemon nền.
- Không làm giao diện desktop.
- Không thêm cấu hình ignore tùy biến ở pha này.
- Không thêm nhiều snapshot trong UI ở pha này.
- Không làm rollback theo hunk.

## 4. Task Breakdown

1. Khảo sát và chốt luồng `watch` là entrypoint chính.
2. Tách UI hiện tại thành lớp state có thể refresh nhiều lần.
3. Thêm watcher adapter cho filesystem.
4. Thêm debounce cho refresh khi có nhiều event liên tiếp.
5. Thêm command `watch --path <dir>`.
6. Cho `watch` tự tạo snapshot nếu chưa có state.
7. Thêm cơ chế refresh định kỳ an toàn nếu watcher không ổn định.
8. Thêm thanh trạng thái và thông báo hành động trong UI.
9. Thêm action `s` để tạo lại snapshot ngay trong UI.
10. Giữ selection hợp lệ sau refresh hoặc rollback.
11. Viết test cho luồng watch-state và reset snapshot.
12. Cập nhật `README.md` theo luồng mới: `watch` là cách dùng chính.

## 5. Files dự kiến ảnh hưởng

- `README.md`
- `src/cli.ts`
- `src/commands/start.ts`
- `src/commands/ui.ts`
- `src/core/snapshot.ts`
- `src/core/state.ts`
- `src/core/compare.ts`
- `src/types.ts`
- `src/core/watch.ts`
- `tests/snapshot.test.ts`
- `tests/compare.test.ts`
- `tests/watch.test.ts`

## 6. Rủi ro & Câu hỏi mở

- `fs.watch` không hoàn toàn ổn định trên mọi platform.
- Re-scan toàn bộ cây file sau mỗi đợt thay đổi có thể chậm trên thư mục lớn.
- Cần quyết định watcher có bỏ qua thay đổi metadata không cần thiết hay không.
- Cần xác định có tự tạo snapshot khi `ui` chạy trực tiếp mà chưa có state hay không.
- Tạo lại snapshot trong UI có thể làm user mất khả năng rollback về baseline cũ.
- Nếu muốn giữ UX đơn giản, có thể chấp nhận cảnh báo rõ thay vì hỗ trợ nhiều snapshot.

## 7. Verification

- `ai-track watch --path <dir>` tự tạo snapshot khi chưa có state.
- Sau khi sửa file trong thư mục theo dõi, UI tự cập nhật không cần chạy lại lệnh.
- Khi thêm hoặc xóa file, danh sách thay đổi tự cập nhật đúng.
- `r` rollback file trong UI và danh sách thay đổi cập nhật đúng.
- `s` tạo lại snapshot và xóa trạng thái diff hiện tại.
- `diff --path <dir>` vẫn hoạt động đúng với snapshot active.
- `start --path <dir>` và `ui --path <dir>` cũ không bị vỡ hành vi.
- README mới mô tả `watch` là luồng dùng chính, giảm thao tác tay.
