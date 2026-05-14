# Đăng nhập VNPT iOffice

## URL
- Trang đăng nhập: https://sogdhagiang.vnptioffice.vn/

## Các bước
1. Mở browser → `page.goto(loginUrl)`
2. Chờ form đăng nhập hiện ra (waitUntil: networkidle2, timeout: 60s)
3. Tìm field `username`:
   - CSS thường: `input[name="username"]`
   - Nếu không thấy → snapshot tìm input gần "Tên đăng nhập"
4. Gõ username: `page.type('input[name="username"]', config.username, delay: 50)`
5. Tìm field `password`:
   - CSS thường: `input[name="password"]`
   - Nếu không thấy → snapshot tìm input gần "Mật khẩu"
6. Gõ password: `page.type('input[name="password"]', config.password, delay: 50)`
7. Submit: Enter key hoặc click nút "Đăng nhập"
8. Chờ navigation hoàn tất (30s timeout)
9. Kiểm tra: nếu URL còn chứa "login" → đăng nhập thất bại
10. Nếu thành công → vào `addNewVanBanUrl`

## Xử lý lỗi thường gặp
- **Sai captcha**: Hiếm khi xảy ra, nếu có → chụp screenshot, báo user nhập tay
- **Timeout**: Retry tối đa 3 lần, tăng timeout lên 60s
- **Login thất bại**: Kiểm tra lại username/password trong config

## Ghi chú
- Dùng snapshot() thay vì chờ selector cứng để linh hoạt
- Nếu form có cấu trúc khác → chụp screenshot, query(Gemini) để phân tích
