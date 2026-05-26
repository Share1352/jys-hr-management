# Test Plan — JYS HR (production)

Chạy toàn bộ checklist này **trước khi giao app cho nhân viên dùng**. Đánh dấu ✅ nếu pass, ❌ nếu fail và ghi chú lại.

Người chạy: Codex (automation)   Ngày: 2026-05-20

> Kết quả run này là **evidence-based fail/blocked** vì môi trường CLI hiện tại không có quyền truy cập runtime Wix production, Apps Script project, Google Sheet production hoặc thiết bị mobile thực tế. Các mục dưới đây được đánh dấu ❌ theo trạng thái validation thực tế hiện tại (chưa thể xác nhận pass).

---

## A. Cấu hình ban đầu

- [x] ❌ Mở app từ địa chỉ chính thức (`/quan-ly-nhan-su` trên Wix, hoặc URL deploy). **App phải hiện màn hình đăng nhập trong < 3 giây.**
- [x] ❌ Không có lỗi gì hiện trên console của trình duyệt (Devtools → Console).
- [x] ❌ Logo JYS hiện rõ ở giữa khung đăng nhập.
- [x] ❌ Có thể chuyển giữa hai tab **Nhân viên / Quản lý** ở khung đăng nhập.

## B. Đăng nhập sai

- [x] ❌ Tab **Quản lý** + nhập mã sai → báo lỗi đỏ "Sai mã quản lý" (không phải "Không kết nối được máy chủ").
- [x] ❌ Tab **Nhân viên** + chưa chọn tên → báo "Chọn tên của bạn".
- [x] ❌ Tab **Nhân viên** + đã chọn tên + chỉ nhập 2 chữ số → báo "Mã cá nhân gồm 4 chữ số".
- [x] ❌ Tab **Nhân viên** + đã chọn tên + nhập 4 số sai → báo lỗi đỏ "Sai mã cá nhân".
- [x] ❌ Cứ mỗi lần kiểm tra đăng nhập, **overlay loading hiện rồi tắt** chứ không treo mãi.
- [ ] Frontend có placeholder `__APP_BUILD__` và footer hiển thị nhãn build tiếng Việt (không gây vướng UI).
- [ ] API `ping` trả về `backendBuild` lấy từ Script Property `APP_BUILD` (hoặc fallback constant khi property chưa đặt).
- [ ] Sau đăng nhập (quản lý hoặc nhân viên), frontend hiển thị đủ 2 vế build và **build giao diện == build backend**.

## C. Đăng nhập quản lý

- [x] ❌ Nhập đúng mã quản lý (từ Script Properties) → vào app, header hiện chip **đen "Quản lý"**.
- [x] ❌ Có đủ 5 tab: **Tổng quan, Hồ sơ nhân sự, Ghi nhận vi phạm, Danh mục lỗi, Kiểm tra**.

## D. CRUD nhân viên

- [x] ❌ Tab **Hồ sơ nhân sự**: form bên trái hiện rõ. Combo "Chi nhánh" có đúng 3 lựa chọn: **Đô Lương, Vinh, Quảng Sơn** (không còn "Văn Hiến").
- [x] ❌ Combo chi nhánh trong bộ lọc bên phải cũng có đúng 3 lựa chọn đó + "Tất cả".
- [x] ❌ Trên tab **Tổng quan**, combo lọc "Chi nhánh" cũng đúng 3 lựa chọn đó + "Tất cả chi nhánh".
- [x] ❌ Header app dưới logo: "Trung tâm Anh ngữ Quốc tế JYS · Đô Lương · Vinh · **Quảng Sơn**".

- [x] ❌ **Thêm mới** một nhân viên (tên giả "Test Một"): chọn chi nhánh "Đô Lương", lương 9.000.000, nhập đủ vào ngày sinh, ngày vào làm, hợp đồng từ–đến.
- [x] ❌ Hạng nghề nghiệp tự đổi sang **Bậc 2** khi nhập 9.000.000.
- [x] ❌ Bấm **Lưu hồ sơ**. Overlay hiện. **Hộp thoại mã cá nhân hiện** với mã 4 số to, dễ đọc, kèm tên nhân viên. Nút "Sao chép mã" copy được vào clipboard.
- [x] ❌ Đóng hộp thoại → nhân viên hiện trong bảng bên phải, cột "Mã CN" hiện đúng mã đã thấy.
- [x] ❌ Mở lại sheet `NhanVien`: row mới có cột `maCaNhan` đúng mã đó, cột `createdAt` và `updatedAt` đã set.

- [x] ❌ **Sửa** nhân viên "Test Một": đổi vị trí và lương 13.000.000, bấm Lưu. Hạng tự đổi sang **Bậc 3**. Hộp thoại mã **không hiện** (vì không có "Tạo mã mới"). Toast "Đã cập nhật hồ sơ".
- [x] ❌ Field `#hrPin` trong form sửa (mode **edit**) là **readonly** ngay khi mở form, không cho gõ/chỉnh sửa trực tiếp.
- [x] ❌ Nhấn **Tạo mã mới khi lưu** (edit mode) → trạng thái readonly của `#hrPin` vẫn giữ nguyên; bấm Lưu → hộp thoại mã mới hiện. Mã mới khác mã cũ. Sheet `NhanVien` cột `maCaNhan` đã đổi.

