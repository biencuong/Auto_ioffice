# Form Field Mapping — VNPT iOffice

> ⚠️ File này sẽ được cập nhật tự động bởi Browser Agent sau mỗi lần thao tác thành công.
> Mục đích: lưu lại CSS selector/form field đã hoạt động để dùng lại, tránh phải phân tích lại.

## Form: Đăng nhập

| Field | Selector (đã xác nhận) | Ghi chú |
|---|---|---|
| Username | `input[name="username"]` | Đã dùng thành công |
| Password | `input[name="password"]` | Đã dùng thành công |
| Submit | `button[type="submit"]` | Hoặc Enter key |

## Form: Thêm mới văn bản đi

### Upload
| Field | Selector | Ghi chú |
|---|---|---|
| File input | `input[type="file"]` | Dùng uploadFile() |
| Nút upload | `button:has-text("Tải lên")` | Nếu có |

### Thông tin văn bản
| Field | Selector | Loại | Ghi chú |
|---|---|---|---|
| Loại văn bản | `select[name="loaiVanBan"]` | Dropdown | Giá trị: "Quyết định" |
| Trích yếu | `textarea#trichYeu` hoặc WYSIWYG | Text/Editor | Dùng wysihtml5 |
| Số hiệu | `input[name="soHieu"]` | Text | Nếu cho phép nhập |
| Ngày ban hành | `input[type="date"]` hoặc `input[name="ngayBanHanh"]` | Date | Format: DD/MM/YYYY |
| Người ký | `select[name="nguoiKy"]` | Dropdown | Tìm trong options |

### Nút hành động
| Field | Selector | Ghi chú |
|---|---|---|
| Lưu | `button:has-text("Lưu")` | Submit form |
| Hủy | `button:has-text("Hủy")` | Cancel |

## Log gần đây (tự động cập nhật)

```
# Lần cuối: 2026-05-11 14:30
# Kết quả: ✅ Thành công
# Model dùng: flash (gemini-3-flash-preview)
# Ghi chú: Form chuẩn, không thay đổi
```

> 🆕 Khi Browser Agent phát hiện field mới hoặc selector thay đổi, sẽ cập nhật file này.
