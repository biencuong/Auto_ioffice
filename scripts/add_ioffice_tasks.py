"""Thêm task iOffice vào hbs-task-tracker"""
import json, os, uuid
from datetime import datetime, timedelta

db_path = os.path.join(
    os.path.dirname(__file__),
    'skills', 'hbs-task-tracker', 'scripts', 'data', 'task_db.json'
)

ioffice_tasks = [
    {
        "title": "Kiểm tra và cập nhật knowledge base iOffice",
        "module": "ioffice",
        "priority": "cao",
        "deadline": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Rà soát technical docs: login, upload, form-mapping. Cập nhật nếu có thay đổi."
    },
    {
        "title": "Kiểm thử đăng nhập iOffice bằng AI Agent",
        "module": "ioffice",
        "priority": "cao",
        "deadline": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Dùng Browser Agent đăng nhập iOffice, chụp snapshot form, đối chiếu với knowledge base."
    },
    {
        "title": "Xử lý batch file DOCX đầu tiên",
        "module": "ioffice",
        "priority": "cao",
        "deadline": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Chọn 3-5 file DOCX thật, xử lý toàn bộ quy trình: đọc → extract → upload iOffice → verify."
    },
    {
        "title": "Cấu hình cron job tự động hoá",
        "module": "ioffice",
        "priority": "trung_binh",
        "deadline": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Tạo 3 cron jobs: sáng 7h, trưa 12h, chiều 17h30."
    },
    {
        "title": "Theo dõi quota Gemini hàng ngày",
        "module": "ioffice",
        "priority": "trung_binh",
        "deadline": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Kiểm tra request OK/Error, đảm bảo không vượt quota."
    },
    {
        "title": "Viết báo cáo tổng kết tuần đầu vận hành",
        "module": "ioffice",
        "priority": "thap",
        "deadline": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Tổng hợp số liệu: file đã xử lý, thành công, lỗi, model usage."
    },
    {
        "title": "Cài đặt Ollama + Qwen3 fallback",
        "module": "ioffice",
        "priority": "thap",
        "deadline": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%dT17:00:00"),
        "status": "pending",
        "description": "Fallback khi Gemini hết quota."
    },
]

with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

tasks_list = db.get('tasks', [])

added = 0
for task in ioffice_tasks:
    tid = f"ioffice_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    tasks_list.append({
        "id": tid,
        "module": "iOffice AI",
        "title": task["title"],
        "description": task.get("description", ""),
        "deadline": task.get("deadline", ""),
        "deadline_date": task.get("deadline", "")[:10] if task.get("deadline") else "",
        "deadline_time": "17:00",
        "status": task.get("status", "pending"),
        "priority": {"cao": 5, "trung_binh": 3, "thap": 1}.get(task.get("priority", "trung_binh"), 3),
        "assigned_to": "AI_AGENT",
        "category": "iOffice AI Agent",
        "source_docs": [],
        "notes": [{"time": now, "text": "Task created by iOffice setup"}],
        "reminded_at": [],
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
        "completed_by": None,
        "verification_doc": None
    })
    added += 1

db['tasks'] = tasks_list

with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print(f"✅ Đã thêm {added} task iOffice vào database")
