import json, uuid, sys
from datetime import datetime
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

db_path = r'C:\Users\adti\.qwenpaw\workspaces\default\skills\hbs-task-tracker\scripts\data\task_db.json'

with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

now = datetime.now().isoformat()

# Tasks completed today
completed = [
    'ioffice_bcd1610ae65e',  # Kiểm thử đăng nhập iOffice
    'ioffice_0591127bc506',  # Cấu hình cron job
    'ioffice_c167bd465550',  # Kiểm tra knowledge base
    'ioffice_1e4ab3d04296',  # Xử lý batch file DOCX đầu tiên (đã xử lý VB thứ 3)
]

for task in db['tasks']:
    if task['id'] in completed:
        task['status'] = 'completed'
        task['completed_at'] = now
        task['updated_at'] = now
        task['notes'].append({"time": now, "text": "Hoàn thành ngày 11/05/2026"})
        print(f"  ✅ {task['id'][:30]:30s} → completed")

# Also mark the overdue HBS tasks
# They are overdue (deadline passed). Let's check which ones are still pending
hbs_tasks = [t for t in db['tasks'] if 'học_' in t['id'] and t['status'] == 'pending']
for t in hbs_tasks:
    print(f"  ⏳ {t['id'][:30]:30s} deadline={t.get('deadline','')[:10]} → vẫn pending")

with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print(f"\n✅ Database updated: {len(completed)} tasks marked completed")
