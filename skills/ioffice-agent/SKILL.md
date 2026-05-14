---
name: "ioffice-agent"
description: "Hệ thống AI Agent tự động xử lý văn bản đi trên VNPT iOffice. Tích hợp hội đồng đa agent (Orchestrator, Browser, Document, Memory), bộ nhớ ngắn/dài hạn, nhật ký công việc, nhắc việc ngữ nghĩa qua hbs-task-tracker."
metadata:
  version: "1.0"
  author: "default agent"
  requires:
    bins:
      - gemini
    skills:
      - hbs-task-tracker
      - cron
      - browser_visible
    tools:
      - browser_use
      - query
      - chat_with_agent
      - memory_search
      - execute_shell_command
    services:
      - Gemini CLI (OAuth)
      - (Optional) Gemini CLI Bridge (port 8759)
---

# 🏛️ Auto iOffice AI Agent System

## 🌐 Tổng quan kiến trúc

Hệ thống sử dụng **mô hình Hội đồng Agent (Agent Council)** trên nền QwenPaw:

```
┌──────────────────────────────────────────────────────────┐
│                    QwenPaw Platform                       │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐│
│  │ 🤖 Browser   │    │ 📄 Document  │   │ 💾 Memory    ││
│  │   Agent      │◄──►│   Agent      │◄──►│   Agent      ││
│  │ ioffice-brws │    │ ioffice-doc  │   │ ioffice-mem  ││
│  └──────┬───────┘    └──────┬───────┘   └──────┬───────┘│
│         │                   │                   │        │
│         ▼                   ▼                   ▼        │
│  ┌──────────────────────────────────────────────────┐   │
│  │          🧠 Orchestrator Agent (default)          │   │
│  │           Điều phối, quyết định, báo cáo           │   │
│  └──────────────────────────────────────────────────┘   │
│         │                   │                   │        │
│         ▼                   ▼                   ▼        │
│  ┌──────────┐    ┌──────────────┐   ┌──────────────────┐│
│  │ 🌐       │    │ ✨ query     │   │ 📁 File + Memory ││
│  │browser_use│   │ (Gemini CLl) │   │    Tools         ││
│  └──────────┘    └──────────────┘   └──────────────────┘│
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   ⏰ cron skill    |    📋 hbs-task-tracker      │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🏛️ Hội đồng Agent (Agent Council)

### 1. Orchestrator Agent (`default` - agent hiện tại)
| Thuộc tính | Giá trị |
|---|---|
| **Vai trò** | Điều phối chính, nhận lệnh từ user, giao việc cho các agent con |
| **Model** | gemini-3.1-pro-preview (alias: pro) — cho reasoning điều phối |
| **Công cụ** | `chat_with_agent`, `browser_use`, `query`, `memory_search`, `cron`, `execute_shell_command` |
| **Trách nhiệm** | • Nhận yêu cầu từ user (Telegram)<br>• Phân tích công việc → chọn agent phù hợp<br>• Gọi `chat_with_agent` để giao việc<br>• Tổng hợp kết quả → báo cáo cho user<br>• Xử lý lỗi toàn cục, retry khi cần<br>• Tạo cron job cho lịch trình |

### 2. Browser Agent (`ioffice-browser`)
| Thuộc tính | Giá trị |
|---|---|
| **Vai trò** | Chuyên gia tự động hóa browser, tương tác với iOffice |
| **Model** | `flash` (gemini-3-flash-preview) — vision nhanh, hiểu form |
| **Công cụ** | `browser_use`, `query` (vision), `read_file` (knowledge base) |
| **Memory** | Đọc/Sửa file: `memory/ioffice/technical/` (ghi lại thao tác thành công) |
| **Trách nhiệm** | • Mở iOffice, đăng nhập<br>• Chụp snapshot/screenshot → phân tích form<br>• Upload file, điền form, submit<br>• Ghi nhớ pattern thành công vào knowledge base<br>• Xử lý popup, captcha, lỗi mạng |

### 3. Document Agent (`ioffice-doc`)
| Thuộc tính | Giá trị |
|---|---|
| **Vai trò** | Chuyên gia đọc file DOCX, trích xuất thông tin |
| **Model** | `flash` (gemini-3-flash-preview) — context 1M token, đọc file |
| **Công cụ** | `query` (file analysis), `read_file`, `execute_shell_command` |
| **Memory** | Đọc: `memory/ioffice/processed/` (kiểm tra trùng lặp) |
| **Trách nhiệm** | • Nhận file DOCX → đọc bằng Gemini<br>• Trích xuất: số hiệu, ngày tháng, trích yếu, người ký, loại VB<br>• Kiểm tra format, validate dữ liệu<br>• Output JSON cấu trúc cho Browser Agent<br>• Kiểm tra file đã xử lý chưa (tránh trùng) |

### 4. Memory Agent (`ioffice-memory`)
| Thuộc tính | Giá trị |
|---|---|
| **Vai trò** | Chuyên gia ghi nhớ, nhật ký, nhắc việc |
| **Model** | `flash-lite` (gemini-3.1-flash-lite-preview) — nhanh, rẻ |
| **Công cụ** | `read_file`, `write_file`, `edit_file`, `memory_search`, `execute_shell_command`, `chat_with_agent` (gọi hbs-task-tracker) |
| **Trách nhiệm** | • Ghi nhật ký công việc hàng ngày<br>• Cập nhật database file đã xử lý<br>• Lưu technical procedures đã học được<br>• Tạo task trong hbs-task-tracker để nhắc việc<br>• Tổng hợp báo cáo cuối ngày/tuần/tháng<br>• Tra cứu lịch sử khi được hỏi |

---

## 🧠 Bộ nhớ (Memory System)

### Kiến trúc bộ nhớ 3 lớp

```
┌─────────────────────────────────────────────────────────┐
│                Lớp 1: Short-term Memory                  │
│           (Session Context - QwenPaw Dialog)             │
│  • Trạng thái phiên làm việc hiện tại                    │
│  • File đang xử lý dở dang                               │
│  • Kết quả tạm thời                                      │
│  • Tự động clear khi hết session                         │
├─────────────────────────────────────────────────────────┤
│                Lớp 2: Long-term Memory                   │
│           (Markdown Files + memory_search)               │
│  • Technical procedures (cập nhật sau mỗi lần thành công)│
│  • Processed documents database (để tránh trùng)         │
│  • Daily work journals                                   │
│  • Error patterns & solutions                            │
├─────────────────────────────────────────────────────────┤
│                Lớp 3: Task Management                    │
│           (hbs-task-tracker - JSON Database)             │
│  • Tasks với trạng thái, deadline, priority              │
│  • Nhắc nhở thông minh 1-3-6-24h                         │
│  • Theo dõi tiến độ công việc                            │
│  • Báo cáo tổng hợp định kỳ                              │
└─────────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục bộ nhớ

