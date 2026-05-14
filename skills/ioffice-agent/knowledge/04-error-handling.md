# Xử lý lỗi — Auto iOffice

> ⚠️ File này được tự động cập nhật bởi các agent khi gặp lỗi và tìm ra cách giải quyết.

## Các lỗi thường gặp

### 1. Login timeout / thất bại
```
Triệu chứng: Page không load, URL không đổi sau khi submit login
Nguyên nhân: Mạng chậm, server iOffice bận
Cách xử lý:
  1. Retry với timeout 60s
  2. Kiểm tra network requests (browser_use → network_requests)
  3. Chụp screenshot kiểm tra có captcha không
  4. Nếu captcha → báo user nhập tay
```

### 2. Upload file lỗi
```
Triệu chứng: File không hiển thị sau upload
Nguyên nhân: Input file bị ẩn, cần click vào vùng upload trước
Cách xử lý:
  1. Click vào vùng "Kéo thả file" hoặc "Chọn file"
  2. Đợi 1s → tìm input file
  3. Dùng page.evaluate() để set file value nếu cần
```

### 3. WYSIWYG editor không nhập được
```
Triệu chứng: Click vào editor nhưng gõ text không hiện
Nguyên nhân: Editor là iframe, cần chuyển context
Cách xử lý:
  1. Tìm iframe: document.querySelector('iframe.wysihtml5-sandbox')
  2. Chờ iframe load: waitForSelector
  3. Vào iframe context: frame = iframe.contentWindow
  4. Tìm div[contenteditable="true"] trong iframe
  5. Gõ text vào đó
```

### 4. Submit lỗi - thiếu field bắt buộc
```
Triệu chứng: Submit xong báo lỗi nhưng không rõ field nào
Cách xử lý:
  1. Chụp screenshot
  2. Dùng Gemini vision phân tích
  3. Xác định field nào đang highlight đỏ
  4. Điền lại và submit
```

### 5. Quota Gemini hết (HTTP 429)
```
Triệu chứng: API trả về 429
Cách xử lý:
  1. Chuyển sang model fallback (gemini-2.5-flash → gemini-2.0-flash)
  2. Chờ 30s → retry model chính
  3. Báo user: "Gemini quota gần hết, đề nghị kiểm tra"
```

### 6. Timeout khi chờ navigation
```
Triệu chứng: page.goto() timeout
Cách xử lý:
  1. Tăng timeout lên 90s
  2. Kiểm tra network có bị chặn không
  3. Thử waitUntil: 'load' thay vì 'networkidle2'
```

## Error patterns database

```json
{
  "patterns": [
    {
      "error": "login_failed",
      "symptom": "URL vẫn chứa 'login' sau 30s",
      "solution": "Kiểm tra username/password, retry",
      "count": 2,
      "last_seen": "2026-05-10"
    },
    {
      "error": "upload_timeout",
      "symptom": "Không thấy file trong form sau upload",
      "solution": "Click vào vùng upload trước, đợi 2s",
      "count": 1,
      "last_seen": "2026-05-11"
    }
  ]
}
```
