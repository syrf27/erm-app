
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/evaluasi/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# R1: add useList hooks after analisisResult
old1 = '  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });'
new1 = old1 + '''
  const kemungkinanResult = useList({ resource: "level-kemungkinan", pagination: { pageSize: 10000 } });
  const dampakResult = useList({ resource: "level-dampak", pagination: { pageSize: 10000 } });
  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 10000 } });'''
assert old1 in c, "R1 fail"
c = c.replace(old1, new1)

# R2: add memos after analisisData memo
old2 = 'const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);'
new2 = old2 + '''
  const kemungkinanData = useMemo(() => kemungkinanResult.result?.data ?? [], [kemungkinanResult.result?.data]);
  const dampakData = useMemo(() => dampakResult.result?.data ?? [], [dampakResult.result?.data]);
  const matriksData = useMemo(() => matriksResult.result?.data ?? [], [matriksResult.result?.data]);
  const kemungkinanNamaList = useMemo(() => (kemungkinanData || []).map((o: any) => o.nama), [kemungkinanData]);
  const dampakNamaList = useMemo(() => (dampakData || []).map((o: any) => o.nama), [dampakData]);'''
assert old2 in c, "R2 fail"
c = c.replace(old2, new2)

# R3: data mapping return - add residual columns 5,6,7
old3 = '''return [
        r.id,
        ev?.id ?? null,
        r.risiko,
        ev?.responRisiko ?? "",
        prioritas,
      ];'''
new3 = '''const resLK = kemungkinanData.find((o: any) => o.id === ev?.residualLevelKemungkinanId);
      const resLD = dampakData.find((o: any) => o.id === ev?.residualLevelDampakId);
      const resLR = ev?.residualLevelRisiko?.nama ?? "";
      return [
        r.id,
        ev?.id ?? null,
        r.risiko,
        ev?.responRisiko ?? "",
        prioritas,
        resLK?.nama ?? "",
        resLD?.nama ?? "",
        resLR,
      ];'''
assert old3 in c, "R3 fail"
c = c.replace(old3, new3)

# R4: columns - add 3 residual columns
old4 = '''    { title: "Prioritas Risiko", data: 4, type: "text", width: 200, readOnly: true },'''
new4 = '''    { title: "Prioritas Risiko", data: 4, type: "text", width: 200, readOnly: true },
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
    { title: "Level Risiko", data: 7, type: "text", width: 150, readOnly: true },'''
assert old4 in c, "R4 fail"
c = c.replace(old4, new4)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("Part 1 done (hooks, memos, mapping, columns)")
