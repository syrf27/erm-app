import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the last column (Area Dampak) and add new columns after it
# The Area Dampak column is data: 7
area_column = '''{
      title: "Area Dampak",
      data: 7,
      type: "dropdown",
      source: areaNamaList,
      width: 150,
      strict: true,
    },'''

new_columns = '''{
      title: "Area Dampak",
      data: 7,
      type: "dropdown",
      source: areaNamaList,
      width: 150,
      strict: true,
    },
    {
      title: "Unit Kerja",
      data: 8,
      type: "dropdown",
      source: unitKerjaNamaList,
      width: 150,
      strict: false,
    },
    {
      title: "Kegiatan",
      data: 9,
      type: "dropdown",
      source: kegiatanNamaList,
      width: 150,
      strict: false,
    },'''

content = content.replace(area_column, new_columns)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added Unit Kerja and Kegiatan columns to Handsontable')
