import re

# Read the file
with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useMemo to imports
content = content.replace(
    '',
    ''
)

# 2. Wrap optionMap in useMemo
old_option_map = '''  const optionMap: Record<string, { value: string; label: string }[]> = {
    "kategori-risiko": (kategoriRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-kemungkinan": (levelKemungkinanQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-dampak": (levelDampakQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "identifikasi-risiko": (identifikasiRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.risiko })),
  };'''

new_option_map = '''  const optionMap: Record<string, { value: string; label: string }[]> = useMemo(() => ({
    "kategori-risiko": (kategoriRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-kemungkinan": (levelKemungkinanQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-dampak": (levelDampakQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "identifikasi-risiko": (identifikasiRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.risiko })),
  }), [
    kategoriRisikoQuery.result?.data,
    levelKemungkinanQuery.result?.data,
    levelDampakQuery.result?.data,
    identifikasiRisikoQuery.result?.data,
  ]);'''

content = content.replace(old_option_map, new_option_map)

# Write back
with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added useMemo import and wrapped optionMap')
