import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure all nama lists have proper checks and default to empty array
# Replace any existing references to ensure they're always arrays

# Find the columns definition and make sure source is always an array
old_uk_column = '''{
      title: "Unit Kerja",
      data: 8,
      type: "dropdown",
      source: unitKerjaNamaList,
      width: 150,
      strict: false,
    },'''

new_uk_column = '''{
      title: "Unit Kerja",
      data: 8,
      type: "dropdown",
      source: unitKerjaNamaList || [],
      width: 150,
      strict: false,
    },'''

content = content.replace(old_uk_column, new_uk_column)

old_kg_column = '''{
      title: "Kegiatan",
      data: 9,
      type: "dropdown",
      source: kegiatanNamaList,
      width: 150,
      strict: false,
    },'''

new_kg_column = '''{
      title: "Kegiatan",
      data: 9,
      type: "dropdown",
      source: kegiatanNamaList || [],
      width: 150,
      strict: false,
    },'''

content = content.replace(old_kg_column, new_kg_column)

# Also add checks to other dropdowns
content = content.replace('source: jenisNamaList,', 'source: jenisNamaList || [],')
content = content.replace('source: sumberNamaList,', 'source: sumberNamaList || [],')
content = content.replace('source: kategoriNamaList,', 'source: kategoriNamaList || [],')
content = content.replace('source: areaNamaList,', 'source: areaNamaList || [],')

# Add a check to only render HotTable when data is ready
old_return_hot = '''return (
    <Stack gap="md">'''

new_return_hot = '''if (loading || !jenisNamaList || !sumberNamaList || !kategoriNamaList || !areaNamaList || !unitKerjaNamaList || !kegiatanNamaList) {
    return <div>Loading...</div>;
  }

  return (
    <Stack gap="md">'''

content = content.replace(old_return_hot, new_return_hot)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added loading checks and array fallbacks')
