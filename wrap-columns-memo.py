import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the columns definition and wrap it in useMemo
old_columns_def = '''  const columns: Handsontable.ColumnSettings[] = [
    { title: "ID", data: 0, type: "numeric", width: 1 },'''

new_columns_def = '''  const columns: Handsontable.ColumnSettings[] = useMemo(() => [
    { title: "ID", data: 0, type: "numeric", width: 1 },'''

content = content.replace(old_columns_def, new_columns_def)

# Find the end of the columns array and add the closing for useMemo
old_columns_end = '''    },
  ];

  if (loading || !isMounted) {'''

new_columns_end = '''    },
  ], [jenisNamaList, sumberNamaList, kategoriNamaList, areaNamaList, unitKerjaNamaList, kegiatanNamaList]);

  if (loading || !isMounted) {'''

content = content.replace(old_columns_end, new_columns_end)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Wrapped columns in useMemo with dependencies')
