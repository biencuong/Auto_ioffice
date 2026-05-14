# Mẹo kỹ thuật — Auto iOffice AI Agent

## Tối ưu tốc độ

### 1. Cache snapshot → giảm request Gemini
```
Thay vì chụp snapshot mỗi lần, hãy tận dụng knowledge base:
  1. Đọc form-mappings.md trước
  2. Nếu có selector cũ → dùng luôn, không cần Gemini
  3. Chỉ gọi Gemini vision khi selector cũ không hoạt động
```

### 2. Batch xử lý nhiều file
```
Khi có nhiều file cùng loại:
  1. Login 1 lần duy nhất
  2. Upload từng file trong cùng session
  3. Không đóng browser giữa chừng
  4. Dùng cùng knowledge base
```

### 3. Dùng flash-lite cho tác vụ đơn giản
```
Các tác vụ không cần vision/reasoning:
  - Click vào nút quen thuộc
  - Chọn option trong dropdown
  - Đọc kết quả đơn giản (success/error)
→ Dùng flash-lite (gemini-3.1-flash-lite-preview) ~1.2s
```

## Tiết kiệm quota Gemini

### Chiến lược model

| Tác vụ | Model chính | Chi phí |
|---|---|---|
| Check form có thay đổi không | `flash-lite` | 1 request |
| Phân tích form phức tạp | `flash` | 1 request |
| Đọc DOCX | `flash` | 1-2 request |
| Ghi nhật ký | `flash-lite` | 1 request |
| Xử lý lỗi | `pro` | 1 request (sparingly) |

### Auto fallback
Khi gần hết quota (phát hiện qua response 429):
1. Tự động chuyển sang model cũ: gemini-2.5-flash
2. Giảm tần suất gọi Gemini
3. Dùng nhiều cache hơn (knowledge base)
4. Báo user kiểm tra quota

## Debug

### 1. Xem log realtime
```bash
# Xem log phiên làm việc
type "C:\Users\adti\.qwenpaw\workspaces\default\memory\ioffice\sessions\session-*.md"

# Xem output gemini bridge
curl http://127.0.0.1:8759/api/status
```

### 2. Kiểm tra nhiệm vụ đang chạy
```bash
# Liệt kê task trong hbs-task-tracker
python skills/hbs-task-tracker/scripts/task_tracker.py --list
```

### 3. Xem nhật ký công việc
```bash
# Hôm nay
type "memory/ioffice/journal/2026-05-11.md"

# Hôm qua
type "memory/ioffice/journal/2026-05-10.md"
```

## An toàn

1. **Không bao giờ ghi password vào log hoặc journal**
2. Dùng config.json với quyền hạn chế (file system)
3. Xóa file tạm sau khi xử lý
4. Kiểm tra lại trước khi submit (double-check)
