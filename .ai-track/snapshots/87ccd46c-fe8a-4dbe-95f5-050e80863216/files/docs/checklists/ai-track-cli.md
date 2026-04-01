# Checklist: AI Track CLI Tool

## 1. Lam ro yeu cau

- [x] Xac nhan runtime se dung cho CLI.
- [x] Xac nhan `rollback <file>` nhan duong dan tu root `--path`.
- [x] Xac nhan chi ho tro 1 snapshot active o pha dau.
- [x] Xac nhan `.ai-track/` luu canh project tool hay canh `--path`.
- [x] Xac nhan muc tieu `ui` phai co ngay trong phase dau.

## 2. Khoi tao project

- [x] Tao `package.json` cho CLI.
- [x] Them `tsconfig.json` cho TypeScript.
- [x] Tao cau truc thu muc `src/` va `tests/`.
- [x] Cau hinh script `build`, `test`, `dev`.
- [x] Chon thu vien parse lenh CLI.
- [x] Chon thu vien TUI terminal.

## 3. Nen tang he thong file

- [x] Them kieu du lieu chung trong `src/types.ts`.
- [x] Xay util chuan hoa duong dan muc tieu.
- [x] Xay util chan path vuot ra ngoai `--path`.
- [x] Xay util nhan dien file text va binary.
- [x] Xay util hash noi dung file.

## 4. Ignore va scan file

- [x] Xay danh sach ignore mac dinh.
- [x] Them bo qua `node_modules`.
- [x] Them bo qua `dist`.
- [x] Them bo qua `.git`.
- [x] Them bo qua `.ai-track`.
- [x] Xay ham quet cay file theo ignore rules.

## 5. Snapshot va state

- [x] Tao module doc/ghi `state.json`.
- [x] Tao module sinh `snapshot-id`.
- [x] Tao cau truc `.ai-track/snapshots/<snapshot-id>/`.
- [x] Copy file baseline vao `files/` trong snapshot.
- [x] Ghi `manifest.json` voi hash, size, mtime, path.
- [x] Luu `targetPath` va snapshot active vao `state.json`.
- [x] Xu ly truong hop `start` duoc goi lai.

## 6. Compare va diff

- [x] Re-scan `--path` dua tren ignore rules.
- [x] So sanh manifest voi filesystem hien tai.
- [x] Danh dau file `added`.
- [x] Danh dau file `modified`.
- [x] Danh dau file `deleted`.
- [x] Xay renderer diff cho file text.
- [x] Hien thong bao rieng cho file binary.
- [x] Xay output terminal cho lenh `diff`.

## 7. Lenh CLI

- [x] Them entrypoint `src/cli.ts`.
- [x] Them lenh `ai-track start --path <dir>`.
- [x] Them lenh `ai-track diff`.
- [x] Them lenh `ai-track ui`.
- [x] Them lenh `ai-track rollback <file>`.
- [x] Them validate input va thong bao loi toi thieu.

## 8. Rollback

- [x] Khoi phuc file `modified` tu snapshot.
- [x] Khoi phuc file `deleted` tu snapshot.
- [x] Xoa file `added` khi rollback.
- [x] Chan rollback file nam ngoai `--path`.
- [x] Hien ket qua rollback ro rang trong terminal.

## 9. Terminal UI

- [x] Hien danh sach file thay doi trong UI.
- [x] Hien trang thai `added`, `modified`, `deleted`.
- [x] Hien diff chi tiet cho file dang chon.
- [x] Them loc theo trang thai thay doi.
- [x] Them hanh dong rollback tu UI.
- [x] Xu ly file binary trong UI.

## 10. Test va verification

- [x] Viet test cho ignore rules.
- [x] Viet test cho tao snapshot.
- [x] Viet test cho compare `added`.
- [x] Viet test cho compare `modified`.
- [x] Viet test cho compare `deleted`.
- [x] Viet test cho rollback file sua doi.
- [x] Viet test cho rollback file moi.
- [x] Viet test chan rollback vuot root.
- [x] Chay test tu dong toan bo.
- [x] Manual verify `start` tao dung `state.json` va `manifest.json`.
- [x] Manual verify `diff` hien dung thay doi.
- [x] Manual verify `ui` mo duoc diff tung file.

