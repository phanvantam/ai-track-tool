# Plan: AI Track CLI Tool

## 1. Context & Goals

- Muc tieu la theo doi thay doi file do AI gay ra ma khong dung git.
- Tool can snapshot truoc khi AI sua, hien diff, rollback tung file.
- Giao dien chay trong terminal, uu tien pham vi nho nhat dung yeu cau.
- Repo hien trong. Khong co `docs/` hay code hien trang de tai su dung.

## 2. Hien trang

- Thu muc goc rong. Chua co runtime, package manager, test setup.
- Chua co tai lieu `docs/architecture.md`, `docs/coding-standards.md`, `docs/code-structure.md`.
- Chua co cau truc lenh CLI, storage format, hay quy uoc ignore.
- Yeu cau "start watching" chua can daemon rieng.
- So sanh he thong file hien tai voi snapshot da du cho `ui`, `diff`, `rollback`.

## 3. Phuong an de xuat

### 3.1 Huong nho nhat

- Bootstrap mot CLI local co 4 lenh: `start`, `ui`, `diff`, `rollback`.
- Luu metadata va snapshot trong thu muc an `.ai-track/` ben trong project tool.
- `start --path <dir>` se:
- Chuan hoa duong dan muc tieu.
- Quet file theo ignore mac dinh.
- Copy noi dung file vao snapshot goc.
- Ghi manifest de lam baseline so sanh.
- `diff` va `ui` khong can tien trinh watch nen. Chung doc baseline va re-scan thu muc hien tai.
- `rollback <file>` khoi phuc mot file tu snapshot.
- Neu file duoc them moi sau snapshot, rollback se xoa file do.

### 3.2 Luu tru snapshot

- De xuat cau truc:

```text
.ai-track/
  state.json
  snapshots/
    <snapshot-id>/
      manifest.json
      files/<relative-path>
```

- `state.json` luu snapshot dang active va `targetPath`.
- `manifest.json` luu danh sach file, hash, size, mtime, ignore rules.
- Copy day du file goc de rollback don gian, tranh phuc tap hoa bang patch nguoc.

### 3.3 Tinh toan thay doi

- Modified: file ton tai o snapshot va hien tai, hash khac.
- Added: chi co o hien tai.
- Deleted: chi co o snapshot.
- Diff text: so sanh noi dung snapshot va hien tai theo tung file.
- Binary: hien thi thong bao binary changed, khong render line diff.

### 3.4 Ignore rules

- Mac dinh bo qua: `node_modules`, `dist`, `.git`, `.ai-track`.
- Cho phep mo rong sau bang config, nhung khong can o pha dau.
- Can chuan hoa path de tranh rollback ra ngoai `--path`.

### 3.5 Terminal UI

- UI toi thieu gom danh sach file thay doi + khung chi tiet diff.
- Ho tro loc theo trang thai: added, modified, deleted.
- Ho tro chon file va kich hoat rollback tu UI.
- Neu TUI qua nang trong buoc dau, co the lam `diff` truoc, `ui` sau.
- Tuy nhien yeu cau da liet ke `ui`, nen plan van giu trong phase 1.

### 3.6 De xuat stack

- De xuat mac dinh: Node.js + TypeScript.
- Ly do: thao tac file manh, thu vien CLI/TUI pho bien, de phat hanh binary sau nay.
- Neu user co rang buoc ngon ngu khac, can xac nhan truoc khi code.

## 4. Task Breakdown

1. Khoi tao project CLI toi thieu.
2. Them parser lenh cho `start`, `diff`, `ui`, `rollback`.
3. Xay util quet file theo ignore mac dinh.
4. Xay module snapshot tao `manifest.json` va copy file goc.
5. Xay module compare sinh danh sach `added`, `modified`, `deleted`.
6. Xay renderer diff text cho terminal.
7. Xay rollback tung file tu snapshot.
8. Xay TUI hien danh sach thay doi va diff.
9. Them test cho snapshot, compare, rollback, ignore.
10. Them README usage co vi du lenh co ban.

## 5. Files du kien anh huong

- `package.json`
- `tsconfig.json`
- `README.md`
- `src/cli.ts`
- `src/commands/start.ts`
- `src/commands/diff.ts`
- `src/commands/ui.ts`
- `src/commands/rollback.ts`
- `src/core/snapshot.ts`
- `src/core/compare.ts`
- `src/core/rollback.ts`
- `src/core/ignore.ts`
- `src/core/state.ts`
- `src/core/diff.ts`
- `src/types.ts`
- `tests/snapshot.test.ts`
- `tests/compare.test.ts`
- `tests/rollback.test.ts`

## 6. Rui ro & Cau hoi mo

- Unknown runtime mong muon. Repo chua co stack mac dinh.
- Snapshot copy full file co the ton dung luong lon tren thu muc rat to.
- File binary rollback duoc, nhung diff chi nen hien thong bao.
- Can quy uoc `rollback <file>` nhan path tu root nao.
- Can quyet dinh co ho tro nhieu snapshot hay chi 1 snapshot active.
- Neu `--path` tro vao thu muc ngoai repo, can quy dinh noi luu `.ai-track`.
- TUI can xac nhan thu vien. Khong nen tu viet terminal renderer tu dau.

## 7. Verification

- `start` tao `.ai-track/state.json`, snapshot folder, `manifest.json`.
- Sua, them, xoa file trong `--path`, sau do `diff` hien dung 3 trang thai.
- `rollback <file>` khoi phuc file sua doi ve noi dung goc.
- `rollback <file>` xoa file moi duoc them sau snapshot.
- File trong ignore list khong xuat hien trong snapshot va diff.
- `ui` hien danh sach thay doi va mo duoc diff tung file.
- Test tu dong cho compare, ignore, rollback deu pass.
