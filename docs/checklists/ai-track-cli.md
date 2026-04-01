# Checklist: AI Track CLI Tool

## 1. Lam ro yeu cau

- [-] Xac nhan runtime se dung cho CLI.
- [ ] Xac nhan `rollback <file>` nhan duong dan tu root `--path`.
- [ ] Xac nhan chi ho tro 1 snapshot active o pha dau.
- [ ] Xac nhan `.ai-track/` luu canh project tool hay canh `--path`.
- [ ] Xac nhan muc tieu `ui` phai co ngay trong phase dau.

## 2. Khoi tao project

- [ ] Tao `package.json` cho CLI.
- [ ] Them `tsconfig.json` cho TypeScript.
- [ ] Tao cau truc thu muc `src/` va `tests/`.
- [ ] Cau hinh script `build`, `test`, `dev`.
- [ ] Chon thu vien parse lenh CLI.
- [ ] Chon thu vien TUI terminal.

## 3. Nen tang he thong file

- [ ] Them kieu du lieu chung trong `src/types.ts`.
- [ ] Xay util chuan hoa duong dan muc tieu.
- [ ] Xay util chan path vuot ra ngoai `--path`.
- [ ] Xay util nhan dien file text va binary.
- [ ] Xay util hash noi dung file.

## 4. Ignore va scan file

- [ ] Xay danh sach ignore mac dinh.
- [ ] Them bo qua `node_modules`.
- [ ] Them bo qua `dist`.
- [ ] Them bo qua `.git`.
- [ ] Them bo qua `.ai-track`.
- [ ] Xay ham quet cay file theo ignore rules.

## 5. Snapshot va state

- [ ] Tao module doc/ghi `state.json`.
- [ ] Tao module sinh `snapshot-id`.
- [ ] Tao cau truc `.ai-track/snapshots/<snapshot-id>/`.
- [ ] Copy file baseline vao `files/` trong snapshot.
- [ ] Ghi `manifest.json` voi hash, size, mtime, path.
- [ ] Luu `targetPath` va snapshot active vao `state.json`.
- [ ] Xu ly truong hop `start` duoc goi lai.

## 6. Compare va diff

- [ ] Re-scan `--path` dua tren ignore rules.
- [ ] So sanh manifest voi filesystem hien tai.
- [ ] Danh dau file `added`.
- [ ] Danh dau file `modified`.
- [ ] Danh dau file `deleted`.
- [ ] Xay renderer diff cho file text.
- [ ] Hien thong bao rieng cho file binary.
- [ ] Xay output terminal cho lenh `diff`.

## 7. Lenh CLI

- [ ] Them entrypoint `src/cli.ts`.
- [ ] Them lenh `ai-track start --path <dir>`.
- [ ] Them lenh `ai-track diff`.
- [ ] Them lenh `ai-track ui`.
- [ ] Them lenh `ai-track rollback <file>`.
- [ ] Them validate input va thong bao loi toi thieu.

## 8. Rollback

- [ ] Khoi phuc file `modified` tu snapshot.
- [ ] Khoi phuc file `deleted` tu snapshot.
- [ ] Xoa file `added` khi rollback.
- [ ] Chan rollback file nam ngoai `--path`.
- [ ] Hien ket qua rollback ro rang trong terminal.

## 9. Terminal UI

- [ ] Hien danh sach file thay doi trong UI.
- [ ] Hien trang thai `added`, `modified`, `deleted`.
- [ ] Hien diff chi tiet cho file dang chon.
- [ ] Them loc theo trang thai thay doi.
- [ ] Them hanh dong rollback tu UI.
- [ ] Xu ly file binary trong UI.

## 10. Test va verification

- [ ] Viet test cho ignore rules.
- [ ] Viet test cho tao snapshot.
- [ ] Viet test cho compare `added`.
- [ ] Viet test cho compare `modified`.
- [ ] Viet test cho compare `deleted`.
- [ ] Viet test cho rollback file sua doi.
- [ ] Viet test cho rollback file moi.
- [ ] Viet test chan rollback vuot root.
- [ ] Chay test tu dong toan bo.
- [ ] Manual verify `start` tao dung `state.json` va `manifest.json`.
- [ ] Manual verify `diff` hien dung thay doi.
- [ ] Manual verify `ui` mo duoc diff tung file.

## 11. Docs

- [ ] Viet `README.md` mo ta muc tieu tool.
- [ ] Them huong dan chay `start`, `diff`, `ui`, `rollback`.
- [ ] Them vi du rollback tung file.
- [ ] Ghi ro ignore rules mac dinh.
- [ ] Ghi ro gioi han voi file binary va dung luong snapshot.

## 12. Dong task

- [ ] Ra soat lai file tao moi dung theo plan.
- [ ] Ra soat lai diff de giu pham vi nho nhat.
- [ ] Xac nhan cac cau hoi mo da duoc chot hoac ghi ro `unknown`.

## Execution Log

| Step | Status | Notes | Timestamp |
|------|--------|-------|-----------|
| 1.1  | [-]    | Dang cho user chot runtime | 2026-04-01 20:49 |
