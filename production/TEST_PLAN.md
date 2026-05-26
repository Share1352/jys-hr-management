# Test Plan — JYS HR (production)

Chạy toàn bộ checklist này **trước khi giao app cho nhân viên dùng**. Đánh dấu ✅ nếu pass, ❌ nếu fail và ghi chú lại.

Người chạy: Codex (automation)   Ngày: 2026-05-20

> **Trạng thái:** các mục để trống (`[ ]`) là chưa xác nhận thủ công. Nhiều mục runtime giờ được **CI tự động kiểm tra** (xem mục **M** và phần "Automated production verification evidence"): health endpoint, khớp build giao diện/máy chủ, render trang đăng nhập, redaction log. Các mục còn lại (mobile thực tế, UX nhân viên) vẫn cần kiểm tra thủ công.

---

## Automated production verification evidence

Điền sau mỗi lần deploy/verify chạy trên CI (artifacts đính kèm ở run GitHub Actions):

| Trường | Giá trị |
|---|---|
| Build ID | `____________________` |
| Commit SHA | `____________________` |
| Deploy workflow run URL | `____________________` |
| Verify workflow run URL | `____________________` |
| Health endpoint result | `artifacts/health.json` |
| Screenshot | `artifacts/canonical-login.png`, `artifacts/legacy.png` |
| Console/network log | `artifacts/console-log.json`, `artifacts/network-failures.json` |
| Deploy manifest | `artifacts/deploy-manifest.json` |
| Pass/Fail | `____________________` |

Nguồn sự thật: `artifacts/verification-summary.md` (checklist pass/fail do `scripts/verify-production.mjs` sinh ra).

---

## A. Cấu hình ban đầu

- [ ] Mở app từ địa chỉ chính thức (`/quan-ly-nhan-su` trên Wix, hoặc URL deploy). **App phải hiện màn hình đăng nhập trong < 3 giây.**
- [ ] Không có lỗi gì hiện trên console của trình duyệt (Devtools → Console).
- [ ] Logo JYS hiện rõ ở giữa khung đăng nhập.
- [ ] Có thể chuyển giữa hai tab **Nhân viên / Quản lý** ở khung đăng nhập.

## B. Đăng nhập sai

- [ ] Tab **Quản lý** + nhập mã sai → báo lỗi đỏ "Sai mã quản lý" (không phải "Không kết nối được máy chủ").
- [ ] Tab **Nhân viên** + chưa chọn tên → báo "Chọn tên của bạn".
- [ ] Tab **Nhân viên** + đã chọn tên + chỉ nhập 2 chữ số → báo "Mã cá nhân gồm 4 chữ số".
- [ ] Tab **Nhân viên** + đã chọn tên + nhập 4 số sai → báo lỗi đỏ "Sai mã cá nhân".
- [ ] Cứ mỗi lần kiểm tra đăng nhập, **overlay loading hiện rồi tắt** chứ không treo mãi.
- [ ] Frontend có placeholder `__APP_BUILD__` và footer hiển thị nhãn build tiếng Việt (không gây vướng UI).
- [ ] API `ping` trả về `backendBuild` lấy từ Script Property `APP_BUILD` (hoặc fallback constant khi property chưa đặt).
- [ ] Sau đăng nhập (quản lý hoặc nhân viên), frontend hiển thị đủ 2 vế build và **build giao diện == build backend**.

## C. Đăng nhập quản lý

- [ ] Nhập đúng mã quản lý (từ Script Properties) → vào app, header hiện chip **đen "Quản lý"**.
- [ ] Có đủ 5 tab: **Tổng quan, Hồ sơ nhân sự, Ghi nhận vi phạm, Danh mục lỗi, Kiểm tra**.

## D. CRUD nhân viên