```
memory/ioffice/
├── index.md                         # ✅ Master index - tóm tắt toàn bộ
├── technical/                       # 📚 Kiến thức kỹ thuật (tự học)
│   ├── login.md                     #    Các bước đăng nhập
│   ├── upload-flow.md               #    Quy trình upload
│   ├── form-mappings.md             #    Mapping form field
│   ├── error-patterns.md            #    Lỗi & cách xử lý
│   └── browser-tips.md              #    Mẹo browser automation
├── journal/                         # 📅 Nhật ký công việc
│   └── YYYY-MM-DD.md                #    Mỗi ngày một file
├── processed/                       # 📂 Kho văn bản đã xử lý
│   └── YYYY/
│       └── MM/
│           └── YYYY-MM-DD-HHMM.md   #    Batch record
└── sessions/                        # 🔄 Log phiên làm việc
    └── session-YYYYMMDD-HHMMSS.md   #    Chi tiết từng phiên
```

### Cơ chế ghi nhớ & học hỏi

Khi Browser Agent thao tác thành công trên iOffice:
1. Ghi lại **CSS selector / mô tả form** đã dùng
2. Ghi vào `memory/ioffice/technical/form-mappings.md`
3. Lần sau: đọc file này trước → dùng lại selector cũ → nhanh hơn