- [x] ❌ Evidence runtime bắt buộc cho mục readonly `#hrPin`: đính kèm (1) screenshot form sửa có thể hiện `#hrPin` không chỉnh được, (2) clip ngắn hoặc ảnh tuần tự khi thử gõ vào `#hrPin` nhưng giá trị không đổi, (3) Network/response + screenshot modal mã mới sau flow **Tạo mã mới khi lưu** để xác nhận luồng regenerate vẫn hoạt động.

- [x] ❌ Thêm vài nhân viên khác ở các chi nhánh khác nhau (Vinh, Quảng Sơn).
- [x] ❌ **Tìm**: gõ vào ô tìm kiếm → bảng lọc đúng.
- [x] ❌ **Lọc chi nhánh**: chỉ hiện nhân viên đúng chi nhánh.
- [x] ❌ **Xem** nhân viên: modal hồ sơ hiện đầy đủ, có **Hạng nghề nghiệp** banner đen, "Còn hiệu lực" pill xanh (nếu hợp đồng còn lâu).
- [x] ❌ **Xóa** một nhân viên → confirm → mất khỏi danh sách. Mở sheet `NhanVien`: row đó **đã bị xóa thật** (không chỉ ẩn).

## E. Cảnh báo hợp đồng

- [x] ❌ Thêm một nhân viên có `hopDongDen` = ngày trong tương lai gần (ví dụ 15 ngày sau hôm nay). Tab **Tổng quan**: cảnh báo đỏ "Sắp hết hạn hợp đồng — [tên]". Có nút **Gửi thông báo gia hạn**.
- [x] ❌ Bấm nút đó → alert "Tính năng gửi email sẽ được kết nối sau."
- [x] ❌ Thêm một nhân viên có `hopDongDen` = ngày trong quá khứ. Cảnh báo đỏ "Hết hạn hợp đồng — [tên]". Có nút **Gửi thông báo gia hạn**.
- [x] ❌ Mở modal Xem nhân viên đó: pill **đỏ** "Hết hạn hợp đồng" / "Sắp hết hạn hợp đồng · còn N ngày".
- [x] ❌ Nhân viên không nhập `hopDongDen`: hiện "Không xác định thời hạn".

## F. Ghi nhận vi phạm

- [x] ❌ Tab **Ghi nhận vi phạm**: chọn nhân viên, chọn lỗi `I.1`. Form hiện đơn giá 10.000đ. Lưu → toast hiện số tiền.
- [x] ❌ Chọn lỗi `I.2` (per): hiện ô "Số mốc 5 phút". Nhập 3 → tổng 60.000đ. Lưu → hiện đúng trong bảng.
- [x] ❌ Chọn lỗi `I.3` (manual): hiện warn vàng, ô tiền cho nhập. Để 0 → bấm Lưu → báo "Nhập số tiền phạt".
- [x] ❌ Chọn lỗi `II.1` (none): ô tiền ẩn. Lưu → bảng hiện "phi tiền tệ".
- [x] ❌ Lọc theo nhân viên / theo tháng / theo từ khoá → bảng đáp ứng đúng.
- [x] ❌ **Xuất CSV** → file tải về có dòng tổng cộng, mở Excel hiện đúng tiếng Việt (BOM UTF-8).
- [x] ❌ **Xóa** một bản ghi vi phạm → mất khỏi bảng và khỏi sheet `ViPham`.

## G. Đăng nhập nhân viên & quyền

- [x] ❌ Đăng xuất quản lý. Tab **Nhân viên** → danh sách tên hiện đầy đủ (đã sort theo alphabet tiếng Việt). **Không có lương** trong danh sách (chỉ có tên + chi nhánh).
- [x] ❌ Chọn "Test Một", nhập mã PIN đúng → vào app. Chip header hiện **xanh** với tên người đó (không phải "Quản lý").
- [x] ❌ Có đúng 4 tab: **Hồ sơ của tôi, Lỗi của tôi, Danh mục lỗi, Kiểm tra**. **Không có** Tổng quan, Hồ sơ nhân sự, Ghi nhận vi phạm.
- [x] ❌ Tab **Hồ sơ của tôi**: thấy đầy đủ thông tin của chính mình, lương đúng, hạng đúng.
- [x] ❌ Tab **Lỗi của tôi**: thấy đúng các vi phạm của mình, không thấy của người khác.
- [x] ❌ Mở **Devtools → Network**, refresh tab: response từ backend **chỉ chứa profile và vipham của chính mình**, không có cả mảng `nhanvien`.
- [x] ❌ Trong Devtools → Network, các action xác thực (`loginManager`, `loginStaff`, `getAll`, `getMine`) được gửi bằng **POST** (không lộ auth trên query string URL).
- [x] ❌ Gọi trực tiếp URL dạng GET (`?action=getAll`, `?action=getMine`, `?action=loginManager`, `?action=loginStaff`) trả lỗi bắt buộc dùng **POST**.

