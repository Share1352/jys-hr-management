# JYS HR Management

Hệ thống quản lý nhân sự cho Trung tâm Anh ngữ Quốc tế JYS.

Backend: **Google Apps Script + Google Sheets**.
Frontend: **một file HTML tĩnh duy nhất** (`production/jys_quan_ly_nhan_su.html`) — nhúng vào trang Wix qua iframe, hoặc host trên bất kỳ static host nào.

---

## Cấu trúc thư mục

```
production/        ← ĐƯỜNG DẪN ĐI VÀO SẢN PHẨM. Chỉ deploy từ đây.
  jys_quan_ly_nhan_su.html   Single-file frontend (vanilla JS, không build step)
  Code.gs                    Apps Script backend (copy vào Apps Script editor)
  HUONG_DAN_CAI_DAT.md       Hướng dẫn cài đặt từ A→Z
  WIX_PAGE_SETUP.md          Cách nhúng iframe vào Wix
  TEST_PLAN.md               Test plan QA — phải pass trước khi deploy

prototype/         ← TÀI LIỆU THAM CHIẾU VISUAL. KHÔNG dùng để deploy.
  index.html                 Bản React/JSX để xem nhanh giao diện
  app.jsx, screens-*.jsx, styles.css, data.js
  jys-hr.html                Snapshot bundle cũ
  verify-live.html           Trang kiểm tra nhanh
  jys-logo-dataurl.txt       Logo embed (base64 data URL)

archive/old-bundles/   ← Các bản dựng cũ. Không build, không deploy từ đây.
```

---

## ⚠️ Quy tắc bảo mật

Repo này là **private** và **không bao giờ chứa secrets**.

| Bí mật | Lưu ở đâu | Tuyệt đối KHÔNG |
|---|---|---|
| `API_URL` (link Apps Script `/exec`) | Chỉ dán vào **bản HTML đã deploy** (file copy trên host). | Commit URL thật vào repo. Repo giữ placeholder `__API_URL__`. |
| `MANAGER_CODE` | Apps Script → **Project Settings → Script Properties**. | Hardcode trong `Code.gs`, README, docs, hoặc bất kỳ file nào trong repo. |


### Quy tắc token GitHub (bắt buộc)

- **Không bao giờ** dán token (PAT, fine-grained PAT, OAuth token, App token) vào issue, PR comment, chat, commit message, hoặc bất kỳ file nào trong repo.
- Nếu lộ token, phải xử lý theo thứ tự: **(1) revoke ngay trên GitHub**, **(2) audit phạm vi truy cập và logs**, **(3) chỉ tạo token mới khi thực sự cần**, với quyền tối thiểu đúng theo repo/action cần dùng.
- Không dùng token “full access” cho tác vụ thường ngày. Ưu tiên fine-grained token, giới hạn repo cụ thể, quyền read/write tối thiểu, và thời hạn ngắn.

### Quy ước placeholder

- `production/jys_quan_ly_nhan_su.html` phải luôn chứa:
  ```js
  var API_URL = "__API_URL__";
  ```
  Khi deploy, copy file ra ngoài repo, thay `__API_URL__` bằng URL Apps Script thật, rồi mới upload lên host. **Không commit phiên bản đã thay**.

- `production/Code.gs` không có giá trị `MANAGER_CODE` mặc định. `khoiTaoSheet()` sẽ throw nếu chưa cấu hình Script Property → buộc người triển khai phải đặt mã thật trong Apps Script.

---

## Canonical HR URL policy (Wix)

- Canonical route duy nhất cho staff: `https://www.jysenglish.com/quan-ly-nhan-su`.
- Nếu phải giữ public link cũ `https://www.jysenglish.com/?app=jys-hr`, Wix phải cấu hình **deterministic redirect** (301 hoặc router logic) để luôn chuyển về `/quan-ly-nhan-su`.
- `https://www.jysenglish.com/#jys-hr` được xem là deprecated và không dùng cho vận hành.
- **Cutoff date:** sau **2026-07-31 (UTC)**, tài liệu nội bộ và truyền thông vận hành chỉ được dùng canonical route `/quan-ly-nhan-su`.

