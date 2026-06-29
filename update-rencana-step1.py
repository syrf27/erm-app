import re

with open('D:/erm-app/src/app/(app)/manajemen-risiko/rencana/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add jenisPenanganan to the data mapping
# Find the line where mapped data is created
old_mapping = '''return [
        r.id,
        rp?.id ?? null,
        an?.levelRisiko?.nama ?? "",
        r.risiko,
        computeBesaran(lk?.skala, ld?.skala),
        computeBesaran(residualLK?.skala, residualLD?.skala),
        rp?.rencanaTidakPenanganan ?? "",
        rp?.targetOutput ?? "",
        rp?.targetWaktu ?? "",
        rp?.penanggungJawab ?? "",
        residualLK?.nama ?? "",
        residualLD?.nama ?? "",
        computeBesaran(residualLK?.skala, residualLD?.skala),
      ];'''

new_mapping = '''return [
        r.id,
        rp?.id ?? null,
        an?.levelRisiko?.nama ?? "",
        r.risiko,
        computeBesaran(lk?.skala, ld?.skala),
        computeBesaran(residualLK?.skala, residualLD?.skala),
        rp?.rencanaTidakPenanganan ?? "",
        rp?.jenisPenanganan ?? "",
        rp?.targetOutput ?? "",
        rp?.targetWaktu ?? "",
        rp?.penanggungJawab ?? "",
        residualLK?.nama ?? "",
        residualLD?.nama ?? "",
        computeBesaran(residualLK?.skala, residualLD?.skala),
      ];'''

content = content.replace(old_mapping, new_mapping)

# Update padded array to have 14 columns instead of 13
content = content.replace(
    'padded.push([null, null, "", "", "", "", "", "", "", "", "", "", ""]);',
    'padded.push([null, null, "", "", "", "", "", "", "", "", "", "", "", ""]);'
)

# Add jenisPenanganan to saveAll payload
old_payload = '''payload.rencanaTidakPenanganan = (row[6] as string) || null;
      payload.targetOutput = (row[7] as string) || null;
      payload.targetWaktu = (row[8] as string) || null;
      payload.penanggungJawab = (row[9] as string) || null;'''

new_payload = '''payload.rencanaTidakPenanganan = (row[6] as string) || null;
      payload.jenisPenanganan = (row[7] as string) || null;
      payload.targetOutput = (row[8] as string) || null;
      payload.targetWaktu = (row[9] as string) || null;
      payload.penanggungJawab = (row[10] as string) || null;'''

content = content.replace(old_payload, new_payload)

# Update residualLKId and residualLDId to use correct column indices
content = content.replace(
    'const residualLKId = findId(kemungkinanData, (row[10] as string) ?? "");',
    'const residualLKId = findId(kemungkinanData, (row[11] as string) ?? "");'
)
content = content.replace(
    'const residualLDId = findId(dampakData, (row[11] as string) ?? "");',
    'const residualLDId = findId(dampakData, (row[12] as string) ?? "");'
)

with open('D:/erm-app/src/app/(app)/manajemen-risiko/rencana/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Updated data mapping for jenisPenanganan')
