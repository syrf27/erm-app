
with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Only wrap optionMap in useMemo - don't touch imports
old = '''  const optionMap: Record<string, { value: string; label: string }[]> = {
    "kategori-risiko":'''

new = '''  const optionMap: Record<string, { value: string; label: string }[]> = useMemo(() => ({
    "kategori-risiko":'''

content = content.replace(old, new)

# Close the useMemo at the end of optionMap
old_end = '''    "identifikasi-risiko": (identifikasiRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.risiko })),
  };'''

new_end = '''    "identifikasi-risiko": (identifikasiRisikoQuery.result?.data ?? []).map((i: any) => ({ value: String(i.id), label: i.risiko })),
  }), [
    kategoriRisikoQuery.result?.data,
    levelKemungkinanQuery.result?.data,
    levelDampakQuery.result?.data,
    identifikasiRisikoQuery.result?.data,
  ]);'''

content = content.replace(old_end, new_end)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Wrapped optionMap in useMemo')
