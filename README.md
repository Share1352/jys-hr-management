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
- `doGet` chỉ phục vụ health-check công khai:
  - `action=health` (canonical) và `action=ping` (alias tương thích) trả cùng payload health.
  - Các action nghiệp vụ gọi qua GET đều bị từ chối với thông báo bắt buộc dùng POST.

Khuyến nghị vận hành:
- Mọi bản frontend đang chạy trên Wix/static host phải được thay bằng bản mới nhất từ `production/jys_quan_ly_nhan_su.html`.
- Không duy trì nhiều bản frontend cũ song song để tránh tiếp tục phát sinh traffic GET đã deprecated.

---

## Observability & deployment automation

### Health endpoint contract

`GET API_URL?action=health` (alias `?action=ping`) — công khai, không có dữ liệu nhạy cảm:

```json
{
  "ok": true,
  "service": "jys-hr",
  "version": "<BUILD_ID>",
  "backendBuild": "<BUILD_ID>",
  "timestamp": "<ISO>",
  "ts": 0,
  "runtime": "google-apps-script",
  "sheets": { "NhanVien": true, "ViPham": true, "KiemTra": true, "LuongThang": true, "AuditLog": true },
  "requestId": "<uuid>"
}
```

Không bao giờ chứa: manager code, PIN nhân viên, spreadsheet id, hay API URL.

### Build ID policy

- Định dạng: `YYYYMMDD-HHMMSSZ-<shortSha>` (ví dụ `20260526-091533Z-ae9274f`).
- Sinh **một lần** mỗi lần deploy trong workflow, dùng chung cho cả backend và frontend.
- Frontend: inject vào `var APP_BUILD = "__APP_BUILD__";`.
- Backend: stamp vào `DEFAULT_APP_BUILD` của bản Code.gs đã copy (hoặc Script Property `APP_BUILD`).
- Verify bắt buộc `frontend APP_BUILD == backend health build`; lệch → banner cảnh báo + verify fail.

### Diagnostics object (frontend)

`window.__JYS_DIAG__` (an toàn, debug từ trình duyệt): `service`, `frontendBuild`, `backendBuild`, `apiConfigured`, `apiHost` (chỉ host — **không** phải URL đầy đủ), `mode`, `canonicalUrl`, `lastRequestId`, `lastHealth`, `lastError`. Không chứa API_URL đầy đủ, auth, PIN, hay manager code.

### AuditLog fields (append-only)

`id, ts, requestId, level, status, source, actorRole, actorId, action, targetSheet, targetId, message, detailsJson, durationMs, build, userAgent`

- Schema migration là **append-only** (`ensureSheet_` chỉ thêm cột thiếu, không xoá/đổi cột cũ).
- `source`: `backend` | `frontend`. `level`: `info|warn|error`. `status`: `success|validation_error|auth_failure|exception|malformed_json|client`.
- Mọi giá trị được làm sạch (`sanitizeForLog_`) trước khi ghi: redact auth/PIN/managerCode/password/API URL/token/Bearer/cookie; `detailsJson` giới hạn ~3000 ký tự.
- `clientLog` ghi telemetry frontend; `getAuditLog` (chỉ quản lý) đọc lại log để troubleshoot từ xa.

### Deploy workflow — `.github/workflows/deploy-wix.yml`

Push `main` hoặc `workflow_dispatch`. Thứ tự: kiểm secrets → secret scan → sinh BUILD_ID → **deploy Apps Script (trước)** → xác nhận `health.backendBuild == BUILD_ID` → **deploy Wix bundle** → **verify production** → upload artifacts. Fail sớm nếu thiếu secret bắt buộc (`API_URL`, `WIX_API_KEY`, `GAS_SCRIPT_ID`, `CLASP_CREDENTIALS_JSON`).

Secrets/variables: xem `docs/observability-runbook.md`.

### Verification workflow — `.github/workflows/verify-production.yml`

`workflow_dispatch` + cron mỗi 30 phút. Chạy `scripts/verify-production.mjs`: kiểm bundle (no placeholders, có `APP_BUILD`, có `__JYS_DIAG__`), health, parity build, render trang đăng nhập (Playwright), legacy URL về canonical. Upload `verification-summary.md` + screenshots + console/network logs.

### Rollback workflow

1. Re-run `deploy-wix.yml` từ commit known-good gần nhất (Run workflow → chọn commit).
2. Hoặc re-point Wix Custom Embed `BUNDLE_URL` về `bundleUrl` trong `artifacts/deploy-manifest.json` của bản trước.
3. Xác nhận `?action=health` trả đúng build và trang canonical render. Chi tiết: `docs/observability-runbook.md`.

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

### Deployment freshness policy (SLO + verification)

- **Example SLO:** merged PR should be visible on `https://www.jysenglish.com/?app=jys-hr` within **5 minutes** (with deterministic redirect to canonical `/quan-ly-nhan-su`).
- This SLO tracks freshness from merge/deploy to end-user-visible render.

**Exact verification steps**

1. **Check custom embed `BUNDLE_URL`**
   - In Wix page settings for `/quan-ly-nhan-su`, open the custom embed and copy the exact configured `BUNDLE_URL`.
   - Confirm the URL points to the intended new artifact.
2. **Fetch bundle content hash/version marker**
   - Fetch the bundle from `BUNDLE_URL` and compute hash:
     - `curl -fsSL "$BUNDLE_URL" | shasum -a 256`
   - Compare against expected version marker (commit SHA / release marker) for the merged PR.
3. **Verify page render after cache window**
   - Wait for the cache window to pass (up to the 5-minute SLO budget).
   - Hard-refresh and verify runtime on both:
     - `https://www.jysenglish.com/quan-ly-nhan-su`
     - `https://www.jysenglish.com/?app=jys-hr` (must redirect to canonical route).
   - Confirm the page renders and reflects the merged change.

**Rollback note**

- If smoke test fails, re-point the embed to the previous known-good `BUNDLE_URL`, republish Wix, and re-run the verification steps above.
