# Hướng dẫn cài đặt hệ thống quản lý nhân sự JYS

Tài liệu này hướng dẫn đưa app lên mạng để toàn bộ nhân viên Trung tâm Anh ngữ Quốc tế JYS dùng được. Làm theo đúng thứ tự năm phần. Tổng thời gian khoảng 40 đến 60 phút, làm một lần duy nhất.

Bạn nhận được ba file trong thư mục `production/`:

- `jys_quan_ly_nhan_su.html` — app (giao diện).
- `Code.gs` — mã backend cho Google Apps Script.
- `HUONG_DAN_CAI_DAT.md` — tài liệu này.

Ngoài ra có hai tài liệu liên quan:

- `WIX_PAGE_SETUP.md` — hướng dẫn đặt app lên Wix tại URL cố định `https://www.jysenglish.com/?app=jys-hr`.
- `TEST_PLAN.md` — danh sách kiểm thử cần chạy trước khi giao cho nhân viên dùng.

Hệ thống gồm ba thành phần ghép lại: Google Sheet làm kho dữ liệu, Apps Script làm cầu nối, app HTML là giao diện đặt trên một địa chỉ web cố định (hosting bất kỳ; ở JYS dùng Wix tại `https://www.jysenglish.com/?app=jys-hr`).

---

## Phần 1. Tạo Google Sheet làm kho dữ liệu

1. Đăng nhập tài khoản Google Workspace của JYS.
2. Mở https://sheets.google.com rồi tạo một bảng tính trống mới.
3. Đặt tên bảng tính, ví dụ "JYS quản lý nhân sự dữ liệu".
4. Để nguyên bảng tính đó, sang Phần 2. Không cần tự tạo cột, Apps Script sẽ tạo.

---

## Phần 2. Cài đặt Apps Script

1. Trong bảng tính vừa tạo, ở thanh menu trên cùng chọn **Tiện ích mở rộng**, rồi chọn **Apps Script**. Một tab mới mở ra.
2. Trong tab Apps Script, xóa toàn bộ nội dung mẫu đang có sẵn trong ô soạn mã.
3. Mở file `Code.gs` (trong thư mục `production/`) bằng một trình soạn thảo văn bản, copy toàn bộ nội dung, dán vào ô soạn mã của Apps Script.
4. Nhấn biểu tượng đĩa mềm để lưu, hoặc nhấn `Ctrl + S`.
5. **Đặt mã quản lý vào Script Properties (bắt buộc):**
   - Bên trái màn hình Apps Script, nhấn biểu tượng bánh răng **Project Settings**.
   - Kéo xuống mục **Script Properties**, nhấn **Add script property**.
   - Property: `MANAGER_CODE`
   - Value: một mã quản lý **riêng tư** do bạn chọn (ví dụ `JYS-HR-<chuỗi ngẫu nhiên>`). Đây là mã đăng nhập của quản lý. **Không** dùng lại bất kỳ mã cũ nào đã từng bị lộ (kể cả mã mặc định cũ trong các bản dev). **Không** ghi mã này vào tài liệu hay repo.
   - Nhấn **Save script properties**.
   - **Không** dán mã quản lý vào file HTML hay file `Code.gs`. App so sánh mã ở phía máy chủ thông qua Script Properties.
6. Quay lại tab Editor. Phía trên ô soạn mã có một ô chọn hàm. Chọn hàm tên `khoiTaoSheet`, rồi nhấn nút **Run**.
7. Lần đầu chạy, Google hỏi cấp quyền. Nhấn **Review permissions**, chọn tài khoản JYS, nếu hiện cảnh báo thì nhấn **Advanced** rồi nhấn dòng "Go to project (unsafe)", cuối cùng nhấn **Allow**.
8. Chạy lại hàm `khoiTaoSheet` một lần nữa nếu lần đầu chỉ dừng ở bước cấp quyền. Khi thành công sẽ có thông báo đã tạo xong các sheet.
9. Quay lại bảng tính, kiểm tra thấy bốn tab mới ở dưới cùng: **NhanVien**, **ViPham**, **KiemTra**, **AuditLog**. Nếu thấy đủ bốn tab là đúng.

---

## Phần 3. Xuất bản Apps Script (Web App)

1. Trong tab Apps Script, ở góc trên bên phải nhấn nút **Deploy**, chọn **New deployment**.
2. Nhấn biểu tượng bánh răng bên cạnh dòng "Select type", chọn **Web app**.
3. Điền các ô như sau:
   - Description: gõ gì cũng được, ví dụ "JYS HR".
   - Execute as: chọn **Me** (tài khoản JYS).
   - Who has access: chọn **Anyone**. Đây là bắt buộc để app HTML gọi được. Dữ liệu vẫn an toàn vì backend chỉ trả dữ liệu khi có đúng mã (xem mục Bảo mật cuối tài liệu).
