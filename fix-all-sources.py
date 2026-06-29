import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure all the other nama lists also have safe fallbacks
content = content.replace(
    'const jenisNamaList = useMemo(() => jenisData.map((o: any) => o.nama), [jenisData]);',
    'const jenisNamaList = useMemo(() => (jenisData || []).map((o: any) => o.nama), [jenisData]);'
)

content = content.replace(
    'const sumberNamaList = useMemo(() => sumberData.map((o: any) => o.nama), [sumberData]);',
    'const sumberNamaList = useMemo(() => (sumberData || []).map((o: any) => o.nama), [sumberData]);'
)

content = content.replace(
    'const kategoriNamaList = useMemo(() => kategoriData.map((o: any) => o.nama), [kategoriData]);',
    'const kategoriNamaList = useMemo(() => (kategoriData || []).map((o: any) => o.nama), [kategoriData]);'
)

content = content.replace(
    'const areaNamaList = useMemo(() => areaData.map((o: any) => o.nama), [areaData]);',
    'const areaNamaList = useMemo(() => (areaData || []).map((o: any) => o.nama), [areaData]);'
)

# Also make the data memos safe
content = content.replace(
    'const jenisData = useMemo(() => jenisList.result?.data ?? [], [jenisList.result?.data]);',
    'const jenisData = useMemo(() => jenisList?.result?.data ?? [], [jenisList?.result?.data]);'
)

content = content.replace(
    'const sumberData = useMemo(() => sumberList.result?.data ?? [], [sumberList.result?.data]);',
    'const sumberData = useMemo(() => sumberList?.result?.data ?? [], [sumberList?.result?.data]);'
)

content = content.replace(
    'const kategoriData = useMemo(() => kategoriList.result?.data ?? [], [kategoriList.result?.data]);',
    'const kategoriData = useMemo(() => kategoriList?.result?.data ?? [], [kategoriList?.result?.data]);'
)

content = content.replace(
    'const areaData = useMemo(() => areaList.result?.data ?? [], [areaList.result?.data]);',
    'const areaData = useMemo(() => areaList?.result?.data ?? [], [areaList?.result?.data]);'
)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Fixed all data source lists with safe defaults')
