#!/usr/bin/env python
"""
Nhe, nhanh: chay query vexere cho 1 route, ngay = hom nay.
Chi tuan: python quick_fetch.py HG-HN

Chi 1-2 request, moi request timeout 150s.
Mac dinh lay: hom nay (fallback 2 ngay) + ngay mai.
"""
import subprocess, sys, os, json
from datetime import datetime, timedelta

ROOT = r"C:\Users\adti\.qwenpaw\workspaces\default"
SKILL = os.path.join(ROOT, "skills", "vexere-ticket-info")
SCRIPT = os.path.join(SKILL, "scripts", "query_vexere.py")
OUT_DIR = os.path.join(ROOT, "vexere_crawled_data")
os.makedirs(OUT_DIR, exist_ok=True)

route = sys.argv[1] if len(sys.argv) > 1 else "HG-HN"

# Hom nay + ngay mai (giam tai, chi 2 request)
base = datetime.now()
dates = [base.strftime("%Y-%m-%d"), (base + timedelta(days=1)).strftime("%Y-%m-%d")]

env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

results = []
for date_str in dates:
    try:
        r = subprocess.run(
            [sys.executable, SCRIPT, "--route", route, "--direction", "both",
             "--date", date_str, "--fallback-days", "2", "--pretty"],
            cwd=SKILL, capture_output=True, text=True,
            encoding='utf-8', errors='replace', env=env, timeout=150,
        )
        ok = r.returncode == 0 and r.stdout.strip()
        trips = 0
        if ok:
            try:
                data = json.loads(r.stdout)
                trips = data.get("total_trips", 0)
            except:
                pass
        results.append({"date": date_str, "success": ok, "total_trips": trips})
        print(f"{route} {date_str}: {'OK' if ok else 'FAIL'} ({trips} trips)")
    except Exception as e:
        results.append({"date": date_str, "success": False, "error": str(e)})
        print(f"{route} {date_str}: ERROR {e}")

# Ghi file
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
fname = f"vexere_{route}_{ts}.json"
fpath = os.path.join(OUT_DIR, fname)
with open(fpath, "w", encoding="utf-8") as f:
    json.dump({
        "route": route, "crawled_at": datetime.now().isoformat(),
        "results": results,
    }, f, ensure_ascii=False, indent=2)
print(f"Saved: {fpath}")
