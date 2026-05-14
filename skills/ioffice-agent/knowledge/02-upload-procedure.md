# Quy trình Upload Văn bản Đi lên iOffice

## URL
- Thêm mới văn bản đi: `https://sogdhagiang.vnptioffice.vn/van-ban-di/them-moi-van-ban-di`

## Các bước chi tiết

### Bước 1: Đăng nhập (xem 01-login-procedure.md)
### Bước 2: Vào trang thêm mới
1. `page.goto(addNewVanBanUrl, waitUntil: networkidle2, timeout: 60s)`
2. Chờ form load xong (waitFor timeout: 10s)

### Bước 3: Upload file
1. Tìm input file:
   - CSS thường: `input[type="file"]`
   - Hoặc nút có text "Chọn file", "Tải lên", "Attach", "Đính kèm"
2. Upload: `input.uploadFile(filePath)`
3. Chờ file uploaded (delayAfterUpload: 1500ms)

### Bước 4: Điền thông tin
Các field cần điền (tùy loại văn bản):

| Field | Giá trị | Ghi chú |
|---|---|---|
| Loại văn bản | `config.loaiVanBan` (VD: "Quyết định") | Thường là dropdown select |
| Số hiệu | Từ document (nếu có) | Có thể để hệ thống tự sinh |
| Trích yếu | Từ document | Field textarea/quill editor |
| Ngày ban hành | Từ document | Date picker (nếu có) |
| Người ký | Từ document | Dropdown hoặc text |

### Bước 5: Xử lý WYSIWYG editor (Quill.js)
Trang iOffice dùng **wysihtml5** editor cho field trích yếu:
1. Thường là iframe: `iframe.wysihtml5-sandbox` hoặc `div[contenteditable="true"]`
2. Cách 1: Tìm textarea ẩn, dùng `page.evaluate()` set value
3. Cách 2: Click vào editor → type text (chậm hơn)
4. Gõ chậm: delay 100ms/ký tự (config.wysihtml5TypeDelay)

### Bước 6: Submit
1. Tìm nút submit: "Lưu", "Ghi lại", "Submit", "Đăng", "Hoàn thành"
2. Click submit
3. Chờ kết quả (delayAfterNavigation: 1200ms)
4. Kiểm tra: có success message không? URL có thay đổi không?

### Bước 7: Kiểm tra kết quả
- Thành công: Thấy thông báo "Lưu thành công", "Đã thêm văn bản đi"
- Thất bại: Thấy thông báo lỗi (screenshot → Gemini phân tích)

## Xử lý lỗi
- **File không đúng định dạng**: Chỉ xử lý .docx, báo lỗi file khác
- **Upload timeout**: Retry, kiểm tra kích thước file
- **Form không tìm thấy field**: Snapshot + Gemini vision phân tích
- **Submit lỗi**: Kiểm tra field bắt buộc còn thiếu
