import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The data mapping should include unitKerja and kegiatan
# Find the return statement in the mapped = records.map
old_return = '''return [
        r.id,
        r.risiko,
        jr?.nama ?? "",
        sr?.nama ?? "",
        kr?.nama ?? "",
        ad?.nama ?? "",
        r.penyebab ?? "",
        r.dampak ?? "",
      ];'''

# Add unitKerja and kegiatan to the data mapping
new_return = '''const uk = unitKerjaData.find((o: any) => o.id === r.unitKerjaId);
      const kg = kegiatanData.find((o: any) => o.id === r.kegiatanId);
      return [
        r.id,
        r.risiko,
        jr?.nama ?? "",
        sr?.nama ?? "",
        kr?.nama ?? "",
        ad?.nama ?? "",
        r.penyebab ?? "",
        r.dampak ?? "",
        uk?.nama ?? "",
        kg?.nama ?? "",
      ];'''

content = content.replace(old_return, new_return)

# Update the padded array to have 10 columns instead of 8
old_padded = 'padded.push([null, "", "", "", "", "", "", ""]);'
new_padded = 'padded.push([null, "", "", "", "", "", "", "", "", ""]);'
content = content.replace(old_padded, new_padded)

# Now add the Unit Kerja and Kegiatan columns to the columns array
old_columns_array = '''{ title: "Penyebab", data: 6, type: "text", width: 200 },
    { title: "Dampak", data: 7, type: "text", width: 200 },
  ];'''

new_columns_array = '''{ title: "Penyebab", data: 6, type: "text", width: 200 },
    { title: "Dampak", data: 7, type: "text", width: 200 },
    {
      title: "Unit Kerja",
      data: 8,
      type: "dropdown",
      source: unitKerjaNamaList,
      width: 150,
      strict: false,
    },
    {
      title: "Kegiatan",
      data: 9,
      type: "dropdown",
      source: kegiatanNamaList,
      width: 150,
      strict: false,
    },
  ];'''

content = content.replace(old_columns_array, new_columns_array)

# Update colHeaders to include Unit Kerja and Kegiatan
old_colheaders = '''colHeaders={[
          "ID",
          "Risiko",
          "Jenis Risiko",
          "Sumber Risiko",
          "Kategori",
          "Area Dampak",
          "Penyebab",
          "Dampak",
        ]}'''

new_colheaders = '''colHeaders={[
          "ID",
          "Risiko",
          "Jenis Risiko",
          "Sumber Risiko",
          "Kategori",
          "Area Dampak",
          "Penyebab",
          "Dampak",
          "Unit Kerja",
          "Kegiatan",
        ]}'''

content = content.replace(old_colheaders, new_colheaders)

# Fix the saveAll function to handle unitKerja and kegiatan properly
old_saveall_payload = '''const payload = {
        risiko,
        jenisRisikoId,
        sumberRisikoId,
        kategoriRisikoId,
        areaDampakId,
        penyebab: (row[6] as string) || null,
        dampak: (row[7] as string) || null,
      };'''

new_saveall_payload = '''const unitKerjaId = row[8]
          ? unitKerjaData.find((o: any) => o.nama === row[8])?.id
          : null;
        const kegiatanId = row[9]
          ? kegiatanData.find((o: any) => o.nama === row[9])?.id
          : null;

        const payload = {
        risiko,
        jenisRisikoId,
        sumberRisikoId,
        kategoriRisikoId,
        areaDampakId,
        unitKerjaId,
        kegiatanId,
        penyebab: (row[6] as string) || null,
        dampak: (row[7] as string) || null,
      };'''

content = content.replace(old_saveall_payload, new_saveall_payload)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Fixed identifikasi page with proper Unit Kerja and Kegiatan columns')
