import base64, json, urllib.request, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'C:\Users\adti\.qwenpaw\workspaces\default\media\273055d7ca28471d9092eb832b5d2ab4_image.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

payload = {
    'model': 'gemini-2.5-flash',
    'messages': [{
        'role': 'user',
        'content': [
            {'type': 'text', 'text': 'Mô tả chi tiết ảnh chụp màn hình iOffice này. Đây là màn hình gì? Có bao nhiêu tab/mục chính? Tên từng tab? Nội dung mỗi tab hiển thị gì? Nút bấm, thanh tìm kiếm, bộ lọc ở đâu?'},
            {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{b64}'}}
        ]
    }]
}

req = urllib.request.Request(
    'http://127.0.0.1:8759/v1/chat/completions',
    data=json.dumps(payload).encode(),
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req, timeout=120)
result = json.loads(resp.read())
content = result['choices'][0]['message']['content']
print(content)
usage = json.dumps(result.get('usage',{}), ensure_ascii=False)
print(f"\n--- Usage: {usage}")