## 11. Docs

- [x] Viet `README.md` mo ta muc tieu tool.
- [x] Them huong dan chay `start`, `diff`, `ui`, `rollback`.
- [x] Them vi du rollback tung file.
- [x] Ghi ro ignore rules mac dinh.
- [x] Ghi ro gioi han voi file binary va dung luong snapshot.

## 12. Dong task

- [x] Ra soat lai file tao moi dung theo plan.
- [x] Ra soat lai diff de giu pham vi nho nhat.
- [x] Xac nhan cac cau hoi mo da duoc chot hoac ghi ro `unknown`.

## Execution Log

| Step | Status | Notes | Timestamp |
|------|--------|-------|-----------|
| 1.1  | [x]    | Chot Node.js + TypeScript | 2026-04-01 20:49 |
| 1.2  | [x]    | `rollback` nhan path tu `--path` | 2026-04-01 20:49 |
| 1.3  | [x]    | Phase dau chi giu 1 snapshot active | 2026-04-01 20:49 |
| 1.4  | [x]    | Luu `.ai-track/` canh `--path` | 2026-04-01 20:49 |
| 1.5  | [x]    | `ui` giu trong phase dau | 2026-04-01 20:49 |
| 2.1  | [x]    | Da tao `package.json` | 2026-04-01 20:53 |
| 2.2  | [x]    | Da tao `tsconfig.json` | 2026-04-01 20:53 |
| 2.3  | [x]    | Da tao `src/` va `tests/` | 2026-04-01 20:53 |
| 2.4  | [x]    | Da cau hinh `build`, `test`, `dev` | 2026-04-01 20:53 |
| 2.5  | [x]    | Chon `commander` | 2026-04-01 20:53 |
| 2.6  | [x]    | Chon `blessed` | 2026-04-01 20:53 |
| 3.1  | [x]    | Da them `src/types.ts` | 2026-04-01 21:02 |
| 3.2  | [x]    | Da chuan hoa target path | 2026-04-01 21:02 |
| 3.3  | [x]    | Da chan path traversal | 2026-04-01 21:02 |
| 3.4  | [x]    | Da nhan dien binary bang content scan | 2026-04-01 21:02 |
| 3.5  | [x]    | Da hash file bang sha256 | 2026-04-01 21:02 |
| 4.1  | [x]    | Da tao ignore mac dinh | 2026-04-01 21:02 |
| 4.2  | [x]    | Da bo qua `node_modules` | 2026-04-01 21:02 |
| 4.3  | [x]    | Da bo qua `dist` | 2026-04-01 21:02 |
| 4.4  | [x]    | Da bo qua `.git` | 2026-04-01 21:02 |
| 4.5  | [x]    | Da bo qua `.ai-track` | 2026-04-01 21:02 |
| 4.6  | [x]    | Da quet file de quy theo ignore | 2026-04-01 21:02 |
| 5.1  | [x]    | Da doc ghi `state.json` | 2026-04-01 21:02 |
| 5.2  | [x]    | Da sinh `snapshot-id` bang UUID | 2026-04-01 21:02 |
| 5.3  | [x]    | Da tao cay thu muc snapshot | 2026-04-01 21:02 |
| 5.4  | [x]    | Da copy baseline vao snapshot | 2026-04-01 21:02 |
| 5.5  | [x]    | Da ghi `manifest.json` | 2026-04-01 21:02 |
| 5.6  | [x]    | Da luu target va snapshot active | 2026-04-01 21:02 |
| 5.7  | [x]    | `start` goi lai tao snapshot moi va cap nhat active | 2026-04-01 21:02 |
| 6.1  | [x]    | Da re-scan thu muc hien tai | 2026-04-01 21:02 |
| 6.2  | [x]    | Da so sanh manifest voi filesystem | 2026-04-01 21:02 |
| 6.3  | [x]    | Da nhan dien `added` | 2026-04-01 21:02 |
| 6.4  | [x]    | Da nhan dien `modified` | 2026-04-01 21:02 |
| 6.5  | [x]    | Da nhan dien `deleted` | 2026-04-01 21:02 |
| 6.6  | [x]    | Da render diff text bang `diff` | 2026-04-01 21:02 |
| 6.7  | [x]    | Da them thong bao cho file binary | 2026-04-01 21:02 |
| 6.8  | [x]    | Da in bao cao diff ra terminal | 2026-04-01 21:02 |
| 7.1  | [x]    | Da them `src/cli.ts` | 2026-04-01 21:02 |
| 7.2  | [x]    | Da them lenh `start` | 2026-04-01 21:02 |
| 7.3  | [x]    | Da them lenh `diff` | 2026-04-01 21:02 |
| 7.4  | [x]    | Da them lenh `ui` | 2026-04-01 21:02 |
| 7.5  | [x]    | Da them lenh `rollback` | 2026-04-01 21:02 |
| 7.6  | [x]    | Da them validate co ban tu `commander` va runtime errors | 2026-04-01 21:02 |
| 8.1  | [x]    | Da khoi phuc file modified | 2026-04-01 21:02 |
| 8.2  | [x]    | Da khoi phuc file deleted | 2026-04-01 21:02 |
| 8.3  | [x]    | Da xoa file added khi rollback | 2026-04-01 21:02 |
| 8.4  | [x]    | Da chan rollback ngoai root | 2026-04-01 21:02 |
| 8.5  | [x]    | Da in ket qua rollback ra terminal | 2026-04-01 21:02 |
| 9.1  | [x]    | UI da hien danh sach thay doi | 2026-04-01 21:02 |
| 9.2  | [x]    | UI da hien trang thai thay doi | 2026-04-01 21:02 |
| 9.3  | [x]    | UI da hien diff file dang chon | 2026-04-01 21:02 |
| 9.4  | [x]    | UI da loc bang phim `a/m/d/0` | 2026-04-01 21:02 |
| 9.5  | [x]    | UI da rollback bang phim `r` | 2026-04-01 21:02 |
| 9.6  | [x]    | UI da hien thong bao binary | 2026-04-01 21:02 |
| 10.1 | [x]    | Da viet test ignore | 2026-04-01 21:02 |
| 10.2 | [x]    | Da viet test snapshot | 2026-04-01 21:02 |
| 10.3 | [x]    | Da test `added` | 2026-04-01 21:02 |
| 10.4 | [x]    | Da test `modified` | 2026-04-01 21:02 |
| 10.5 | [x]    | Da test `deleted` | 2026-04-01 21:02 |
| 10.6 | [x]    | Da test rollback file sua doi | 2026-04-01 21:02 |
| 10.7 | [x]    | Da test rollback file moi | 2026-04-01 21:02 |
| 10.8 | [x]    | Da test chan rollback vuot root | 2026-04-01 21:02 |
| 10.9 | [x]    | `npm test` pass 6 tests | 2026-04-01 21:02 |
| 10.10 | [x]   | Manual verify `start` tao state va manifest | 2026-04-01 21:02 |
| 10.11 | [x]   | Manual verify `diff` hien modified va added | 2026-04-01 21:02 |
| 10.12 | [x]   | Manual smoke-test `ui` khong loi khi render | 2026-04-01 21:02 |
| 11.1 | [x]    | Da viet README | 2026-04-01 21:02 |
| 11.2 | [x]    | Da them huong dan lenh | 2026-04-01 21:02 |
| 11.3 | [x]    | Da them vi du rollback | 2026-04-01 21:02 |
| 11.4 | [x]    | Da ghi ignore rules | 2026-04-01 21:02 |
| 11.5 | [x]    | Da ghi gioi han binary va snapshot | 2026-04-01 21:02 |
| 12.1 | [x]    | Da doi chieu file tao moi voi plan | 2026-04-01 21:02 |
| 12.2 | [x]    | Da ra soat worktree de giu pham vi nho | 2026-04-01 21:02 |
| 12.3 | [x]    | Da chot cac cau hoi mo | 2026-04-01 21:02 |
