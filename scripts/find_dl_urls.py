import re
with open(r'C:\Users\adti\.qwenpaw\workspaces\default\tool_results\338fbb6e86c54bf3837cc69c55ef290a.txt', 'r', encoding='utf-8') as f:
    content = f.read()
dwr_urls = re.findall(r'https://[^"]*dwr[^"]*', content)
dl_urls = re.findall(r'https://[^"]*download[^"]*', content)
print('DWR endpoints:')
for u in dwr_urls[:10]:
    print(f'  {u}')
print()
print('Download URLs:')
for u in dl_urls[:5]:
    print(f'  {u}')
