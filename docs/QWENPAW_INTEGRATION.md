# Tích Hợp QwenPaw Cho Auto_iOffice

## Ranh giới runtime

Auto_iOffice là workspace sản phẩm. QwenPaw là runtime chạy agent.

- File sản phẩm đặt tại: `G:\My Drive\SKILL_AI\Auto_ioffice`
- Trạng thái runtime QwenPaw đặt tại: `C:\Users\AD\.qwenpaw`
- Secret, token, mật khẩu, cookie và phiên đăng nhập iOffice chỉ lưu trong cấu hình local của QwenPaw, không đưa vào bundle bàn giao.

## Mô hình agent

Phiên bản vận hành đầu tiên dùng bốn agent:

| Agent ID | Trách nhiệm |
|---|---|
| `ioffice-orchestrator` | Nhận lệnh tiếng Việt, phân rã công việc, điều phối agent con và tổng hợp báo cáo. |
| `ioffice-browser` | Dùng trình duyệt AI để đọc iOffice, tải văn bản, thao tác form và chuẩn bị hành động. |
| `ioffice-document` | Đọc PDF/DOCX, trích xuất dữ kiện, soạn dự thảo và kiểm tra thể thức văn bản. |
| `ioffice-memory-task` | Lưu nhật ký, hồ sơ đã xử lý, trạng thái duyệt, công việc, lịch và nhắc việc. |

Toàn bộ thao tác rủi ro dùng chế độ duyệt trước. Các hành động gửi, submit, phát hành hoặc thay đổi trạng thái chính thức trên iOffice chỉ được thực hiện sau khi có bản ghi duyệt hợp lệ.

## Thiết lập

1. Khởi động QwenPaw:

```powershell
qwenpaw app
```

2. Mở terminal khác và chạy script thiết lập:

```powershell
.\scripts\setup_qwenpaw_ioffice.ps1
```

3. Khởi động dashboard:

```powershell
cd ioffice-dashboard
node server.js
```

4. Mở dashboard:

```text
http://localhost:3456
```

## Tích hợp dashboard

Dashboard server cung cấp proxy local:

| Endpoint | Mục đích |
|---|---|
| `GET /api/qwenpaw/status` | Kiểm tra QwenPaw qua `/api/version`. |
| `GET /api/qwenpaw/agents` | Ghép danh sách agent Auto_iOffice kỳ vọng với trạng thái runtime thực tế. |
| `POST /api/qwenpaw/chat` | Gửi tin nhắn tới QwenPaw `/api/console/chat` với header `X-Agent-Id`. |
| `GET /api/action-proposals` | Đọc danh sách đề xuất hành động đang chờ duyệt. |
| `POST /api/action-proposals` | Tạo đề xuất hành động cần người dùng duyệt. |
| `PUT /api/action-proposals/:id` | Chuyển đề xuất sang `approved`, `rejected`, `pending` hoặc `done`. |

Nếu QwenPaw không chạy tại `http://127.0.0.1:8088`, đặt biến môi trường `QWENPAW_BASE_URL` trước khi khởi động dashboard.

## Checklist kiểm tra

- `qwenpaw daemon version` trả về phiên bản đã cài.
- `qwenpaw app` truy cập được tại `/api/version`.
- `.\scripts\setup_qwenpaw_ioffice.ps1` đồng bộ skill, đăng ký skill và tạo/cập nhật agent.
- Trang Agent của dashboard hiển thị QwenPaw online và đủ bốn agent Auto_iOffice.
- Gửi một lệnh an toàn từ Agent Console nhận được phản hồi.
- Tác vụ gửi, submit hoặc phát hành vẫn ở dạng đề xuất cho đến khi được duyệt.
