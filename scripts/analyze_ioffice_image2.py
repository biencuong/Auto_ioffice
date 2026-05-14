import base64, json, urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'C:\Users\adti\.qwenpaw\workspaces\default\media\e7e731701ac14f19a32a0aaec90f60f9_image.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

payload = {
    'model': 'gemini-2.5-flash',
    'messages': [{
        'role': 'user',
        'content': [
            {'type': 'text', 'text': 'Mô tả chính xác bức ảnh này. Người dùng nói "chọn vào ô màu đỏ trong ảnh sẽ thấy ds lọc ra toàn văn bản XLC (Xử lý chính)". Vậy ô màu đỏ đó là ô nào? Nó nằm ở đâu trên giao diện? Có chữ gì trên đó? Là nút bấm hay dropdown hay checkbox? Mô tả chi tiết vị trí và cách tương tác với nó.'},
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
