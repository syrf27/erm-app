
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/evaluasi/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Data return - reorder + add besaran
old1 = '''      return [
        r.id,
        ev?.id ?? null,
        r.risiko,
        ev?.responRisiko ?? "",
        prioritas,
        resLK?.nama ?? "",
        resLD?.nama ?? "",
        resLR,
      ];'''
new1 = '''      const resBesaran = resLK?.skala != null && resLD?.skala != null ? resLK.skala * resLD.skala : "";
      return [
        r.id,
        ev?.id ?? null,
        r.risiko,
        resLK?.nama ?? "",
        resLD?.nama ?? "",
        resLR,
        resBesaran,
        ev?.responRisiko ?? "",
        prioritas,
      ];'''
assert old1 in c, "1"; c = c.replace(old1, new1)

# 2. padded 9 elements
old2 = 'padded.push([null, null, "", "", "", "", "", ""]);'
new2 = 'padded.push([null, null, "", "", "", "", "", "", ""]);'
assert old2 in c, "2"; c = c.replace(old2, new2)

# 3. saveAll indices
old3 = '''      const respon = (row[3] as string) ?? "";
      const resLKId = findId(kemungkinanData, (row[5] as string) ?? "");
      const resLDId = findId(dampakData, (row[6] as string) ?? "");
      const resLRId = findId(risikoData, (row[7] as string) ?? "");'''
new3 = '''      const respon = (row[7] as string) ?? "";
      const resLKId = findId(kemungkinanData, (row[3] as string) ?? "");
      const resLDId = findId(dampakData, (row[4] as string) ?? "");
      const resLRId = findId(risikoData, (row[5] as string) ?? "");'''
assert old3 in c, "3"; c = c.replace(old3, new3)

# 4. columns reorder
old4 = '''  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Evaluasi ID", data: 1, type: "numeric", width: 1 },
    { title: "Risiko", data: 2, type: "text", width: 300, readOnly: true },
    {
      title: "Respon Risiko",
      data: 3,
      type: "dropdown",
      source: RESPON_OPTIONS,
      width: 250,
      strict: true,
    },
    { title: "Prioritas Risiko", data: 4, type: "text", width: 200, readOnly: true },
    {
      title: "Level Kemungkinan",
      data: 5,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 6,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    { title: "Level Risiko", data: 7, type: "text", width: 150, readOnly: true },
  ];'''
new4 = '''  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Evaluasi ID", data: 1, type: "numeric", width: 1 },
    { title: "Risiko", data: 2, type: "text", width: 300, readOnly: true },
    {
      title: "Level Kemungkinan",
      data: 3,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 4,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    { title: "Level Risiko", data: 5, type: "text", width: 150, readOnly: true },
    { title: "Besaran Risiko", data: 6, type: "text", width: 130, readOnly: true },
    {
      title: "Respon Risiko",
      data: 7,
      type: "dropdown",
      source: RESPON_OPTIONS,
      width: 250,
      strict: true,
    },
    { title: "Prioritas Risiko", data: 8, type: "text", width: 200, readOnly: true },
  ];'''
assert old4 in c, "4"; c = c.replace(old4, new4)

# 5. colHeaders
old5 = '''        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
        ]}'''
new5 = '''        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
          "Besaran Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
        ]}'''
assert old5 in c, "5"; c = c.replace(old5, new5)

# 6. nestedHeaders
old6 = '''        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Evaluasi ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Respon Risiko", colspan: 1 },
            { label: "Prioritas Risiko", colspan: 1 },
            { label: "Risiko Residual", colspan: 3 },
          ],
          [
            "Ident ID",
            "Evaluasi ID",
            "",
            "",
            "",
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
          ],
        ]}'''
new6 = '''        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Evaluasi ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Risiko Residual", colspan: 4 },
            { label: "Respon Risiko", colspan: 1 },
            { label: "Prioritas Risiko", colspan: 1 },
          ],
          [
            "Ident ID",
            "Evaluasi ID",
            "",
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
            "Besaran Risiko",
            "",
            "",
          ],
        ]}'''
assert old6 in c, "6"; c = c.replace(old6, new6)

# 7. afterChange cols
old7 = '''            if (col === 5 || col === 6) {
              recalcResidualRow(hot, row, kemungkinanData, dampakData, matriksData);
            }'''
new7 = '''            if (col === 3 || col === 4) {
              recalcResidualRow(hot, row, kemungkinanData, dampakData, matriksData);
            }'''
assert old7 in c, "7"; c = c.replace(old7, new7)

# 8. recalcResidualRow
old8 = '''  const lkNama = hot.getDataAtCell(row, 5) as string;
  const ldNama = hot.getDataAtCell(row, 6) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  if (!lk || !ld) return;
  const match = matriksData.find(
    (m: any) => m.levelKemungkinanId === lk.id && m.levelDampakId === ld.id
  );
  if (!match) return;
  const lrNama = match.levelRisiko?.nama;
  if (lrNama) {
    hot.setDataAtCell(row, 7, lrNama, "recalc");
  }
}'''
new8 = '''  const lkNama = hot.getDataAtCell(row, 3) as string;
  const ldNama = hot.getDataAtCell(row, 4) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  if (!lk || !ld) return;
  const besaran = lk.skala != null && ld.skala != null ? lk.skala * ld.skala : "";
  hot.setDataAtCell(row, 6, besaran, "recalc");
  const match = matriksData.find(
    (m: any) => m.levelKemungkinanId === lk.id && m.levelDampakId === ld.id
  );
  if (!match) return;
  const lrNama = match.levelRisiko?.nama;
  if (lrNama) {
    hot.setDataAtCell(row, 5, lrNama, "recalc");
  }
}'''
assert old8 in c, "8"; c = c.replace(old8, new8)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("SUCCESS: evaluasi reordered with Besaran Risiko")
