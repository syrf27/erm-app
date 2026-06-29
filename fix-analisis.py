
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/analisis/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add besaran to data mapping
old_map = '''      return [
        r.id,
        a?.id ?? null,
        r.risiko,
        lk?.nama ?? "",
        ld?.nama ?? "",
        lr?.nama ?? "",
        a?.pengendalianUraian ?? "",
        a?.pengendalianEfektivitas ?? "",
      ];'''
new_map = '''      const besaran = lk?.skala != null && ld?.skala != null ? lk.skala * ld.skala : "";
      return [
        r.id,
        a?.id ?? null,
        r.risiko,
        lk?.nama ?? "",
        ld?.nama ?? "",
        lr?.nama ?? "",
        besaran,
        a?.pengendalianUraian ?? "",
        a?.pengendalianEfektivitas ?? "",
      ];'''
assert old_map in c, "map not found"
c = c.replace(old_map, new_map)

# 2. Pad rows with 9 columns
old_pad = 'padded.push([null, null, "", "", "", "", "", ""]);'
new_pad = 'padded.push([null, null, "", "", "", "", "", "", ""]);'
assert old_pad in c, "pad not found"
c = c.replace(old_pad, new_pad)

# 3. saveAll indices for uraian/efektivitas
old_save = '''      payload.pengendalianUraian = (row[6] as string) || null;
      payload.pengendalianEfektivitas = (row[7] as string) || null;'''
new_save = '''      payload.pengendalianUraian = (row[7] as string) || null;
      payload.pengendalianEfektivitas = (row[8] as string) || null;'''
assert old_save in c, "save not found"
c = c.replace(old_save, new_save)

# 4. columns array - add Besaran, shift Uraian, make Keefektifan dropdown
old_cols = '''    { title: "Uraian", data: 6, type: "text", width: 250 },
    { title: "Efektivitas", data: 7, type: "text", width: 200 },
  ];'''
new_cols = '''    { title: "Besaran Risiko", data: 6, type: "text", width: 130, readOnly: true },
    { title: "Uraian", data: 7, type: "text", width: 250 },
    {
      title: "Keefektifan",
      data: 8,
      type: "dropdown",
      source: ["efektif", "kurang efektif", "tidak efektif"],
      width: 160,
      strict: false,
    },
  ];'''
assert old_cols in c, "cols not found"
c = c.replace(old_cols, new_cols)

# 5. colHeaders
old_chead = '''          "Level Risiko",
          "Uraian",
          "Efektivitas",
        ]}'''
new_chead = '''          "Level Risiko",
          "Besaran Risiko",
          "Uraian",
          "Keefektifan",
        ]}'''
assert old_chead in c, "colHeaders not found"
c = c.replace(old_chead, new_chead)

# 6. nestedHeaders - two rows with Risiko Aktual group
old_nh = '''        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Analisis ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Level Kemungkinan", colspan: 1 },
            { label: "Level Dampak", colspan: 1 },
            { label: "Level Risiko", colspan: 1 },
            {
              label: "Pengendalian yang Pernah Dilakukan",
              colspan: 2,
            },
          ],
        ]}'''
new_nh = '''        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Analisis ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Risiko Aktual", colspan: 4 },
            { label: "Pengendalian yang Pernah Dilakukan", colspan: 2 },
          ],
          [
            "Ident ID",
            "Analisis ID",
            "",
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
            "Besaran Risiko",
            "Uraian",
            "Keefektifan",
          ],
        ]}'''
assert old_nh in c, "nestedHeaders not found"
c = c.replace(old_nh, new_nh)

# 7. recalcAnalisisRow - also compute besaran at col 6
old_rc = '''  if (!lk || !ld) return;
  
  const match = matriksData.find(
    (m: any) => m.levelKemungkinanId === lk.id && m.levelDampakId === ld.id
  );
  
  if (!match) return;
  
  const lrNama = match.levelRisiko?.nama;
  if (lrNama) {
    hot.setDataAtCell(row, 5, lrNama, "recalc");
  }
}'''
new_rc = '''  if (!lk || !ld) return;

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
assert old_rc in c, "recalc not found"
c = c.replace(old_rc, new_rc)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: Analisis page restructured")
