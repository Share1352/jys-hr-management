# Hướng dẫn cài đặt trang Wix `/quan-ly-nhan-su`

## 0. Canonical route policy (bắt buộc)

Từ nay chỉ có **một URL chuẩn** cho HR app:

```
https://www.jysenglish.com/quan-ly-nhan-su
```

- Nếu vẫn cần giữ công khai link cũ `https://www.jysenglish.com/?app=jys-hr`, phải cấu hình để link này **luôn chuyển hướng xác định** về `/quan-ly-nhan-su`.
- **Cutoff deprecation:** sau **2026-07-31 (UTC)**, không được truyền thông hoặc vận hành bất kỳ đường dẫn HR nào khác ngoài `/quan-ly-nhan-su`.

### Cách cấu hình redirect deterministic trên Wix

Ưu tiên theo thứ tự sau:

1. **Wix Redirect Manager (SEO Tools):**
   - Source: `/?app=jys-hr`
   - Target: `/quan-ly-nhan-su`
   - Type: **301 Permanent Redirect**

2. **Wix Router / Site code fallback** (nếu query redirect không map được trong UI):
   - Trong Velo site code (`masterPage.js` hoặc router), đọc query `app`.
   - Nếu `app === "jys-hr"` thì `wixLocation.to('/quan-ly-nhan-su')` ngay khi page load.
   - Không render app thứ hai ở homepage; chỉ điều hướng về đúng route chuẩn.

### Checklist xác nhận canonical

- Mở `https://www.jysenglish.com/?app=jys-hr` phải luôn về đúng `/quan-ly-nhan-su`.
- Mở trực tiếp `https://www.jysenglish.com/quan-ly-nhan-su` vào đúng cùng một app instance.
- Chỉ publish cho nhân viên URL `/quan-ly-nhan-su`.

---

Tài liệu này hướng dẫn đặt app HR JYS lên Wix tại địa chỉ cuối cùng:

```
https://www.jysenglish.com/quan-ly-nhan-su
```

**Quan trọng:** `https://www.jysenglish.com/quan-ly-nhan-su` là URL chính thức duy nhất cho nhân viên.

---

## 1. Chuẩn bị: host file HTML ra một URL công khai

Wix cần một URL công khai để nhúng vào iframe. Có nhiều cách:

- **GitHub Pages** (miễn phí). Tạo repo, đẩy `jys_quan_ly_nhan_su.html` đổi tên thành `index.html`, bật Pages. URL dạng `https://<user>.github.io/<repo>/`.
- **Netlify Drop** (miễn phí). Kéo thư mục chứa `index.html` vào https://app.netlify.com/drop. Nhận URL `https://*.netlify.app`.
- **Cloudflare Pages** hoặc bất kỳ static host nào.

Trước khi upload, **nhớ dán link Apps Script** vào `var API_URL = "..."` (xem `HUONG_DAN_CAI_DAT.md` Phần 4).

Sau bước này bạn có một URL như `https://jys-team.github.io/jys-nhan-su/`. Gọi nó là `EMBED_URL`.

---

## 2. Tạo trang Wix với slug `/quan-ly-nhan-su`

1. Mở Wix Editor.
2. **Menus & Pages** (biểu tượng trang) → **+ Add Page** → chọn **Blank**.
3. Đặt tên trang, ví dụ "Quản lý nhân sự".
4. Mở **SEO (Google) settings** hoặc **Page Info** của trang, đặt **URL slug** đúng:
   ```
   quan-ly-nhan-su
   ```
   (Wix sẽ tạo URL cuối cùng `https://www.jysenglish.com/quan-ly-nhan-su`.)
5. Nhấn **Save**.

### Ẩn trang khỏi menu

1. Trong panel **Menus & Pages**, chuột phải vào trang vừa tạo → **Settings** (hoặc dấu ba chấm) → **Hide from menu**.
2. Đảm bảo trang vẫn ở mục Main Menu (để Wix giữ slug) nhưng đã được ẩn (icon mắt gạch chéo).

### (Tuỳ chọn) Bảo vệ truy cập

Wix có hai mức:

- **Members-only**: trang chỉ hiện cho thành viên đã đăng nhập Wix Members.
- **Password protected**: yêu cầu mật khẩu chung khi vào trang.

Vào **Page Settings → Permissions** của trang `/quan-ly-nhan-su`, chọn **Members Only** hoặc **Password Holders** rồi đặt mật khẩu.

> Nếu Wix plan hiện tại không hỗ trợ, bỏ qua bước này — backend vẫn yêu cầu mã quản lý / PIN cá nhân nên dữ liệu được bảo vệ ở tầng API.

---

## 3. Gỡ header/footer trên trang `/quan-ly-nhan-su` (nếu có thể)

