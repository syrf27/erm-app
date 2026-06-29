import re

with open('D:/erm-app/src/app/(app)/pemantauan-risiko/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add keterjadiRisiko to openModal function
old_open_modal = '''setModalWaktu(row.realisasiWaktu || "");
    setModalOutput(row.realisasiOutput || "");'''

new_open_modal = '''setModalWaktu(row.realisasiWaktu || "");
    setModalOutput(row.realisasiOutput || "");
    setModalKeterjadian(row.keterjadiRisiko || "");'''

content = content.replace(old_open_modal, new_open_modal)

# Add keterjadiRisiko to the update payload
old_update = '''const updateData: any = {
      realisasiWaktu: modalWaktu,
      realisasiOutput: modalOutput,'''

new_update = '''const updateData: any = {
      keterjadiRisiko: modalKeterjadian,
      realisasiWaktu: modalWaktu,
      realisasiOutput: modalOutput,'''

content = content.replace(old_update, new_update)

with open('D:/erm-app/src/app/(app)/pemantauan-risiko/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Updated modal and save functions')
