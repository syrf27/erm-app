
with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the import line
content = content.replace(
    '',
    ''
)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/crud-table.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added useMemo to imports')