Khi gặp lỗi:
1. Chụp screenshot lỗi
2. Dùng Gemini phân tích lỗi
3. Ghi vào `memory/ioffice/technical/error-patterns.md`
4. Lần sau gặp lỗi tương tự → có cách xử lý ngay

---

## 🔄 Quy trình xử lý văn bản hoàn chỉnh

### Flow tự động

```
┌──────────────────────────────────────────────────────────────┐
│                    📥 BẮT ĐẦU                                │
│  User gửi lệnh: "Xử lý văn bản trong thư mục D:\autooffice" │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  🧠 Orchestrator Agent                                       │
│  • Kiểm tra thư mục đầu vào                                  │
│  • Lấy danh sách file .docx chưa xử lý                       │
│  • Hỏi Memory Agent: "File nào đã xử lý rồi?"               │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  📄 Document Agent                                           │
│  • Đọc file DOCX bằng Gemini (flash)                         │
│  • Trích xuất: {số_hiệu, ngày_tháng, trích_yếu,             │
│                 người_ký, loại_văn_bản}                      │
│  • Validate dữ liệu                                          │
│  • Output JSON → gửi lại cho Orchestrator                    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  🤖 Browser Agent                                            │
│  • Đọc knowledge base: form-mappings.md                      │
│  • Mở browser → login iOffice                                │
│  • Vào trang "Thêm mới văn bản đi"                           │
│  • Upload file, điền form theo data từ Document Agent        │
│  • Submit, kiểm tra kết quả                                  │
│  • Nếu lỗi: screenshot → Gemini phân tích → retry            │
│  • Ghi lại pattern mới vào technical/                        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  💾 Memory Agent                                             │
│  • Ghi nhật ký: "Đã xử lý QD_123.docx → thành công"         │
│  • Cập nhật processed/ database                              │
│  • Tạo task nhắc việc tiếp theo (nếu có)                     │
│  • Tổng hợp báo cáo cho user                                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  🧠 Orchestrator Agent                                       │
│  • Tổng hợp kết quả                                          │
│  • Gửi báo cáo qua Telegram cho user                         │
│  • Hỏi user: "Có file tiếp theo không?"                      │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      ✅ KẾT THÚC                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Chiến lược sử dụng Model

### Bảng phân công model

| Agent | Model Chính | Model Fallback | Lý do |
|---|---|---|---|
| **Orchestrator** | `pro` (gemini-3.1-pro) | `gemini-2.5-pro` | Cần reasoning điều phối |
| **Browser** (vision) | `flash` (gemini-3-flash) | `gemini-2.5-flash` | Vision nhanh, hiểu UI |
| **Browser** (thao tác) | `flash-lite` (gemini-3.1-lite) | `gemini-2.5-flash-lite` | Siêu nhanh, đơn giản |
| **Document** (đọc DOCX) | `flash` (gemini-3-flash) | `gemini-2.5-flash` | Context 1M đọc file |
| **Memory** (ghi nhật ký) | `flash-lite` (gemini-3.1-lite) | `gemini-2.5-flash-lite` | Cực nhanh, rẻ |
| **Memory** (phân tích) | `flash` (gemini-3-flash) | `gemini-2.5-flash` | Cần hiểu ngữ nghĩa |

### Fallback chain (tự động khi hết quota)

```
Khi model chính lỗi 429 (Quota exceeded):
  → Thử model cùng nhóm (thế hệ trước)
  → Thử model nhẹ hơn (lite)
  → Chờ 30s → thử lại model chính
  → Báo cáo cho user nếu tất cả đều lỗi
