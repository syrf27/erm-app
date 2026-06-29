import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/rencana/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and update the columns array
# The rencanaTidakPenanganan column is at position 6 (data: 6)
# We need to add jenisPenanganan after it

old_columns = '''{
      title: "Rencana Tindak Penanganan",
      data: 6,
      type: "text",
      width: 200,
    },
    {
      title: "Target Output",
      data: 7,'''

new_columns = '''{
      title: "Rencana Tindak Penanganan",
      data: 6,
      type: "text",
      width: 200,
    },
    {
      title: "Jenis Penanganan",
      data: 7,
      type: "dropdown",
      source: ["Pencegahan", "Perbaikan", "Deteksi"],
      width: 150,
      strict: false,
    },
    {
      title: "Target Output",
      data: 8,'''

content = content.replace(old_columns, new_columns)

# Update remaining column indices (they all shift by 1)
content = content.replace('data: 8,', 'data: 9,')
content = content.replace('data: 9,', 'data: 10,')

# The replacement above will double-replace, so let's be more specific
# Use regex to update only the column definitions

with open('D:/erm-app/src/app/(app)/manajemen-risiko/rencana/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added Jenis Penanganan column')
