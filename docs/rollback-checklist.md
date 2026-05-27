# Rollback Checklist (Wix + Apps Script + Google Sheet)

Mục tiêu: quay về build trước đó nhanh, an toàn, và có thể kiểm chứng.

## 0) Điều kiện trước khi rollback

- Có bản export HTML trước đó từ Wix (`jys_quan_ly_nhan_su.html`).
- Có bản export `Code.gs` trước đó từ Apps Script (hoặc version đã deploy trước).
- Có rollback snapshot của Google Sheet (bản duplicate chứa `NhanVien`, `ViPham`, `KiemTra`, `AuditLog`).
- Có build ID trước đó trong tài liệu monitor/ops.

## 1) Restore HTML trước đó trên Wix

1. Mở Wix Editor tại trang chứa app HR (URL `https://www.jysenglish.com/?app=jys-hr`).
2. Mở phần embed/custom code đang chạy app HR.
3. Dán lại nội dung HTML từ bản backup đã xác nhận.
4. Publish lại site.
5. Truy cập URL production và kiểm tra màn hình đăng nhập hiển thị bình thường.

## 2) Redeploy Apps Script version trước đó

1. Mở Apps Script project đang gắn với production sheet.
2. Khôi phục file `Code.gs` từ backup **hoặc** chọn lại deployment version trước đó.
3. Deploy lại web app đúng quyền truy cập production.
4. Nếu URL `/exec` thay đổi, cập nhật lại vào bản deploy HTML (không commit URL thật vào repo).
5. Chạy kiểm tra nhanh: login quản lý, ghi `ViPham`, ghi `KiemTra`, xem `AuditLog`.

## 3) Chuyển monitor về build ID trước đó

1. Mở dashboard/alert monitor đang theo dõi build mới.
2. Đổi expectation/rule về build ID trước rollback.
3. Xác nhận các health check chính về trạng thái xanh.
4. Ghi chú thời điểm rollback và người thực hiện.

## 4) Checklist xác nhận sau rollback

- [ ] Trang `https://www.jysenglish.com/?app=jys-hr` tải thành công trên production.
- [ ] Đăng nhập nhân viên hoạt động đúng.
- [ ] Đăng nhập quản lý bằng mã trong Script Properties hoạt động đúng.
- [ ] Ghi dữ liệu `ViPham`/`KiemTra` thành công.
- [ ] `AuditLog` có event tương ứng sau thao tác.
- [ ] Monitor đã quay lại build ID trước đó.

## 5) Chính sách secrets (nhắc lại khi rollback)

- Không commit URL Apps Script `/exec` thật vào repo.
- Trong source commit: giữ nguyên `var API_URL = "__API_URL__";`.
- `MANAGER_CODE` chỉ nằm trong Script Properties.
- Không lưu secret vào log monitor hoặc tài liệu công khai.