- [ ] Tab **Hồ sơ nhân sự**: form bên trái hiện rõ. Combo "Chi nhánh" có đúng 3 lựa chọn: **Đô Lương, Vinh, Quảng Sơn** (không còn "Văn Hiến").
- [ ] Combo chi nhánh trong bộ lọc bên phải cũng có đúng 3 lựa chọn đó + "Tất cả".
- [ ] Trên tab **Tổng quan**, combo lọc "Chi nhánh" cũng đúng 3 lựa chọn đó + "Tất cả chi nhánh".
- [ ] Header app dưới logo: "Trung tâm Anh ngữ Quốc tế JYS · Đô Lương · Vinh · **Quảng Sơn**".

- [ ] **Thêm mới** một nhân viên (tên giả "Test Một"): chọn chi nhánh "Đô Lương", lương 9.000.000, nhập đủ vào ngày sinh, ngày vào làm, hợp đồng từ–đến.
- [ ] Hạng nghề nghiệp tự đổi sang **Bậc 2** khi nhập 9.000.000.
- [ ] Bấm **Lưu hồ sơ**. Overlay hiện. **Hộp thoại mã cá nhân hiện** với mã 4 số to, dễ đọc, kèm tên nhân viên. Nút "Sao chép mã" copy được vào clipboard.
- [ ] Đóng hộp thoại → nhân viên hiện trong bảng bên phải, cột "Mã CN" hiện đúng mã đã thấy.
- [ ] Mở lại sheet `NhanVien`: row mới có cột `maCaNhan` đúng mã đó, cột `createdAt` và `updatedAt` đã set.

- [ ] **Sửa** nhân viên "Test Một": đổi vị trí và lương 13.000.000, bấm Lưu. Hạng tự đổi sang **Bậc 3**. Hộp thoại mã **không hiện** (vì không có "Tạo mã mới"). Toast "Đã cập nhật hồ sơ".
- [ ] Field `#hrPin` trong form sửa (mode **edit**) là **readonly** ngay khi mở form, không cho gõ/chỉnh sửa trực tiếp.
- [ ] Nhấn **Tạo mã mới khi lưu** (edit mode) → trạng thái readonly của `#hrPin` vẫn giữ nguyên; bấm Lưu → hộp thoại mã mới hiện. Mã mới khác mã cũ. Sheet `NhanVien` cột `maCaNhan` đã đổi.

- [ ] Evidence runtime bắt buộc cho mục readonly `#hrPin`: đính kèm (1) screenshot form sửa có thể hiện `#hrPin` không chỉnh được, (2) clip ngắn hoặc ảnh tuần tự khi thử gõ vào `#hrPin` nhưng giá trị không đổi, (3) Network/response + screenshot modal mã mới sau flow **Tạo mã mới khi lưu** để xác nhận luồng regenerate vẫn hoạt động.

- [ ] Thêm vài nhân viên khác ở các chi nhánh khác nhau (Vinh, Quảng Sơn).
- [ ] **Tìm**: gõ vào ô tìm kiếm → bảng lọc đúng.
- [ ] **Lọc chi nhánh**: chỉ hiện nhân viên đúng chi nhánh.
- [ ] **Xem** nhân viên: modal hồ sơ hiện đầy đủ, có **Hạng nghề nghiệp** banner đen, "Còn hiệu lực" pill xanh (nếu hợp đồng còn lâu).
- [ ] **Xóa** một nhân viên → confirm → mất khỏi danh sách. Mở sheet `NhanVien`: row đó **đã bị xóa thật** (không chỉ ẩn).

## E. Cảnh báo hợp đồng

- [ ] Thêm một nhân viên có `hopDongDen` = ngày trong tương lai gần (ví dụ 15 ngày sau hôm nay). Tab **Tổng quan**: cảnh báo đỏ "Sắp hết hạn hợp đồng — [tên]". Có nút **Gửi thông báo gia hạn**.
- [ ] Bấm nút đó → alert "Tính năng gửi email sẽ được kết nối sau."
- [ ] Thêm một nhân viên có `hopDongDen` = ngày trong quá khứ. Cảnh báo đỏ "Hết hạn hợp đồng — [tên]". Có nút **Gửi thông báo gia hạn**.
- [ ] Mở modal Xem nhân viên đó: pill **đỏ** "Hết hạn hợp đồng" / "Sắp hết hạn hợp đồng · còn N ngày".
- [ ] Nhân viên không nhập `hopDongDen`: hiện "Không xác định thời hạn".

