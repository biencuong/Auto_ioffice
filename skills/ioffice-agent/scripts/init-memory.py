#!/usr/bin/env python3
"""
Khởi tạo cấu trúc bộ nhớ cho iOffice Agent System
Chạy: python scripts/init-memory.py
"""

import os
import json
from datetime import datetime

WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMORY_DIR = os.path.join(WORKSPACE, "memory", "ioffice")
TEMPLATES_DIR = os.path.join(WORKSPACE, "memory", "templates")

STRUCTURE = {
    "technical": {
        "login.md": "# Quy trình đăng nhập iOffice\n\n> File này được tự động cập nhật bởi Browser Agent\n\n## Lần cuối cập nhật\n- Thời gian: {now}\n- Trạng thái: Chưa có dữ liệu\n",
        "upload-flow.md": "# Quy trình upload văn bản\n\n> File này được tự động cập nhật bởi Browser Agent\n\n## Lần cuối cập nhật\n- Thời gian: {now}\n- Trạng thái: Chưa có dữ liệu\n",
        "form-mappings.md": "# Form Field Mappings\n\n> File này được tự động cập nhật bởi Browser Agent sau mỗi thao tác thành công\n\n## Log cập nhật\n- {now}: Khởi tạo\n",
        "error-patterns.md": "# Error Patterns\n\n> File này lưu các lỗi đã gặp và cách xử lý\n\n```json\n{{\"patterns\": []}}\n```\n",
        "browser-tips.md": "# Mẹo Browser Automation\n\n> File này tổng hợp kinh nghiệm từ các phiên làm việc\n\n## Chưa có dữ liệu\n"
    },
    "journal": {},
    "processed": {},
    "sessions": {}
}

def create_structure():
    """Tạo cây thư mục và file mẫu"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for category, files in STRUCTURE.items():
        cat_path = os.path.join(MEMORY_DIR, category)
        os.makedirs(cat_path, exist_ok=True)
        
        if isinstance(files, dict):
            for filename, content in files.items():
                filepath = os.path.join(cat_path, filename)
                if not os.path.exists(filepath):
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content.format(now=now))
                    print(f"  [+] Created: {category}/{filename}")
                else:
                    print(f"  [=] Exists: {category}/{filename}")
        
        # Tạo file index.md trong mỗi thư mục
        index_path = os.path.join(cat_path, "index.md")
        if not os.path.exists(index_path):
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(f"# {category.upper()}\n\nDanh mục: {category}\n\nTổng số file: {len(os.listdir(cat_path))}\nCập nhật: {now}\n")
            print(f"  [+] Created: {category}/index.md")
    
    # Tạo file index tổng
    index_path = os.path.join(MEMORY_DIR, "index.md")
    status_json = json.dumps({
        "initialized": True,
        "timestamp": now,
        "memory_structure": list(STRUCTURE.keys()),
        "agent_id": "ioffice-memory",
        "version": "1.0"
    }, indent=2, ensure_ascii=False)
    content = f"""# iOffice Memory System

## Cấu trúc

| Thu muc | Mo ta |
|---------|------|
| technical/ | Quy trinh ky thuat, form mappings, error patterns |
| journal/ | Nhat ky cong viec hang ngay |
| processed/ | Kho van ban da xu ly |
| sessions/ | Log chi tiet tung phien lam viec |

## Thong ke

- Khoi tao: {now}
- Trang thai: San sang
- Tong so thu muc con: {len(STRUCTURE)}

## System Status

```json
{status_json}
```
"""
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [+] Created: index.md")
    print(f"\n[OK] Memory system initialized at: {MEMORY_DIR}")

def check_hbs_tracker():
    """Kiểm tra hbs-task-tracker đã init chưa"""
    hbs_dir = os.path.join(os.path.dirname(WORKSPACE), "hbs-task-tracker", "data")
    task_db = os.path.join(hbs_dir, "task_db.json")
    
    if os.path.exists(task_db):
        print(f"  [OK] hbs-task-tracker: da init ({task_db})")
    else:
        print(f"  [!] hbs-task-tracker: CHUA init. Chay: python ../hbs-task-tracker/scripts/task_tracker.py --init")
    
    return os.path.exists(task_db)

if __name__ == "__main__":
    print("[START] iOffice Memory System Initialization")
    print("=" * 50)
    create_structure()
    check_hbs_tracker()
    print("=" * 50)
    print("[DONE] He thong san sang.")
