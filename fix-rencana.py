
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/rencana/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Fix the columns array (correct data indices + add Jenis Penanganan)
old_columns = '''  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Rencana ID", data: 1, type: "numeric", width: 1 },
    { title: "Prioritas", data: 2, type: "text", width: 130, readOnly: true },
    { title: "Risiko", data: 3, type: "text", width: 220, readOnly: true },
    { title: "Besaran Risiko Aktual", data: 4, type: "text", width: 160, readOnly: true },
    { title: "Besaran Risiko Residual", data: 5, type: "text", width: 160, readOnly: true },
    { title: "Rencana Tindak Penanganan", data: 6, type: "text", width: 240 },
    { title: "Target Output", data: 7, type: "text", width: 180 },
    { title: "Target Waktu", data: 10, type: "text", width: 150 },
    { title: "Penanggung Jawab", data: 10, type: "text", width: 180 },
    {
      title: "Level Kemungkinan",
      data: 10,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 11,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    { title: "Besaran Risiko", data: 12, type: "text", width: 130, readOnly: true },
  ];'''

new_columns = '''  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Rencana ID", data: 1, type: "numeric", width: 1 },
    { title: "Prioritas", data: 2, type: "text", width: 130, readOnly: true },
    { title: "Risiko", data: 3, type: "text", width: 220, readOnly: true },
    { title: "Besaran Risiko Aktual", data: 4, type: "text", width: 120, readOnly: true },
    { title: "Besaran Risiko Residual", data: 5, type: "text", width: 120, readOnly: true },
    { title: "Rencana Tindak Penanganan", data: 6, type: "text", width: 240 },
    { title: "Jenis Penanganan", data: 7, type: "text", width: 180 },
    { title: "Target Output", data: 8, type: "text", width: 180 },
    { title: "Target Waktu", data: 9, type: "text", width: 150 },
    { title: "Penanggung Jawab", data: 10, type: "text", width: 180 },
    {
      title: "Level Kemungkinan",
      data: 11,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 12,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    { title: "Besaran Risiko", data: 13, type: "text", width: 130, readOnly: true },
  ];'''

assert old_columns in c, "columns block not found"
c = c.replace(old_columns, new_columns)

# 2. Fix colHeaders (add Jenis Penanganan)
old_ch = '''          "Rencana Tindak Penanganan",
          "Target Output",
          "Target Waktu",
          "Penanggung Jawab",
          "Level Kemungkinan",
          "Level Dampak",
          "Besaran Risiko",
        ]}'''
new_ch = '''          "Rencana Tindak Penanganan",
          "Jenis Penanganan",
          "Target Output",
          "Target Waktu",
          "Penanggung Jawab",
          "Level Kemungkinan",
          "Level Dampak",
          "Besaran Risiko",
        ]}'''
assert old_ch in c, "colHeaders not found"
c = c.replace(old_ch, new_ch)

# 3. Fix nestedHeaders - two rows + colspan 5
old_nh = '''        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Rencana ID", colspan: 1 },
            { label: "Prioritas", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Besaran Risiko", colspan: 2 },
            { label: "Rencana Penanganan Risiko", colspan: 4 },
            { label: "Risiko Residual Harapan", colspan: 3 },
          ],
        ]}'''
new_nh = '''        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Rencana ID", colspan: 1 },
            { label: "Prioritas", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Besaran Risiko", colspan: 2 },
            { label: "Rencana Penanganan Risiko", colspan: 5 },
            { label: "Risiko Residual Harapan", colspan: 3 },
          ],
          [
            "Ident ID",
            "Rencana ID",
            "",
            "",
            "Aktual",
            "Residual",
            "Rencana Tindak Penanganan",
            "Jenis Penanganan",
            "Target Output",
            "Target Waktu",
            "Penanggung Jawab",
            "Level Kemungkinan",
            "Level Dampak",
            "Besaran Risiko",
          ],
        ]}'''
assert old_nh in c, "nestedHeaders not found"
c = c.replace(old_nh, new_nh)

# 4. Fix afterChange recalc trigger columns
old_ac = '''            if (col === 10 || col === 11) {
              recalcRow(hot, row, kemungkinanData, dampakData);
            }'''
new_ac = '''            if (col === 11 || col === 12) {
              recalcRow(hot, row, kemungkinanData, dampakData);
            }'''
assert old_ac in c, "afterChange not found"
c = c.replace(old_ac, new_ac)

# 5. Fix recalcRow indices
old_rc = '''  const lkNama = hot.getDataAtCell(row, 10) as string;
  const ldNama = hot.getDataAtCell(row, 11) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  const besaran = computeBesaran(lk?.skala, ld?.skala);
  hot.setDataAtCell(row, 5, besaran, "recalc");
  hot.setDataAtCell(row, 12, besaran, "recalc");'''
new_rc = '''  const lkNama = hot.getDataAtCell(row, 11) as string;
  const ldNama = hot.getDataAtCell(row, 12) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  const besaran = computeBesaran(lk?.skala, ld?.skala);
  hot.setDataAtCell(row, 5, besaran, "recalc");
  hot.setDataAtCell(row, 13, besaran, "recalc");'''
assert old_rc in c, "recalcRow not found"
c = c.replace(old_rc, new_rc)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: Fixed rencana page columns, headers, nestedHeaders, recalc")
