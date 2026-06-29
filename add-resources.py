
with open('D:/erm-app/src/lib/resource-map.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add unit-kerja and kegiatan to resourceMap (after identifikasi-risiko line)
content = content.replace(
    '  "identifikasi-risiko": "identifikasiRisiko",',
    '  "identifikasi-risiko": "identifikasiRisiko",\n  "unit-kerja": "unitKerja",\n  "kegiatan": "kegiatan",'
)

with open('D:/erm-app/src/lib/resource-map.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added unit-kerja and kegiatan to resourceMap')
