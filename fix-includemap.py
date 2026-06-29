
path = 'D:/erm-app/src/lib/resource-map.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add evaluasi-risiko include before kri entry
old = '''  kri: {
    identifikasiRisiko: { select: { id: true, risiko: true } },
  },
};'''
new = '''  "evaluasi-risiko": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    residualLevelKemungkinan: { select: { id: true, nama: true, skala: true } },
    residualLevelDampak: { select: { id: true, nama: true, skala: true } },
    residualLevelRisiko: { select: { id: true, nama: true } },
  },
  kri: {
    identifikasiRisiko: { select: { id: true, risiko: true } },
  },
};'''
assert old in c, "kri block not found"
c = c.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("SUCCESS: added evaluasi-risiko includeMap")