## F. Ghi nhận vi phạm

- [ ] Tab **Ghi nhận vi phạm**: chọn nhân viên, chọn lỗi `I.1`. Form hiện đơn giá 10.000đ. Lưu → toast hiện số tiền.
- [ ] Chọn lỗi `I.2` (per): hiện ô "Số mốc 5 phút". Nhập 3 → tổng 60.000đ. Lưu → hiện đúng trong bảng.
- [ ] Chọn lỗi `I.3` (manual): hiện warn vàng, ô tiền cho nhập. Để 0 → bấm Lưu → báo "Nhập số tiền phạt".
- [ ] Chọn lỗi `II.1` (none): ô tiền ẩn. Lưu → bảng hiện "phi tiền tệ".
- [ ] Lọc theo nhân viên / theo tháng / theo từ khoá → bảng đáp ứng đúng.
- [ ] **Xuất CSV** → file tải về có dòng tổng cộng, mở Excel hiện đúng tiếng Việt (BOM UTF-8).
- [ ] **Xóa** một bản ghi vi phạm → mất khỏi bảng và khỏi sheet `ViPham`.

## G. Đăng nhập nhân viên & quyền

- [ ] Đăng xuất quản lý. Tab **Nhân viên** → danh sách tên hiện đầy đủ (đã sort theo alphabet tiếng Việt). **Không có lương** trong danh sách (chỉ có tên + chi nhánh).
- [ ] Chọn "Test Một", nhập mã PIN đúng → vào app. Chip header hiện **xanh** với tên người đó (không phải "Quản lý").
- [ ] Có đúng 4 tab: **Hồ sơ của tôi, Lỗi của tôi, Danh mục lỗi, Kiểm tra**. **Không có** Tổng quan, Hồ sơ nhân sự, Ghi nhận vi phạm.
- [ ] Tab **Hồ sơ của tôi**: thấy đầy đủ thông tin của chính mình, lương đúng, hạng đúng.
- [ ] Tab **Lỗi của tôi**: thấy đúng các vi phạm của mình, không thấy của người khác.
- [ ] Mở **Devtools → Network**, refresh tab: response từ backend **chỉ chứa profile và vipham của chính mình**, không có cả mảng `nhanvien`.
- [ ] Trong Devtools → Network, các action xác thực (`loginManager`, `loginStaff`, `getAll`, `getMine`) được gửi bằng **POST** (không lộ auth trên query string URL).
- [ ] Gọi trực tiếp URL dạng GET (`?action=getAll`, `?action=getMine`, `?action=loginManager`, `?action=loginStaff`) trả lỗi bắt buộc dùng **POST**.

## H. Kiểm tra (Quiz)

- [ ] Tab **Kiểm tra** (quản lý): chọn nhân viên, bấm Bắt đầu. Câu hỏi và đáp án **xáo trộn** ở mỗi lần làm. Có thể Quay lại, Sửa.
- [ ] Nộp bài: hiện điểm. Pill "Đạt" hoặc "Chưa đạt". Có "Xem lại câu trả lời" liệt kê câu sai + đáp án đúng + lý giải.
- [ ] Bảng lịch sử ở trang quiz hiện điểm mới.
- [ ] **Xóa** một kết quả → mất khỏi bảng và khỏi sheet `KiemTra`.
- [ ] Tab **Kiểm tra** (nhân viên): tự làm cho chính mình. Lưu xong, sheet `KiemTra` có dòng mới với đúng `empId` của mình.

## I. Lỗi mạng / backend

- [ ] Tắt mạng / chặn URL Apps Script. Thử đăng nhập → báo đúng: **"Không kết nối được máy chủ. Vui lòng kiểm tra lại mạng hoặc bản triển khai Apps Script."** (không phải lỗi JS đỏ).
- [ ] Bật mạng lại, thao tác tiếp → ổn.
- [ ] Trong Apps Script: tạm gỡ `MANAGER_CODE` khỏi Script Properties. Đăng nhập quản lý → báo "Sai mã quản lý". Đặt lại → ổn.
- [ ] Tab `AuditLog` trong Sheet: kiểm tra có ghi event cho mỗi action (login, save, delete).