Mục tiêu: app HR chiếm toàn bộ vùng nhìn, không có khoảng trắng phía trên hay menu trên trang nội bộ.

- Trong **Page Settings** → **Layouts** (hoặc tương đương), chọn **No Header** và **No Footer**.
- Nếu plan/template Wix không cho ẩn header, vào **Mobile/Desktop view** rồi co header về tối thiểu, đặt iframe app ngay sát top.

---

## 4. Nhúng iframe app vào trang

1. Trên trang `/quan-ly-nhan-su` vừa tạo, nhấn **+ Add Elements** → **Embed Code** → **Embed a Site** (hoặc tên tương đương — element nhận URL).
2. Kéo embed component vào trang.
3. Click **Enter Website Address** rồi dán `EMBED_URL`.
4. Kéo dãn component cho **rộng và cao tối đa**: chiếm hết chiều ngang của trang, chiều cao tối thiểu bằng `100vh` (thường là 1000–1200 px tuỳ template).

### (Nếu Wix cho Custom Code) — Lắng nghe chiều cao động

App đã gửi `postMessage({type:"JYS_HR_HEIGHT", height: N})` lên cha mỗi giây. Wix Editor không cho gắn JS trực tiếp vào element iframe nội tại, nhưng nếu bạn dùng **Wix Velo** (Dev mode), thêm đoạn này vào trang `/quan-ly-nhan-su`:

```js
import wixWindow from 'wix-window';

$w.onReady(function () {
  wixWindow.postMessage; // ensure module loads
  const frame = $w('#html1'); // ID của HTML component (đổi nếu khác)
  // Wix HTML Component nhận height qua postMessage tự động trong nhiều plan.
  // Nếu plan hỗ trợ: frame.onMessage(...) để bắt event.
  frame.onMessage((event) => {
    if (event && event.data && event.data.type === 'JYS_HR_HEIGHT') {
      frame.height = event.data.height;
    }
  });
});
```

> Nếu Wix plan hiện tại không hỗ trợ dynamic height qua Velo, **đặt iframe ở `100vh`** và bỏ qua phần này. Người dùng vẫn dùng được, không có vấn đề chức năng.

---

## 5. Tránh hai thanh cuộn

App có scroll bên trong. Trang Wix bao ngoài cũng có scroll. Để tránh hai thanh cuộn:

- Đặt iframe ở chiều cao `100vh` (chiếm toàn vùng nhìn).
- Trong Page Settings của trang `/quan-ly-nhan-su`, gỡ Page Background scrolling effects, gỡ các strip phía trên/dưới iframe (chỉ giữ iframe).
- Nếu vẫn còn 2 scroll: trong Wix Editor, kéo iframe đến sát mép trên-dưới của trang nội dung.

---

## 6. Publish và kiểm tra

1. Nhấn **Publish** trên Wix.
2. Mở https://www.jysenglish.com/quan-ly-nhan-su trên trình duyệt.
3. App phải hiện màn hình đăng nhập **ngay**, không có khoảng trắng đen phía trên, không có "JYS IELTS" logo Wix khác đè lên (nếu có, gỡ strip/section trùng).
4. Đăng nhập thử cả tài khoản quản lý và một tài khoản nhân viên (sau khi đã thêm ít nhất một nhân viên qua tài khoản quản lý).

---

## 7. Đường dẫn cũ (deprecated) và mốc ngừng dùng

- `https://www.jysenglish.com/?app=jys-hr` → phải redirect về `/quan-ly-nhan-su` đến hết **2026-07-31 (UTC)**.
- `https://www.jysenglish.com/#jys-hr` → ngừng hỗ trợ, không phát hành cho người dùng.

Sau **2026-07-31 (UTC)**, chỉ được dùng:

```
https://www.jysenglish.com/quan-ly-nhan-su
```

---

## Khắc phục sự cố Wix

**Trang trống / 404:** kiểm tra slug `/quan-ly-nhan-su` đã đúng và đã Publish.

**Có khoảng đen phía trên iframe:** chưa gỡ header. Page Settings → Layouts → No Header.

**App hiện nhưng không tải được dữ liệu (báo "Không kết nối được máy chủ…"):** lỗi không phải từ Wix mà từ link API. Mở `EMBED_URL` trực tiếp, nếu vẫn lỗi, kiểm tra Phần 3 trong `HUONG_DAN_CAI_DAT.md`.

**Có hai thanh cuộn:** giảm chiều cao iframe, hoặc chuyển iframe sang `100vh`, bỏ các strip thừa.

**Trang vẫn xuất hiện trong menu:** chuột phải trang trong panel Menus & Pages → Hide from menu. Republish.
