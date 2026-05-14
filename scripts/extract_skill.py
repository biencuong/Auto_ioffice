#!/usr/bin/env python3
import zipfile, os
src = r'C:\Users\adti\.qwenpaw\plugins\openai-codex\dist\read-pdf-full-context-skill-20260502-201643.zip'
dst = r'C:\Users\adti\.qwenpaw\workspaces\default\hbs_tools\nd30_skill'
os.makedirs(dst, exist_ok=True)
with zipfile.ZipFile(src, 'r') as z:
    z.extractall(dst)
print("Extracted successfully")
for root, dirs, files in os.walk(dst):
    for f in files:
        print(os.path.join(root, f))