## J. Render trong iframe Wix

- [ ] Mở `https://www.jysenglish.com/quan-ly-nhan-su`. App nằm trong iframe, **không có khoảng đen trên đầu**.
- [ ] Không có hai thanh scroll.
- [ ] Đăng nhập, dùng app bình thường — modal, overlay, toast đều hoạt động.
- [ ] Khi nội dung dài (ví dụ bảng lỗi dài), iframe có **chiều cao đủ** để xem hết (hoặc scroll bên trong iframe nếu chiều cao cố định 100vh).
- [ ] **Đường dẫn `/?app=jys-hr` và `/#jys-hr` không được dùng** trong tài liệu hoặc menu nội bộ.


### J evidence notes (Wix deploy pipeline)

- [ ] Xác nhận secrets repository: `API_URL`, `WIX_API_KEY`, `GAS_SCRIPT_ID`, `CLASP_CREDENTIALS_JSON` (không rỗng). Tùy chọn: `GAS_DEPLOYMENT_ID`, `ALERT_WEBHOOK_URL`, `E2E_MANAGER_CODE`.
- [ ] Xác nhận repository variables: `WIX_SITE_ID` và `WIX_EMBED_ID` đúng với site production (hoặc giữ mặc định hiện tại có chủ đích).
- [ ] Trigger workflow `deploy-wix.yml` (push main hoặc `workflow_dispatch`).
- [ ] Xác nhận các step pass: Apps Script deploy → health == BUILD_ID → Wix deploy → **Verify production**.
- [ ] Ghi URL run thành công: `____________________________`.
- [ ] Đính kèm artifacts: `verification-summary.md`, `deploy-manifest.json`, `health.json`, screenshots.

## K. Mobile / responsive

- [ ] Mở app trên điện thoại (Chrome / Safari). Tabs cuộn ngang được. Form không bị tràn.
- [ ] Modal mã cá nhân hiện vừa màn hình.
- [ ] Bàn phím số tự bật khi gõ ô PIN 4 số.

## L. Lương tháng (LuongThang) — quản lý lương thực tế mỗi tháng

> Yêu cầu nghiệp vụ: mỗi nhân viên có thể có **lương thực tế khác nhau từng tháng**. Hạng nghề nghiệp tính trên **trung bình** các tháng đã ghi nhận. `NhanVien.luongThang` còn lại là lương mặc định / fallback.

