import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add unitKerja and kegiatan hooks
content = content.replace(
    'const areaList = useList({ resource: "area-dampak", pagination: { mode: "off" } });',
    '''const areaList = useList({ resource: "area-dampak", pagination: { mode: "off" } });
  const unitKerjaList = useList({ resource: "unit-kerja", pagination: { mode: "off" } });
  const kegiatanList = useList({ resource: "kegiatan", pagination: { mode: "off" } });'''
)

# Update loading check
content = content.replace(
    '(areaList.query?.isPending ?? false);',
    '''(areaList.query?.isPending ?? false) ||
    (unitKerjaList.query?.isPending ?? false) ||
    (kegiatanList.query?.isPending ?? false);'''
)

# Add data memos
content = content.replace(
    'const areaData = useMemo(() => areaList.result?.data ?? [], [areaList.result?.data]);',
    '''const areaData = useMemo(() => areaList.result?.data ?? [], [areaList.result?.data]);
  const unitKerjaData = useMemo(() => unitKerjaList.result?.data ?? [], [unitKerjaList.result?.data]);
  const kegiatanData = useMemo(() => kegiatanList.result?.data ?? [], [kegiatanList.result?.data]);'''
)

# Add nama lists
content = content.replace(
    'const areaNamaList = useMemo(() => areaData.map((o: any) => o.nama), [areaData]);',
    '''const areaNamaList = useMemo(() => areaData.map((o: any) => o.nama), [areaData]);
  const unitKerjaNamaList = useMemo(() => unitKerjaData.map((o: any) => o.nama), [unitKerjaData]);
  const kegiatanNamaList = useMemo(() => kegiatanData.map((o: any) => o.nama), [kegiatanData]);'''
)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added UnitKerja and Kegiatan data hooks')