```

---

## ⏰ Lịch trình tự động (Cron Jobs)

| Cron Job | Lịch | Mô tả | Ghi chú |
|---|---|---|---|
| `ioffice-daily-check` | `0 8 * * 1-6` | Sáng 8h (T2-T7): Kiểm tra thư mục có file mới không | Dùng cron skill |
| `ioffice-reminder` | `*/30 7-17 * * 1-6` | 30p/lần trong giờ hành chính: Nhắc việc tồn đọng | Dùng hbs-task-tracker |
| `ioffice-daily-report` | `30 17 * * 1-6` | 17:30: Tổng kết công việc trong ngày | Dùng cron skill |
| `ioffice-quota-check` | `0 9 * * 1` | 9h sáng Thứ 2: Kiểm tra quota Gemini còn không | Query tool |

---

## 📋 Tích hợp hbs-task-tracker

### Các loại task tự động tạo

```json
{
  "tasks": [
    {
      "id": "ioffice-20260511-001",
      "type": "upload-doc",
      "title": "Đăng văn bản: QD_123.docx",
      "priority": "cao",
      "deadline": "2026-05-11 17:00",
      "status": "pending",
      "module": "ioffice-auto",
      "remind_before": [1, 3, 6, 24],
      "context": {
        "file_path": "D:\\autooffice\\192\\QD_123.docx",
        "so_hieu": "123/QĐ-SGDĐT",
        "trich_yeu": "Về việc ban hành...",
        "model_used": "gemini-3-flash-preview",
        "result": null
      }
    }
  ]
}
```

### Quy tắc nhắc nhở
- **Priority cao**: Nhắc trước 1h, 3h, 6h, 24h
- **Priority trung bình**: Nhắc trước 3h, 6h, 24h
- **Priority thấp**: Nhắc trước 6h, 24h

---

## 🚀 Cách sử dụng

### 1. Khởi tạo hệ thống

```bash
# Khởi tạo memory structure
python scripts/init-memory.py

# Khởi tạo hbs-task-tracker
python ../../hbs-task-tracker/scripts/task_tracker.py --init
```

### 2. Tương tác với user qua Telegram

**User:** "Xử lý văn bản trong thư mục D:\autooffice\192"
**Agent:** Đang kiểm tra... có 5 file mới. Bắt đầu xử lý...

**User:** "Cho tôi xem nhật ký hôm nay"
**Agent:** (đọc memory/ioffice/journal/2026-05-11.md và tóm tắt)

**User:** "Có văn bản nào đang chờ xử lý không?"
**Agent:** (tra hbs-task-tracker) Có 3 task pending...

**User:** "Tôi muốn lưu lại cách đăng nhập iOffice mới"
**Agent:** (ghi vào memory/ioffice/technical/login.md)

### 3. Lệnh đặc biệt

```
"Xử lý tất cả"          → Duyệt toàn bộ thư mục
"Xử lý file [tên]"      → Chỉ xử lý file cụ thể
"Nhật ký hôm nay"       → Xem journal hôm nay
"Báo cáo tuần"          → Tổng hợp 7 ngày
"Còn quota Gemini?"     → Kiểm tra quota
"Học thao tác mới"      → Ghi lại procedure
"Tình trạng công việc"  → Xem task pending/overdue
```

---

## 🔧 Yêu cầu hệ thống

- **QwenPaw** đã cài đặt và chạy
- **Gemini CLI** (OAuth) — đã có
- **Python 3.10+** — cho hbs-task-tracker
- **Node.js** — cho Gemini bridge
- **Chrome/Chromium** — cho browser_use

---

## 📂 Cấu trúc skill

```
ioffice-agent/
├── SKILL.md                   ← Bạn đang đọc
├── agents/
│   ├── browser-agent.yaml     ← Cấu hình Browser Agent
│   ├── doc-agent.yaml         ← Cấu hình Document Agent
│   └── memory-agent.yaml      ← Cấu hình Memory Agent
├── knowledge/                 ← Kiến thức nền tảng
│   ├── 01-login-procedure.md
│   ├── 02-upload-procedure.md
│   ├── 03-form-mapping.md
│   ├── 04-error-handling.md
│   └── 05-technical-tips.md
├── memory/
│   └── templates/             ← Template cho bộ nhớ
│       ├── daily-journal.md
│       ├── document-record.md
│       └── session-log.md
└── scripts/                   ← Script tiện ích
    ├── init-memory.py
    ├── check-quota.sh
    └── report-daily.py
```