- [ ] **L.1 — khoiTaoSheet tạo sheet `LuongThang`.** Mở Apps Script editor, chạy `khoiTaoSheet()`. Mở Google Sheet: có tab mới tên `LuongThang` với header hàng 1: `id, empId, month, luongThucTe, ghiChu, createdAt, updatedAt, createdBy`. Thông báo trả về của `khoiTaoSheet()` có chứa `"LuongThang"`.
- [ ] **L.2 — Manager tạo bản ghi lương tháng mới.** Đăng nhập quản lý → tab **Lương tháng**. Khung trái: chọn nhân viên "Test Một", tháng `2026-04`, lương `9.000.000`, ghi chú "test L.2", bấm **Lưu lương tháng**. Toast "Đã ghi lương tháng". Bảng bên phải có dòng mới. Mở sheet `LuongThang`: 1 row mới với đúng `empId`, `month=2026-04`, `luongThucTe=9000000`, `createdAt` và `updatedAt` đã set.
- [ ] **L.3 — Lưu cùng empId + tháng = update, không tạo trùng.** Vẫn nhân viên "Test Một", tháng `2026-04`, đổi lương thành `10.500.000`, ghi chú "đã điều chỉnh", **Lưu**. Toast "Đã cập nhật lương tháng". Sheet `LuongThang`: vẫn **đúng 1 row** cho (Test Một, 2026-04), `luongThucTe=10500000`, `createdAt` không đổi, `updatedAt` mới hơn. Audit log có 1 row `updateLuongThang`.
- [ ] **L.4 — Manager xóa bản ghi lương tháng.** Trong bảng, nhấn **Xóa** ở dòng vừa tạo, confirm. Toast "Đã xóa lương tháng". Sheet `LuongThang`: row đó **biến mất hoàn toàn** (không chỉ ẩn). Audit log có row `deleteLuongThang`.
- [ ] **L.5 — Staff chỉ thấy bản ghi của riêng mình.** Manager tạo 2 bản ghi lương tháng cho 2 nhân viên khác nhau (A và B). Đăng xuất, đăng nhập với tư cách nhân viên A. Trong tab **Hồ sơ của tôi**: phần "Lương tháng đã ghi nhận" chỉ liệt kê các tháng của A, **không có B**. Mở Devtools → Network → request `getMine`: response chỉ chứa `luongthang` của A, **không có** rows của B.
- [ ] **L.6 — `getAll` trả về `luongthang` cho manager.** Đăng nhập quản lý → mở Devtools Network, refresh tab Tổng quan. Request `getAll` response JSON có khóa `luongthang` là **array đầy đủ** tất cả bản ghi.
- [ ] **L.7 — `getMine` lọc đúng theo empId.** Như L.5, response `getMine` chỉ có `luongthang` với `empId` khớp người đăng nhập. Gọi trực tiếp `?action=getMine` với PIN sai → backend từ chối (như hiện tại).
- [ ] **L.8 — Hạng dùng trung bình lương tháng khi có bản ghi.** Manager thêm 3 bản ghi cho "Test Một": `2026-01 = 8.000.000`, `2026-02 = 12.000.000`, `2026-03 = 16.000.000`. Trung bình = 12.000.000 → kỳ vọng **Bậc 3**. Mở modal Xem hồ sơ "Test Một": "Lương trung bình/tháng" hiển thị **12.000.000 đ** kèm "(trung bình của 3 tháng)"; banner hạng = **Bậc 3**. Trong tab Hồ sơ nhân sự, dòng "Test Một" cột Hạng có pill **Bậc 3** + "3 tháng".
- [ ] **L.9 — Fallback về `NhanVien.luongThang` khi chưa có bản ghi.** Xoá hết bản ghi `LuongThang` của một nhân viên (vd "Test Hai") có `NhanVien.luongThang = 9.000.000`. Mở modal hồ sơ: "Lương tháng (mặc định)" hiển thị 9.000.000 + "(chưa có dữ liệu lương theo tháng)". Banner hạng = **Bậc 2**. Trong tab Hồ sơ nhân sự, dòng "Test Hai" cột Hạng = pill **Bậc 2**, **không có** chú thích "N tháng".
- [ ] **L.10 — Không commit secrets.** Chạy ở repo root:
  ```bash
  grep -RIn --exclude-dir=.git -E 'script\.google\.com/macros/s/[A-Za-z0-9_-]{20,}' . || true
  grep -RIn --exclude-dir=.git 'var API_URL = "https' production || true
  grep -RIn --exclude-dir=.git -E 'MANAGER_CODE\s*=\s*"[^_<]' production || true
  ```
  Cả ba lệnh **không in ra kết quả nào**. `production/jys_quan_ly_nhan_su.html` vẫn chứa nguyên `var API_URL = "__API_URL__";`.
- [ ] **L.11 — Backend từ chối tháng không hợp lệ (`00`, `13`).** Gửi request `saveLuongThang` với `record.month=2026-00` và `record.month=2026-13` (đã có `empId`, `luongThucTe`, `auth` hợp lệ). Backend trả `ok:false` với thông báo lỗi tháng không hợp lệ; không tạo/cập nhật row nào trong sheet `LuongThang`.

**Phụ — validation phụ trên UI:**

- [ ] Bỏ trống nhân viên/tháng/lương khi lưu → toast lỗi tương ứng, không call backend.
- [ ] Nhập lương âm → toast "Nhập lương thực tế (≥ 0)".
- [ ] Bộ lọc theo nhân viên / theo tháng / từ khoá hoạt động đúng. Nút "Xoá bộ lọc" reset cả ba.
- [ ] Sau khi lưu/xóa, bảng cập nhật **không cần reload** trang.

