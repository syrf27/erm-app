
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/evaluasi/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# A: add level-risiko hook
old_a = '  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 10000 } });'
new_a = '''  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 10000 } });
  const risikoResult = useList({ resource: "level-risiko", pagination: { pageSize: 10000 } });'''
assert old_a in c, "A fail"; c = c.replace(old_a, new_a)

# B: loading include new queries
old_b = '''  const loading =
    (identResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false);'''
new_b = '''  const loading =
    (identResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (kemungkinanResult.query?.isPending ?? false) ||
    (dampakResult.query?.isPending ?? false) ||
    (matriksResult.query?.isPending ?? false) ||
    (risikoResult.query?.isPending ?? false);'''
assert old_b in c, "B fail"; c = c.replace(old_b, new_b)

# C: risikoData memo
old_c = '  const dampakNamaList = useMemo(() => (dampakData || []).map((o: any) => o.nama), [dampakData]);'
new_c = old_c + '''
  const risikoData = useMemo(() => risikoResult.result?.data ?? [], [risikoResult.result?.data]);'''
assert old_c in c, "C fail"; c = c.replace(old_c, new_c)

# D: padded rows 8 elements
old_d = 'padded.push([null, null, "", "", ""]);'
new_d = 'padded.push([null, null, "", "", "", "", "", ""]);'
assert old_d in c, "D fail"; c = c.replace(old_d, new_d)

# E: colHeaders + nestedHeaders
old_e = '''        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
        ]}'''
new_e = '''        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
        ]}
        nestedHeaders={[
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
assert old_e in c, "E fail"; c = c.replace(old_e, new_e)

# F: saveAll row building
old_f = '''    const newRows: { index: number; identId: number; respon: string }[] = [];
    const updateRows: { index: number; id: number; respon: string }[] = [];

    rows.forEach((row, idx) => {
      const identId = parseInt(row[0] as string, 10);
      const evaluasiId = parseInt(row[1] as string, 10);
      if (isNaN(identId)) return;
      const respon = (row[3] as string) ?? "";
      if (!respon) return;

      if (isNaN(evaluasiId) || evaluasiId === 0) {
        newRows.push({ index: idx, identId, respon });
      } else {
        updateRows.push({ index: idx, id: evaluasiId, respon });
      }
    });'''
new_f = '''    const newRows: { index: number; identId: number; payload: any }[] = [];
    const updateRows: { index: number; id: number; payload: any }[] = [];

    const findId = (items: any[], nama: string) => {
      const found = items.find((o: any) => o.nama === nama);
      return found ? found.id : null;
    };

    rows.forEach((row, idx) => {
      const identId = parseInt(row[0] as string, 10);
      const evaluasiId = parseInt(row[1] as string, 10);
      if (isNaN(identId)) return;
      const respon = (row[3] as string) ?? "";
      const resLKId = findId(kemungkinanData, (row[5] as string) ?? "");
      const resLDId = findId(dampakData, (row[6] as string) ?? "");
      const resLRId = findId(risikoData, (row[7] as string) ?? "");
      if (!respon && resLKId == null && resLDId == null) return;

      const payload: Record<string, any> = {
        responRisiko: respon || null,
        residualLevelKemungkinanId: resLKId,
        residualLevelDampakId: resLDId,
        residualLevelRisikoId: resLRId,
      };

      if (isNaN(evaluasiId) || evaluasiId === 0) {
        newRows.push({ index: idx, identId, payload: { ...payload, identifikasiRisikoId: identId } });
      } else {
        updateRows.push({ index: idx, id: evaluasiId, payload });
      }
    });'''
assert old_f in c, "F fail"; c = c.replace(old_f, new_f)

# G: POST body
old_g = '''          newRows.map(({ index, identId, respon }) =>
            fetch("/api/evaluasi-risiko", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifikasiRisikoId: identId, responRisiko: respon }),
            }).then(async (res) => {'''
new_g = '''          newRows.map(({ index, identId, payload }) =>
            fetch("/api/evaluasi-risiko", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).then(async (res) => {'''
assert old_g in c, "G fail"; c = c.replace(old_g, new_g)

# H: PUT body
old_h = '''          updateRows.map(({ id, respon }) =>
            fetch(`/api/evaluasi-risiko/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ responRisiko: respon }),
            }).then(async (res) => {'''
new_h = '''          updateRows.map(({ id, payload }) =>
            fetch(`/api/evaluasi-risiko/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).then(async (res) => {'''
assert old_h in c, "H fail"; c = c.replace(old_h, new_h)

# I: saveAll deps
old_i = '''      setSaving(false);
    }
  }, [refetchQuery]);'''
new_i = '''      setSaving(false);
    }
  }, [refetchQuery, kemungkinanData, dampakData, risikoData]);'''
assert old_i in c, "I fail"; c = c.replace(old_i, new_i)

# J: afterChange + recalc function
old_j = '''          return cellProperties;
        }}
      />
    </Stack>
  );
}'''
new_j = '''          return cellProperties;
        }}
        afterChange={(changes) => {
          if (!changes) return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          for (const [row, col] of changes) {
            if (col === 5 || col === 6) {
              recalcResidualRow(hot, row, kemungkinanData, dampakData, matriksData);
            }
          }
        }}
      />
    </Stack>
  );
}

function recalcResidualRow(
  hot: Handsontable,
  row: number,
  kemungkinanData: any[],
  dampakData: any[],
  matriksData: any[]
) {
  const lkNama = hot.getDataAtCell(row, 5) as string;
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
assert old_j in c, "J fail"; c = c.replace(old_j, new_j)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("SUCCESS: all evaluasi edits applied")
