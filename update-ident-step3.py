import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the data mapping in tableData
# Look for the line that creates the data arrays
old_mapping = '''data.push([
          item.risiko,
          item.jenisRisiko || "",
          item.sumberRisiko || "",
          item.kategoriRisiko || "",
          item.penyebab || "",
          item.dampak || "",
          item.prosesBisnis || "",
          item.areaDampak || "",
        ]);'''

new_mapping = '''data.push([
          item.risiko,
          item.jenisRisiko || "",
          item.sumberRisiko || "",
          item.kategoriRisiko || "",
          item.penyebab || "",
          item.dampak || "",
          item.prosesBisnis || "",
          item.areaDampak || "",
          item.unitKerja || "",
          item.kegiatan || "",
        ]);'''

content = content.replace(old_mapping, new_mapping)

# Update saveAll to handle new fields - find the payload creation
# This is more complex, will need to map unitKerja and kegiatan names to IDs

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Updated data mapping')
