import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add unit-kerja and kegiatan to the tabs array - add them at the beginning after sasaran
old_tabs = '''const tabs = [
  { value: "sasaran", label: "Sasaran" },
  { value: "proses-bisnis", label: "Proses Bisnis" },'''

new_tabs = '''const tabs = [
  { value: "unit-kerja", label: "Unit Kerja" },
  { value: "kegiatan", label: "Kegiatan" },
  { value: "sasaran", label: "Sasaran" },
  { value: "proses-bisnis", label: "Proses Bisnis" },'''

content = content.replace(old_tabs, new_tabs)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added Unit Kerja and Kegiatan tabs to penetapan-konteks')
