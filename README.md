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
- Web UI cho phép rollback, tạo mốc theo dõi mới, xem history, reflog, lock, FSCK, GC.
- Web UI hỗ trợ gắn tag, note và so sánh snapshot ngay trên giao diện.

## Giao diện web

Giao diện quản trị hiện đại, tối giản:

- **Sidebar trái**: danh sách projects, trạng thái watcher, form thêm project mới.
- **Cột giữa**: cây thư mục file thay đổi, phân loại folder, badge loại thay đổi (+, ~, -).
- **Cột phải**: tabs cho diff, history, health, reflog.
- Hỗ trợ dark theme, font Inter + JetBrains Mono.

## Lệnh khác

```bash
npm run dev -- start --path /duong/dan/toi/project
npm run dev -- diff --path /duong/dan/toi/project
npm run dev -- fsck --path /duong/dan/toi/project
npm run dev -- fsck --path /duong/dan/toi/project --repair
npm run dev -- gc --path /duong/dan/toi/project --dry-run
npm run dev -- gc --path /duong/dan/toi/project
npm run dev -- merge --path /duong/dan/toi/project src/file.ts
npm run dev -- lock --path /duong/dan/toi/project
npm run dev -- log --path /duong/dan/toi/project --graph
npm run dev -- reflog --path /duong/dan/toi/project --limit 20
npm run dev -- tag --path /duong/dan/toi/project create v1
npm run dev -- note --path /duong/dan/toi/project add <snapshot-id> "ghi chu"
npm run dev -- diff-snapshots --path /duong/dan/toi/project <from> <to>
npm run dev -- watch --path /duong/dan/toi/project
npm run dev -- ui --path /duong/dan/toi/project
npm run dev -- rollback --path /duong/dan/toi/project src/file.ts
npm run dev -- rollback --path /duong/dan/toi/project --strategy manual src/file.ts
```

## Cách hoạt động

- `start` tạo snapshot baseline trong `.ai-track/` cạnh `--path`.
- `diff` so sánh snapshot với filesystem hiện tại.
- `fsck` kiểm tra integrity của snapshot, phát hiện file thiếu, file rác, manifest hỏng.
- `gc` dọn snapshot mồ côi ngoài history, nén snapshot cũ đủ tuổi theo retention policy sang delta/reference, compact metadata cache và sửa orphan file bằng `fsck`.
- `merge` tạo three-way merge giữa workspace hiện tại và snapshot.
- `lock` xem trạng thái lock hoặc force release lock bị kẹt.
- `log` hiển thị snapshot history hoặc graph cây cha-con.
- `reflog` hiển thị audit trail của create/reset/rollback/merge/tag/note/gc.
- `tag` gắn tên ngắn cho snapshot quan trọng.
- `note` gắn ghi chú cho snapshot.
- `diff-snapshots` so sánh hai snapshot bất kỳ.
- `watch` mở terminal UI cũ để debug hoặc fallback.
- `ui` mở terminal UI với snapshot hiện có.
- `web` mở giao diện web local để thao tác thuận tiện hơn.
- `rollback` khôi phục một file từ snapshot.

## Phase 1 Improvements

- Quét file theo kiểu incremental, chỉ hash lại file có metadata thay đổi.
- Lưu metadata cache tại `metadata-cache.json` trong storage root.
- `rollback` kiểm tra integrity snapshot file trước khi restore.
- `fsck --repair` có thể xóa orphan file và manifest entry bị thiếu.
- `gc --dry-run` cho biết tool sẽ dọn gì trước khi chạy thật.
- GC config mặc định: `enabled=true`, `maxFullCopies=1`, `retentionDays=30`, `autoRun=false`.

## Phase 2 Improvements

- Snapshot và rollback đi qua file lock để tránh race condition.
- Ghi journal append-only tại `transaction-log.jsonl` trong storage root.
- `readState()` chỉ auto-recovery transaction dang dở khi không còn lock active.
- `rollback --strategy manual` ghi conflict markers thay vì ghi đè mù.
- Merge strategy hỗ trợ: `theirs`, `ours`, `manual`, `combined`.
- Lock mặc định tự hết hạn sau `30s` nếu process chết hoặc không còn sống.

## Journal và Lock Format

- Lock file: `lock.json`
- Trường lock chính: `lockId`, `processId`, `operation`, `timestamp`, `expiresAt`
- Journal file: `transaction-log.jsonl`
- Mỗi dòng journal là một JSON entry với `transactionId`, `kind`, `status`, `operation`, `timestamp`
- `kind` gồm: `begin`, `step`, `commit`, `rollback`

## Phase 3 Improvements

- Mỗi snapshot mới giữ `parentSnapshotId`, tạo snapshot chain tuyến tính.
- `state.json` giữ `snapshotHistory` và `previousSnapshotId`.
- Reset snapshot không xóa snapshot cũ nữa.
- Mỗi snapshot có `summary`, `author`, `checksum` để audit.
- Reflog lưu tại `.reflog.jsonl` và tự trim về `1000` entries.
- Tags lưu tại `.tags.json`, notes lưu tại `.notes.json`.

## History Commands

- `ai-track log --path <dir> --graph` in cây snapshot.
- `ai-track log --path <dir> --tag <name>` lọc theo tag.
- `ai-track log --path <dir> --since <iso>` lọc theo thời gian.
- `ai-track log --path <dir> --message <text>` lọc theo summary.
- `ai-track reflog --path <dir> --stats` in thống kê thao tác.
- `ai-track tag --path <dir> list` liệt kê tags.
- `ai-track note --path <dir> show <snapshot-id>` đọc note.
- `ai-track diff-snapshots --path <dir> <from> <to>` so sánh lịch sử.

## Troubleshooting

- `fsck` báo `missing_file`: chạy lại `fsck --repair` để bỏ manifest entry bị thiếu.
- `fsck` báo `orphan_file`: chạy `fsck --repair` hoặc `gc` để dọn file rác.
- `rollback` báo snapshot file hỏng: chạy `fsck`, không restore mù.
- `gc` hiện `skip_delta` khi không có snapshot cũ phù hợp để nén.
- `merge` trả về conflict: mở file, xử lý đoạn giữa `<<<<<<<` và `>>>>>>>`, rồi lưu lại.
- `lock` bị kẹt: chạy `ai-track lock --path <dir> --release` sau khi chắc chắn process cũ đã chết.
- `state.json` bị ghi dở: gọi lại lệnh sau khi lock cũ hết hạn hoặc process cũ đã chết.
- `log --graph` không thấy lịch sử cũ: snapshot cũ trước Phase 3 chỉ được nối chain từ lần reset mới nhất.
- `tag` báo trùng: mỗi tag là duy nhất trong một storage root.
- `reflog` quá dài: tool tự giữ tối đa `1000` dòng gần nhất.

## Ignore mặc định

- `node_modules`
- `dist`
- `.git`
- `.ai-track`

## Giới hạn

- Chỉ hỗ trợ 1 snapshot active cho mỗi project.
- File binary rollback được, nhưng diff chỉ hiện thông báo binary.
- Snapshot đầu chuỗi vẫn lưu full file, nên project rất lớn vẫn tốn dung lượng nền.
- `gc` chỉ nén snapshot cũ trong history tuyến tính hiện có, chưa tối ưu cho graph branch phức tạp.
- `fs.watch` có thể không ổn định hoàn toàn trên mọi platform.
- Tool có refresh fallback định kỳ để giảm rủi ro mất event watch.
- Web UI chỉ hỗ trợ local, không có auth.
