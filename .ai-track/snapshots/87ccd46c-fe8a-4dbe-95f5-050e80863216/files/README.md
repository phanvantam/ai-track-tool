# AI Track Tool

CLI theo dõi thay đổi file do AI gây ra mà không cần git.

## Cách dùng chính

```bash
npm run dev -- watch --path /duong/dan/toi/project
```

- `watch` tự tạo snapshot nếu chưa có state.
- `watch` mở UI ngay và tự theo dõi thay đổi file.
- UI tự làm mới khi file thay đổi.
- UI cho phép rollback ngay bằng bàn phím.

## Phím tắt UI

- `q`: thoát
- `0`: hiện tất cả thay đổi
- `a`: lọc file `added`
- `m`: lọc file `modified`
- `d`: lọc file `deleted`
- `r`: rollback file đang chọn
- `R`: refresh thủ công
- `s`: chấp nhận trạng thái hiện tại làm baseline mới

## Lệnh khác

```bash
npm run dev -- start --path /duong/dan/toi/project
npm run dev -- diff --path /duong/dan/toi/project
npm run dev -- ui --path /duong/dan/toi/project
npm run dev -- rollback --path /duong/dan/toi/project src/file.ts
```

## Cách hoạt động

- `start` tạo snapshot baseline trong `.ai-track/` cạnh `--path`.
- `diff` so sánh snapshot với filesystem hiện tại.
- `ui` mở terminal UI với snapshot hiện có.
- `watch` tự tạo snapshot nếu cần, rồi mở UI theo dõi thay đổi theo thời gian thực.
- `rollback` khôi phục một file từ snapshot.

## Ignore mặc định

- `node_modules`
- `dist`
- `.git`
- `.ai-track`

## Giới hạn

- Chỉ hỗ trợ 1 snapshot active trong phase đầu.
- File binary rollback được, nhưng diff chỉ hiện thông báo binary.
- Snapshot copy full file, nên có thể tốn dung lượng với thư mục lớn.
- `fs.watch` có thể không ổn định hoàn toàn trên mọi platform.
- Tool có refresh fallback định kỳ để giảm rủi ro mất event watch.
