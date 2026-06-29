import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add unit-kerja and kegiatan to resourceLabels
old_labels = '''const resourceLabels: Record<string, string> = {
  sasaran: "Sasaran",
  "proses-bisnis": "Proses Bisnis",'''

new_labels = '''const resourceLabels: Record<string, string> = {
  "unit-kerja": "Unit Kerja",
  kegiatan: "Kegiatan",
  sasaran: "Sasaran",
  "proses-bisnis": "Proses Bisnis",'''

content = content.replace(old_labels, new_labels)

# Add unit-kerja and kegiatan to fieldConfigs
old_configs = '''const fieldConfigs: Record<string, FieldConfig[]> = {
  sasaran: [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],'''

new_configs = '''const fieldConfigs: Record<string, FieldConfig[]> = {
  "unit-kerja": [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "kode", label: "Kode", type: "text", required: true },
  ],
  kegiatan: [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],
  sasaran: [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "text" },
  ],'''

content = content.replace(old_configs, new_configs)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added unit-kerja and kegiatan configurations to CrudTable')