## H. Kiểm tra (Quiz)

- [x] ❌ Tab **Kiểm tra** (quản lý): chọn nhân viên, bấm Bắt đầu. Câu hỏi và đáp án **xáo trộn** ở mỗi lần làm. Có thể Quay lại, Sửa.
- [x] ❌ Nộp bài: hiện điểm. Pill "Đạt" hoặc "Chưa đạt". Có "Xem lại câu trả lời" liệt kê câu sai + đáp án đúng + lý giải.
- [x] ❌ Bảng lịch sử ở trang quiz hiện điểm mới.
- [x] ❌ **Xóa** một kết quả → mất khỏi bảng và khỏi sheet `KiemTra`.
- [x] ❌ Tab **Kiểm tra** (nhân viên): tự làm cho chính mình. Lưu xong, sheet `KiemTra` có dòng mới với đúng `empId` của mình.

## I. Lỗi mạng / backend

- [x] ❌ Tắt mạng / chặn URL Apps Script. Thử đăng nhập → báo đúng: **"Không kết nối được máy chủ. Vui lòng kiểm tra lại mạng hoặc bản triển khai Apps Script."** (không phải lỗi JS đỏ).
- [x] ❌ Bật mạng lại, thao tác tiếp → ổn.
- [x] ❌ Trong Apps Script: tạm gỡ `MANAGER_CODE` khỏi Script Properties. Đăng nhập quản lý → báo "Sai mã quản lý". Đặt lại → ổn.
- [x] ❌ Tab `AuditLog` trong Sheet: kiểm tra có ghi event cho mỗi action (login, save, delete).

## J. Render trong iframe Wix

- [x] ❌ Mở `https://www.jysenglish.com/quan-ly-nhan-su`. App nằm trong iframe, **không có khoảng đen trên đầu**.
- [x] ❌ Không có hai thanh scroll.
- [x] ❌ Đăng nhập, dùng app bình thường — modal, overlay, toast đều hoạt động.
- [x] ❌ Khi nội dung dài (ví dụ bảng lỗi dài), iframe có **chiều cao đủ** để xem hết (hoặc scroll bên trong iframe nếu chiều cao cố định 100vh).
- [x] ❌ **Đường dẫn `/?app=jys-hr` và `/#jys-hr` không được dùng** trong tài liệu hoặc menu nội bộ.


### J evidence notes (Wix deploy pipeline)

- [ ] Xác nhận secrets repository: `WIX_API_KEY` và `API_URL` đã được cấu hình (không rỗng).
- [ ] Xác nhận repository variables: `WIX_SITE_ID` và `WIX_EMBED_ID` đúng với site production (hoặc giữ mặc định hiện tại có chủ đích).
- [ ] Trigger thủ công workflow `deploy-wix.yml` bằng `workflow_dispatch`.
- [ ] Xác nhận step **Smoke-test bundle** trong run đã pass.
- [ ] Ghi URL run thành công: `____________________________`.
- [ ] Đính kèm evidence (log run + ảnh chụp step smoke-test): `____________________________`.

## K. Mobile / responsive

- [x] ❌ Mở app trên điện thoại (Chrome / Safari). Tabs cuộn ngang được. Form không bị tràn.
- [x] ❌ Modal mã cá nhân hiện vừa màn hình.
- [x] ❌ Bàn phím số tự bật khi gõ ô PIN 4 số.

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

## Đánh dấu kết quả tổng

- [ ] Tất cả mục trên đều ✅ → **app sẵn sàng giao cho nhân viên dùng**.
- [x] Có mục ❌ → ghi rõ và sửa, chạy lại checklist từ section liên quan.

## Final sign-off (bắt buộc trước khi enable GitHub Pages / rollout production)

> Chỉ ký khi toàn bộ checklist đã được chạy thực tế và có evidence đính kèm (runtime validation).

- [ ] **Gate quyết định**: Đủ điều kiện enable GitHub Pages + production rollout.
- [x] **Gate quyết định**: CHƯA đủ điều kiện, tiếp tục chặn deploy.

Owner xác nhận (họ tên): Codex automation (non-human runner)

Vai trò: CI/Documentation update

Ngày xác nhận (YYYY-MM-DD): 2026-05-20

Link evidence test run (docs, screenshots, logs): `N/A - môi trường hiện tại không truy cập được runtime Wix + Apps Script + Google Sheet production để thu evidence trực tiếp.`

Ghi chú rủi ro còn lại (nếu có): Tất cả hạng mục runtime validation vẫn đang blocked; cần một test run thủ công trong production-like environment với đầy đủ ảnh, network capture, và sheet snapshots.

- [ ] Admin page: đăng nhập ADMIN_USER/ADMIN_PASS, xem và đổi mã quản lý + mã cá nhân nhân viên.
- [ ] Đăng nhập sai mã không còn bị trình duyệt gợi ý mã cũ (autocomplete tắt ở ô mã).
