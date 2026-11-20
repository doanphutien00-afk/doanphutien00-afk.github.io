# PT Hub – máy chủ cập nhật

PT Hub (trong SketchUp) tự kiểm tra bản mới từ 2 nguồn trên kho này:

1. **GitHub Releases** – tag `<mã>-v<phiên bản>` kèm tệp `.rbz` (giống trang web). Đây là cách chính.
2. **`pt-hub/PT_Hub_phien_ban.json`** – danh sách phiên bản (mô tả, SketchUp tối thiểu, ghi chú, link tải, SHA-256).
   Địa chỉ: `https://doanphutien00-afk.github.io/pt-hub/PT_Hub_phien_ban.json`

Có bản mới → PT Hub báo trong mục **Cập nhật**, tự tải và cài (nếu bật tự cập nhật), giữ bản cũ để quay lại.

## Phát hành bản mới của một plugin

**Cách nhanh nhất – Trang quản trị:** `https://doanphutien00-afk.github.io/admin.html` → tab **Plugin** → *Đăng bản mới* (hoặc *Thêm plugin mới*), kéo thả tệp .rbz, ghi chú thay đổi, bấm **Phát hành**. Trang tự làm bước 1–3 của cách B. Gạt *Hiển thị* để gỡ / hiện lại plugin (đặt `"hidden": true` trong `plugins.json` và `PT_Hub_phien_ban.json`). Lần đầu cần dán token GitHub ở tab *Kết nối GitHub*.

**Cách A – GitHub Release (khuyên dùng, trang web cũng tự hiện):**
1. Trên GitHub: **Releases → Draft a new release**.
2. *Tag*: `<mã>-v<phiên bản>`, ví dụ `pt_cabinet-v2.6.3`. Mã = tên tệp nạp không có `.rb`
   (`pt_cabinet`, `pt_smartlight`, `mai_viet`, `pt_wallpanel`, `pt_stair`, `pt_hub`, `smart_floor`).
3. Ghi chú thay đổi (mỗi dòng bắt đầu bằng `- `), kéo tệp `.rbz` vào, **Publish release**.

**Cách B – đặt tệp vào `pt-hub/goi/` (Release được tạo TỰ ĐỘNG):**
GitHub Actions (`.github/workflows/phat-hanh.yml`) tự tạo Release `<mã>-v<phiên bản>` cho mọi tệp
`pt-hub/goi/<mã>-<phiên bản>.rbz` chưa có Release, lấy tên + ghi chú từ `PT_Hub_phien_ban.json`.
Nhờ đó lượt tải được đếm trên trang **Thống kê** (`thong-ke.html`).
Các bước:
1. Đưa tệp `.rbz` vào `pt-hub/goi/`.
2. Sửa `PT_Hub_phien_ban.json`: `version`, `date`, `file`, `download_url`
   (`https://doanphutien00-afk.github.io/pt-hub/goi/<tệp>.rbz`), `notes`; đổi `updated` sang giờ hiện tại.
3. (Tuỳ chọn) Thêm `"download"` + `"version"` cho plugin đó trong `plugins.json` để trang web hiện nút Tải về.

Claude trong project "plugin sketchup" làm sẵn bước 1–2 của cách B mỗi khi có bản mới.
