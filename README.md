# Trang web plugin SketchUp + Tự động cập nhật

Bộ này gồm:

| File | Vai trò |
|---|---|
| `index.html` | Trang web liệt kê plugin, nút tải, lịch sử phiên bản, tìm kiếm, lọc theo nhóm |
| `plugins.json` | Thông tin plugin (tên, mô tả, nhóm, icon). Chỉ sửa khi **thêm plugin mới** |
| `example-plugin/` | Plugin mẫu đã gắn sẵn module tự cập nhật |
| `example-plugin/kt_tuong_nhanh/updater.rb` | **Module tự cập nhật**: copy vào mỗi plugin |
| `tools/phat_hanh.ps1` | Script đóng gói `.rbz` và phát hành bằng 1 lệnh |

Cách hoạt động: mỗi bản plugin là một **GitHub Release** có tag `<id>-v<phiên bản>` (ví dụ `tuong_nhanh-v1.2.0`) và đính kèm file `.rbz`.
Website và plugin trong SketchUp đều đọc danh sách Release này, nên **bạn chỉ cần phát hành trên GitHub là xong**: trang web tự hiện bản mới, và plugin của người dùng tự hỏi cập nhật.

---

## A. Cài đặt lần đầu (khoảng 10 phút)

1. Tạo tài khoản tại https://github.com (miễn phí).
2. Tạo repository mới, đặt tên ví dụ `sketchup-plugins`, chọn **Public**.
3. Upload `index.html`, `plugins.json` và thư mục `icons/` lên repo (Add file → Upload files).
4. Vào **Settings → Pages**, phần *Branch* chọn `main` / `(root)` rồi bấm **Save**.
   Sau khoảng 1 phút, trang chạy tại `https://doanphutien00-afk.github.io/`.
5. Sửa `plugins.json`: điền tên studio và danh sách plugin của bạn.
   - `id` chỉ dùng chữ thường không dấu, số và dấu `_` (ví dụ `tu_bep`).
   - `icon` (tùy chọn): đường dẫn ảnh vuông, ví dụ `icons/tu_bep.png`. Để trống thì trang hiện chữ viết tắt.

## B. Gắn tự cập nhật vào plugin

1. Copy `updater.rb` vào thư mục con của plugin (cạnh `main.rb`).
2. Mở `updater.rb`:
   - Đổi `module TuongNhanh` thành module của plugin đó.
   - Điền `GITHUB_OWNER` (tên tài khoản GitHub) và `GITHUB_REPO` (tên repo).
3. File loader của plugin phải có 3 hằng số `PLUGIN_ID`, `PLUGIN_NAME`, `VERSION` (xem `kt_tuong_nhanh.rb`).
4. Trong `main.rb`, thêm `require_relative 'updater'`, mục menu *Kiểm tra cập nhật…* và dòng `UI.start_timer(8, false) { Updater.check(silent: true) }`.

Plugin sẽ tự kiểm tra **tối đa 1 lần/ngày** khi mở SketchUp. Nếu có bản mới, người dùng chọn một trong ba:
**Có** (tải và cài ngay) · **Không** (nhắc lại sau) · **Hủy** (bỏ qua phiên bản này).

## C. Phát hành phiên bản mới

**Cách 1 – Trên web GitHub (không cần cài gì):**
1. Tăng `VERSION` trong file loader, ví dụ `1.0.0` lên `1.1.0`.
2. Nén file loader `.rb` và thư mục con thành `.zip`, rồi đổi đuôi thành `.rbz`.
3. Trên GitHub vào **Releases → Draft a new release**:
   - *Tag*: `tuong_nhanh-v1.1.0` (đúng mẫu `<id>-v<VERSION>`)
   - *Description*: ghi chú thay đổi, mỗi dòng bắt đầu bằng `- `
   - Kéo file `.rbz` vào, rồi bấm **Publish release**.

**Cách 2 – Một lệnh (cài GitHub CLI: https://cli.github.com, rồi chạy `gh auth login` một lần):**
```powershell
.\tools\phat_hanh.ps1 -Loader kt_tuong_nhanh.rb -Repo "doanphutien00-afk/doanphutien00-afk.github.io" -Notes "- Thêm tính năng X"
```

## D. Lưu ý
- Tag phải đúng mẫu `<id>-v<số.phiên.bản>`, nếu không website và updater sẽ bỏ qua bản đó.
- Đánh dấu *pre-release* sẽ ẩn bản đó (hữu ích để test trước).
- GitHub giới hạn 60 lượt đọc/giờ cho mỗi IP nếu không đăng nhập, quá đủ cho việc kiểm tra 1 lần/ngày.
- Không xóa Release cũ: website dùng chúng cho mục *Lịch sử phiên bản*.
- Muốn dùng tên miền riêng: điền `CONFIG.owner` / `CONFIG.repo` ở đầu phần `<script>` trong `index.html`.
