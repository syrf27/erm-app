import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The issue is likely that unitKerjaNamaList or kegiatanNamaList is undefined
# Make sure the useMemo hooks have proper fallbacks

# Find and fix the unitKerjaNamaList useMemo
old_unitkerja_memo = 'const unitKerjaNamaList = useMemo(() => unitKerjaData.map((o: any) => o.nama), [unitKerjaData]);'
new_unitkerja_memo = 'const unitKerjaNamaList = useMemo(() => (unitKerjaData || []).map((o: any) => o.nama), [unitKerjaData]);'
content = content.replace(old_unitkerja_memo, new_unitkerja_memo)

# Find and fix the kegiatanNamaList useMemo
old_kegiatan_memo = 'const kegiatanNamaList = useMemo(() => kegiatanData.map((o: any) => o.nama), [kegiatanData]);'
new_kegiatan_memo = 'const kegiatanNamaList = useMemo(() => (kegiatanData || []).map((o: any) => o.nama), [kegiatanData]);'
content = content.replace(old_kegiatan_memo, new_kegiatan_memo)

# Also make sure unitKerjaData and kegiatanData have proper fallbacks
old_unitkerja_data = 'const unitKerjaData = useMemo(() => unitKerjaList.result?.data ?? [], [unitKerjaList.result?.data]);'
new_unitkerja_data = 'const unitKerjaData = useMemo(() => unitKerjaList?.result?.data ?? [], [unitKerjaList?.result?.data]);'
content = content.replace(old_unitkerja_data, new_unitkerja_data)

old_kegiatan_data = 'const kegiatanData = useMemo(() => kegiatanList.result?.data ?? [], [kegiatanList.result?.data]);'
new_kegiatan_data = 'const kegiatanData = useMemo(() => kegiatanList?.result?.data ?? [], [kegiatanList?.result?.data]);'
content = content.replace(old_kegiatan_data, new_kegiatan_data)

# Fix the mapped data to handle undefined unitKerja and kegiatan
old_mapped_uk = '''const uk = unitKerjaData.find((o: any) => o.id === r.unitKerjaId);
      const kg = kegiatanData.find((o: any) => o.id === r.kegiatanId);'''

new_mapped_uk = '''const uk = (unitKerjaData || []).find((o: any) => o.id === r.unitKerjaId);
      const kg = (kegiatanData || []).find((o: any) => o.id === r.kegiatanId);'''

content = content.replace(old_mapped_uk, new_mapped_uk)

# Fix the saveAll to handle undefined data
old_saveall_uk = '''const unitKerjaId = row[8]
          ? unitKerjaData.find((o: any) => o.nama === row[8])?.id
          : null;
        const kegiatanId = row[9]
          ? kegiatanData.find((o: any) => o.nama === row[9])?.id
          : null;'''

new_saveall_uk = '''const unitKerjaId = row[8]
          ? (unitKerjaData || []).find((o: any) => o.nama === row[8])?.id
          : null;
        const kegiatanId = row[9]
          ? (kegiatanData || []).find((o: any) => o.nama === row[9])?.id
          : null;'''

content = content.replace(old_saveall_uk, new_saveall_uk)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/identifikasi/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added null checks to identifikasi page')