---

## M. Observability & automated checks (CI tự động)

> Các mục này do `scripts/verify-production.mjs` + workflow chạy tự động. Đánh dấu dựa trên `artifacts/verification-summary.md`.

- [ ] **M.1 — Health endpoint.** `API_URL?action=health` trả `ok:true`, `service:"jys-hr"`, `backendBuild`/`version`, `timestamp`, và `sheets` (NhanVien/ViPham/KiemTra/LuongThang/AuditLog).
- [ ] **M.2 — `ping` vẫn là alias của health.** `?action=ping` trả cùng payload health.
- [ ] **M.3 — Khớp build.** Bundle deploy có `var APP_BUILD="<BUILD_ID>"`; health trả cùng build. Bundle `APP_BUILD == health.backendBuild`.
- [ ] **M.4 — Cảnh báo lệch build.** Khi giao diện ≠ máy chủ (cả hai đã biết), banner đỏ "Cảnh báo phiên bản…" hiện.
- [ ] **M.5 — Diagnostics object.** Bundle có `window.__JYS_DIAG__` (service, frontendBuild, backendBuild, apiHost — **không** có API_URL đầy đủ, **không** có auth/PIN).
- [ ] **M.6 — requestId.** Mọi response backend có `requestId`; cùng requestId được ghi vào `AuditLog`.
- [ ] **M.7 — clientLog → AuditLog.** Telemetry frontend ghi vào `AuditLog` với `source="frontend"`, `actorRole="client"`, `status="client"`.
- [ ] **M.8 — Ghi log thất bại.** Validation error, auth failure, exception, malformed JSON đều tạo row `AuditLog` với `status` tương ứng.
- [ ] **M.9 — Redaction.** Trong `AuditLog` không có manager code, PIN, password, API URL đầy đủ, Authorization/Bearer, cookie. (Kiểm tra cột `detailsJson`/`message`.)
- [ ] **M.10 — getAuditLog chỉ cho quản lý.** `action=getAuditLog` không có `auth` đúng → từ chối; có auth đúng → trả log mới nhất trước, đã redact lại.
- [ ] **M.11 — Render & legacy.** Trang canonical render UI đăng nhập, không có console error lúc khởi tạo; legacy `/?app=jys-hr` về đúng app canonical.

## Đánh dấu kết quả tổng

- [ ] Tất cả mục trên đều ✅ → **app sẵn sàng giao cho nhân viên dùng**.
- [ ] Có mục chưa pass → ghi rõ và sửa, chạy lại checklist từ section liên quan.

## Final sign-off (bắt buộc trước khi enable GitHub Pages / rollout production)

> Chỉ ký khi toàn bộ checklist đã được chạy thực tế và có evidence đính kèm (runtime validation).

- [ ] **Gate quyết định**: Đủ điều kiện enable GitHub Pages + production rollout.
- [ ] **Gate quyết định**: CHƯA đủ điều kiện, tiếp tục chặn deploy.

Owner xác nhận (họ tên): Codex automation (non-human runner)

Vai trò: CI/Documentation update

Ngày xác nhận (YYYY-MM-DD): 2026-05-20

Link evidence test run (docs, screenshots, logs): `N/A - môi trường hiện tại không truy cập được runtime Wix + Apps Script + Google Sheet production để thu evidence trực tiếp.`

Ghi chú rủi ro còn lại (nếu có): Tất cả hạng mục runtime validation vẫn đang blocked; cần một test run thủ công trong production-like environment với đầy đủ ảnh, network capture, và sheet snapshots.

- [ ] Admin page: đăng nhập ADMIN_USER/ADMIN_PASS, xem và đổi mã quản lý + mã cá nhân nhân viên.
- [ ] Đăng nhập sai mã không còn bị trình duyệt gợi ý mã cũ (autocomplete tắt ở ô mã).
