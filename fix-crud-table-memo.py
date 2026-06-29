import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the optionMap object definition
old_optionMap = '''  const optionMap: Record<string, { value: string; label: string }[]> = {
    "kategori-risiko": (kategoriRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-kemungkinan": (levelKemungkinanQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "level-dampak": (levelDampakQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.nama })),
    "identifikasi-risiko": (identifikasiRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.risiko })),
  };'''

new_optionMap = '''  const optionMap: Record<string, { value: string; label: string }[]> = useMemo(() => ({
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

content = content.replace(old_optionMap, new_optionMap)

# Also add useMemo import if not already there
if '' in content and 'useMemo' not in content:
    content = content.replace(
        '',
        ''
    )

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Wrapped optionMap in useMemo with proper dependencies')
