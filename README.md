# AI Track Tool

Tool theo dõi thay đổi file do AI gây ra mà không cần git.

## Cách dùng chính

```bash
npm run build:web
npm run dev -- web
```

- `web` tự tạo snapshot nếu chưa có state.
- `web` khởi động server local tại `http://127.0.0.1:4317` (tự tìm port nếu bận).
- Không cần truyền `--path`, thêm project trực tiếp trên giao diện.
- Web UI hỗ trợ nhiều project trong cùng một phiên.
- Web UI tự làm mới khi file thay đổi qua SSE realtime.
- Web UI cho phép rollback và reset baseline.

## Giao diện web

Giao diện quản trị hiện đại, tối giản:

- **Sidebar trái**: danh sách projects, trạng thái watcher, form thêm project mới.
- **Cột giữa**: cây thư mục file thay đổi, phân loại folder, badge loại thay đổi (+, ~, -).
- **Cột phải**: diff viewer với syntax highlighting, nút copy.
- Hỗ trợ dark theme, font Inter + JetBrains Mono.

## Lệnh khác

```bash
npm run dev -- start --path /duong/dan/toi/project
npm run dev -- diff --path /duong/dan/toi/project
npm run dev -- watch --path /duong/dan/toi/project
npm run dev -- ui --path /duong/dan/toi/project
npm run dev -- rollback --path /duong/dan/toi/project src/file.ts
```

## Cách hoạt động

- `start` tạo snapshot baseline trong `.ai-track/` cạnh `--path`.
- `diff` so sánh snapshot với filesystem hiện tại.
- `watch` mở terminal UI cũ để debug hoặc fallback.
- `ui` mở terminal UI với snapshot hiện có.
- `web` mở giao diện web local để thao tác thuận tiện hơn.
- `rollback` khôi phục một file từ snapshot.

## Ignore mặc định

- `node_modules`
- `dist`
- `.git`
- `.ai-track`

## Giới hạn

- Chỉ hỗ trợ 1 snapshot active cho mỗi project.
- File binary rollback được, nhưng diff chỉ hiện thông báo binary.
- Snapshot copy full file, nên có thể tốn dung lượng với thư mục lớn.
- `fs.watch` có thể không ổn định hoàn toàn trên mọi platform.
- Tool có refresh fallback định kỳ để giảm rủi ro mất event watch.
- Web UI chỉ hỗ trợ local, không có auth.
