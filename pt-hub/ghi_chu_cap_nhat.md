# PT Hub v2.1.0 – máy chủ GitHub

- Đọc GitHub Releases của kho `doanphutien00-afk/doanphutien00-afk.github.io` (tag `<mã>-v<phiên bản>` kèm .rbz) – cùng nguồn với trang web plugin. Phát hành 1 lần: trang web và PT Hub cùng thấy bản mới.
- Đọc `plugins.json` của trang web: mô tả, nhóm, icon cho plugin chưa cài (vd. Smart Floor Generator).
- Tự tải và cài bản mới (theo chuyển hướng link tải GitHub; dự phòng Net::HTTP; kiểm tra đúng gói .rbz).
- Đọc thêm danh sách phiên bản online `https://doanphutien00-afk.github.io/pt-hub/PT_Hub_phien_ban.json`.
- Cài đặt → Nguồn: ô "Kho GitHub", Kiểm tra ngay, Mở trang web plugin. Chi tiết plugin: nút "Trang phát hành".

# PT Hub v2.0.0 – làm lại theo mô hình LU Center

Bỏ các trang cũ (Tổng quan, Kho lưu trữ, Nhật ký, Nguồn online / gói phát hành). Bố cục mới:
Plugin · Cập nhật · Thanh công cụ · Góp ý · Cài đặt. Giữ chuẩn giao diện PT (đen – cam, nút gạt, QR).

- **Plugin (danh mục)**: mọi plugin PT – đã cài, trong kho, hoặc chỉ có trên Claude. Mỗi dòng: icon, mô tả,
  phiên bản cũ → mới, nút chính (Cập nhật / Cài đặt / Tải từ Claude / Mở / Khởi động lại / Tắt bản cũ),
  nút ⋯ mở bảng chi tiết trượt từ phải (thông tin, tương thích, có gì mới, các phiên bản, quay lại bản cũ,
  thư mục, sao lưu, gỡ). "Chọn nhiều" để cài / cập nhật hàng loạt. "Cập nhật tất cả".
- **Cài an toàn**: giải nén vào thư mục tạm → cất bản cũ → thay cả thư mục; lỗi thì trả lại bản cũ.
  Tệp bị khoá → tự cài khi mở SketchUp lần sau. Kiểm tra SHA-256 nếu danh sách có mã.
- **Tương thích**: chặn cài plugin không hỗ trợ phiên bản SketchUp đang dùng.
- **Khởi động lại SketchUp** ngay trong PT Hub (hỏi lưu bản vẽ trước).
- **Bản cũ trùng** (vd. Mái Việt và PT SmartRoof cùng cài): báo và tắt bản cũ 1 nút.
- **Thanh công cụ của tôi**: gom lệnh của nhiều plugin vào thanh riêng, sắp xếp, vạch ngăn, ẩn / hiện, xuất / nhập.
- **Góp ý**: Báo lỗi / Góp ý tính năng, chọn plugin, chụp màn hình mô hình hoặc chọn ảnh (≤ 3 ảnh, 3 MB),
  kèm nhật ký → tạo gói .zip trên Desktop để gửi tác giả qua Zalo.
- **Song ngữ** Tiếng Việt / English.
- Danh sách phiên bản có thêm: tệp nạp, thư mục, mô tả VI/EN, SketchUp tối thiểu / tối đa, SHA-256, link tải, link hướng dẫn.
- Plugin PT có thể đăng ký nút "Mở": `PTHub.register('pt_x', open: -> { ... })`.
