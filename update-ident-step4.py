import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the saveAll function and update the payload mapping
# Look for where areaDampakId is set and add unitKerjaId and kegiatanId

old_payload_section = '''const areaDampakId = areaDampak
          ? areaData.find((o: any) => o.nama === areaDampak)?.id
          : null;'''

new_payload_section = '''const areaDampakId = areaDampak
          ? areaData.find((o: any) => o.nama === areaDampak)?.id
          : null;
        const unitKerjaId = rowData[8]
          ? unitKerjaData.find((o: any) => o.nama === rowData[8])?.id
          : null;
        const kegiatanId = rowData[9]
          ? kegiatanData.find((o: any) => o.nama === rowData[9])?.id
          : null;'''

content = content.replace(old_payload_section, new_payload_section)

# Add unitKerjaId and kegiatanId to the payload object
old_payload = '''areaDampakId,
          userId: identity?.id,'''

new_payload = '''areaDampakId,
          unitKerjaId,
          kegiatanId,
          userId: identity?.id,'''

content = content.replace(old_payload, new_payload)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Updated saveAll function')