4. Nhấn **Deploy**.
5. Google hiện một đường link kết thúc bằng `/exec`. Đây là **link API**. Nhấn **Copy** để sao chép. Giữ link này, Phần 4 sẽ cần.

**Lưu ý quan trọng:** mỗi lần sửa mã `Code.gs`, phải vào **Deploy → Manage deployments**, sửa bản đang có (nhấn bút chì) và nhấn **Deploy** lại. **Không** tạo bản triển khai mới, vì link sẽ đổi.

---

## Phần 4. Dán link API vào app HTML

1. Mở file `production/jys_quan_ly_nhan_su.html` bằng một trình soạn thảo văn bản (Notepad++, VS Code…).
2. Nhấn `Ctrl + F` để tìm, gõ `__API_URL__`, sẽ tìm thấy đúng một chỗ:
   ```js
   var API_URL = "__API_URL__";
   ```
3. Thay phần `__API_URL__` bằng link API đã copy ở Phần 3. Giữ nguyên hai dấu ngoặc kép. Kết quả giống như:
   ```js
   var API_URL = "https://script.google.com/macros/s/ABCxyz.../exec";
   ```
4. Lưu file.

---

## Phần 5. Đưa app HTML lên mạng

Bạn có thể chọn một trong các cách dưới đây. JYS đã chọn nhúng vào Wix tại URL cố định `https://www.jysenglish.com/?app=jys-hr` — xem file `WIX_PAGE_SETUP.md` cho chi tiết.

### Cách A — Nhúng vào Wix tại `?app=jys-hr` (khuyên dùng cho JYS)

Xem `WIX_PAGE_SETUP.md`. Tóm tắt:

1. Upload `jys_quan_ly_nhan_su.html` lên một host cố định (GitHub Pages, Netlify, Cloudflare Pages…), nhận URL công khai.
2. Dùng đúng Wix Custom Embed (launcher) đang chạy — KHÔNG tạo trang Wix thứ hai. App phục vụ tại một URL duy nhất `?app=jys-hr`.
3. Cập nhật `BUNDLE_URL` trong embed trỏ vào URL ở bước 1 (deploy tự động đã làm việc này).
4. Publish lại site.
5. Tuỳ chọn: cấu hình truy cập Members-only nếu cần.

### Cách B — GitHub Pages, mở thẳng theo link

1. Đăng nhập https://github.com (dùng tài khoản chung của JYS).
2. Tạo repo mới, ví dụ `jys-nhan-su`, Public, có README.
3. Đổi tên file `jys_quan_ly_nhan_su.html` thành `index.html` rồi tải lên repo.
4. Vào **Settings → Pages**, branch `main`, folder `/ (root)`, **Save**.
5. Chờ 1–2 phút. Trang sẽ có địa chỉ dạng `https://tentaikhoan.github.io/jys-nhan-su/`.

---

## Cách dùng hằng ngày

### Quản lý

1. Vào địa chỉ app, chọn thẻ **Quản lý**, nhập mã quản lý đã đặt trong Script Properties, đăng nhập.
2. Vào tab **Hồ sơ nhân sự**, thêm từng nhân viên. **Khi lưu một nhân viên mới**, hệ thống tự tạo mã cá nhân 4 số ở máy chủ và hiển thị trong hộp thoại (modal). Quản lý đọc mã đó cho nhân viên để họ đăng nhập lần đầu.
3. Cần đổi mã cá nhân: mở nhân viên, nhấn **Tạo mã mới khi lưu**, rồi nhấn **Lưu hồ sơ**. Hộp thoại sẽ hiện mã mới.

Quản lý dùng được năm tab: **Tổng quan** (thống kê, cảnh báo hợp đồng), **Hồ sơ nhân sự**, **Ghi nhận vi phạm**, **Danh mục lỗi**, **Kiểm tra**.

### Nhân viên

1. Vào địa chỉ app, để ở thẻ **Nhân viên**.
2. Chọn tên mình trong danh sách.
3. Nhập mã cá nhân 4 số quản lý đã cấp (một ô duy nhất, gõ 4 số liên tiếp).
4. Đăng nhập.

Nhân viên dùng được bốn tab: **Hồ sơ của tôi**, **Lỗi của tôi**, **Danh mục lỗi**, **Kiểm tra**.

Nhân viên không xem được hồ sơ hay lương của người khác và không sửa được gì.