## Triển khai (tóm tắt)

Xem chi tiết trong `production/HUONG_DAN_CAI_DAT.md`. Tóm tắt:

1. **Google Sheet + Apps Script**
   - Tạo Google Sheet mới.
   - Tools → Apps Script → dán toàn bộ `production/Code.gs`.
   - Project Settings → Script Properties → thêm `MANAGER_CODE = <mã riêng do bạn chọn>`.
   - Chạy `khoiTaoSheet()` một lần để tạo các tab.
   - Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone). Copy URL `/exec`.

2. **Frontend**
   - Copy `production/jys_quan_ly_nhan_su.html` ra ngoài repo.
   - Sửa `var API_URL = "__API_URL__";` thành URL `/exec` ở bước 1.
   - Upload file đã sửa lên static host (Cloudflare Pages, GitHub Pages, hoặc host bất kỳ).

3. **Wix embed**
   - Trong Wix Editor, dùng trang slug `/quan-ly-nhan-su` làm route chuẩn duy nhất cho staff.
   - Nếu duy trì `?app=jys-hr`, bắt buộc redirect deterministic về `/quan-ly-nhan-su`.
   - Add → Embed → HTML iframe → trỏ tới URL bản frontend.
   - Xem `production/WIX_PAGE_SETUP.md`.

4. **QA**
   - Chạy đủ checklist trong `production/TEST_PLAN.md` trước mỗi lần deploy.

---

## API policy (GET vs POST)

- **POST là chuẩn chính thức** cho toàn bộ action nghiệp vụ:
  - `listNames`, `loginManager`, `loginStaff`, `getAll`, `getMine`
  - và các action ghi dữ liệu (`save*`, `delete*`).
- `doGet` chỉ dành cho `action=ping` để health-check.
- Backend có **cửa sổ tương thích tạm thời** cho client cũ gọi GET các action ở trên đến hết **2026-07-31 (UTC)**, đồng thời ghi audit `legacyDoGet:<action>` để truy vết client cũ.
- Sau mốc này, GET cho các action nghiệp vụ sẽ bị từ chối và bắt buộc cập nhật frontend bản mới.

Khuyến nghị vận hành:
- Mọi bản frontend đang chạy trên Wix/static host phải được thay bằng bản mới nhất từ `production/jys_quan_ly_nhan_su.html`.
- Không duy trì nhiều bản frontend cũ song song để tránh tiếp tục phát sinh traffic GET đã deprecated.

---

## Trạng thái

- **Chưa enable GitHub Pages.** Sẽ chỉ bật sau khi các blocker trong issue *"Blocking fixes before deployment"* được fix và `TEST_PLAN.md` pass.
- **prototype/** chỉ để tham chiếu visual — không sync logic với `production/`.
- Tất cả thay đổi production phải đi qua `production/` và bumps `TEST_PLAN.md`.


## Production deployment authority (single source)

### Canonical runtime URL

- **Canonical runtime URL:** `https://www.jysenglish.com/quan-ly-nhan-su`
- Legacy entry `https://www.jysenglish.com/?app=jys-hr` is allowed only as an input URL and must redirect deterministically to `/quan-ly-nhan-su` (301 or router redirect).

### Canonical CI workflow file

- **Canonical production workflow:** `.github/workflows/deploy-wix.yml`
- `.github/workflows/deploy-hr.yml` is **preview/archive only** and is intentionally manual (`workflow_dispatch`) to prevent accidental parallel production deploys.

### Fallback/rollback process

1. If a bad production deploy happens, re-run `.github/workflows/deploy-wix.yml` from the last known-good commit SHA.
2. Confirm the Wix custom embed points to the expected bundle URL and that bundle no longer contains `__API_URL__` placeholder.
3. Verify runtime behavior on both:
   - `https://www.jysenglish.com/quan-ly-nhan-su`
   - `https://www.jysenglish.com/?app=jys-hr` (must redirect to canonical URL).
4. If redirect breaks, restore Wix Redirect Manager rule (or Velo router fallback) from `?app=jys-hr` to `/quan-ly-nhan-su`, then republish Wix site.
