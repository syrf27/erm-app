import re

with open('D:/erm-app/src/app/(app)/pemantauan-risiko/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the Select component for keterjadiRisiko in the modal form
# Find the realisasiWaktu TextInput and add the Select before it

old_modal_form = '''<TextInput
          label="Realisasi Waktu"
          value={modalWaktu}
          onChange={(e) => setModalWaktu(e.currentTarget.value)}'''

new_modal_form = '''<Select
          label="Keterjadian Risiko"
          value={modalKeterjadian}
          onChange={(value) => setModalKeterjadian(value ?? "")}
          data={["Terjadi", "Tidak Terjadi", "Berpotensi Terjadi"]}
          placeholder="Pilih keterjadian"
          clearable
        />
        <TextInput
          label="Realisasi Waktu"
          value={modalWaktu}
          onChange={(e) => setModalWaktu(e.currentTarget.value)}'''

content = content.replace(old_modal_form, new_modal_form)

with open('D:/erm-app/src/app/(app)/pemantauan-risiko/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added Keterjadian Risiko Select to modal form')