---

## Hạng nghề nghiệp

App tự tính hạng theo lương tháng, bốn bậc:

- **Bậc 1**: lương tháng `< 8.000.000 đ`
- **Bậc 2**: lương tháng `8.000.000 ≤ x < 12.000.000 đ`
- **Bậc 3**: lương tháng `12.000.000 ≤ x < 18.000.000 đ`
- **Bậc 4**: lương tháng `≥ 18.000.000 đ`

Hạng được tính lại trực tiếp khi quản lý nhập lương trong form hồ sơ.

---

## Chi nhánh

App dùng một danh sách chi nhánh duy nhất ở mọi nơi:

```
Đô Lương — Vinh — Quảng Sơn
```

Muốn thêm/đổi chi nhánh: mở `jys_quan_ly_nhan_su.html`, tìm dòng `var BRANCHES`, sửa, lưu, deploy lại. Mở thêm `Code.gs`, sửa hằng số `BRANCHES` tương ứng (vì backend cũng validate).

---

## Cảnh báo hợp đồng

- Hợp đồng **đã hết hạn**: pill đỏ "Hết hạn hợp đồng" trên hồ sơ; cảnh báo đỏ trên dashboard; có nút **Gửi thông báo gia hạn** (mock — sẽ kết nối email sau).
- Hợp đồng **sắp hết hạn trong 30 ngày**: pill đỏ "Sắp hết hạn hợp đồng · còn N ngày"; cảnh báo đỏ trên dashboard; có nút **Gửi thông báo gia hạn**.
- Hợp đồng không nhập ngày hết hạn: hiển thị "Không xác định thời hạn".

---

## Bảo mật và giới hạn

Đây là hệ thống nội bộ cho một nhóm nhân sự tin nhau, không phải hệ thống bảo mật cấp ngân hàng.

- Mã quản lý nằm trong **Script Properties** của Apps Script. Frontend **không** chứa, **không** so sánh mã quản lý.
- Backend Apps Script đặt ở chế độ "Anyone", nhưng mọi hành động đọc/ghi dữ liệu đều yêu cầu đúng `auth` (mã quản lý hoặc PIN cá nhân) và backend mới so sánh.
- Nhân viên đăng nhập bằng PIN 4 số: backend chỉ trả về **hồ sơ và lỗi của riêng họ**; không trả về dữ liệu của người khác. Nếu PIN sai, backend từ chối hoàn toàn.
- Hành động xóa (xóa nhân viên / xóa vi phạm / xóa kết quả kiểm tra) yêu cầu mã quản lý.
- Mọi thao tác ghi/xóa được ghi vào tab `AuditLog`.
- Mã cá nhân của nhân viên **luôn được sinh ở máy chủ** khi tạo nhân viên mới hoặc khi quản lý chọn "Tạo mã mới khi lưu". Frontend chỉ hiển thị mã được trả về.
- Nếu một mã cá nhân bị lộ: vào **Hồ sơ nhân sự**, mở nhân viên đó, nhấn **Tạo mã mới khi lưu**, lưu lại, đọc mã mới cho nhân viên.
- Không nhập số tài khoản ngân hàng, số căn cước hay giấy tờ tùy thân vào app. App không có chỗ cho các thông tin đó.

Toàn bộ dữ liệu nằm trong Google Sheet của JYS. Có thể mở Sheet xem trực tiếp, sao lưu, hoặc xuất ra Excel bất cứ lúc nào. Nên sao lưu Sheet định kỳ.

---

## Xử lý sự cố

**App báo "App chưa kết nối máy chủ":** chưa dán link API, hoặc dán sai. Kiểm tra Phần 4, link phải kết thúc bằng `/exec`.

**Đăng nhập hoặc tải dữ liệu báo: "Không kết nối được máy chủ. Vui lòng kiểm tra lại mạng hoặc bản triển khai Apps Script.":**
- Kiểm tra mạng.
- Kiểm tra bản triển khai Apps Script ở Phần 3 đặt "Who has access" = **Anyone**.
- Kiểm tra link API trong file HTML có đúng không.

**Danh sách tên trống khi đăng nhập nhân viên:** chưa có nhân viên nào. Quản lý đăng nhập và thêm nhân viên trước.

**Sửa `Code.gs` nhưng app không đổi:** phải triển khai lại theo lưu ý cuối Phần 3, dùng **Manage deployments** và sửa bản đang có (không tạo bản mới — link sẽ đổi).

**Quên mã quản lý:** mở Apps Script → Project Settings → Script Properties, xem hoặc đặt lại `MANAGER_CODE`.
