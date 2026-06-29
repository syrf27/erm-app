
path = 'D:/erm-app/prisma/schema.prisma'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add residual fields to EvaluasiRisiko (before createdAt)
old_ev = '''model EvaluasiRisiko {
  id                   Int                @id @default(autoincrement())
  identifikasiRisikoId Int                @unique
  identifikasiRisiko   IdentifikasiRisiko @relation(fields: [identifikasiRisikoId], references: [id])
  responRisiko         String?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}'''
new_ev = '''model EvaluasiRisiko {
  id                   Int                @id @default(autoincrement())
  identifikasiRisikoId Int                @unique
  identifikasiRisiko   IdentifikasiRisiko @relation(fields: [identifikasiRisikoId], references: [id])
  responRisiko         String?
  residualLevelKemungkinanId Int?
  residualLevelKemungkinan   LevelKemungkinan? @relation(fields: [residualLevelKemungkinanId], references: [id])
  residualLevelDampakId      Int?
  residualLevelDampak        LevelDampak?      @relation(fields: [residualLevelDampakId], references: [id])
  residualLevelRisikoId      Int?
  residualLevelRisiko        LevelRisiko?      @relation(fields: [residualLevelRisikoId], references: [id])
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}'''
assert old_ev in c, "EvaluasiRisiko not found"
c = c.replace(old_ev, new_ev)

# 2. Back-relation on LevelKemungkinan
c = c.replace(
    '  matriksAnalisisRisikos        MatriksAnalisisRisiko[]\n}',
    '  matriksAnalisisRisikos        MatriksAnalisisRisiko[]\n  evaluasiRisikos               EvaluasiRisiko[]\n}',
    1
)

# 3. Back-relation on LevelDampak
c = c.replace(
    '''  analisisRisikos          AnalisisRisiko[]
  rencanaPenangananDampaks RencanaPenanganan[]
  matriksAnalisisRisikos   MatriksAnalisisRisiko[]
}''',
    '''  analisisRisikos          AnalisisRisiko[]
  rencanaPenangananDampaks RencanaPenanganan[]
  matriksAnalisisRisikos   MatriksAnalisisRisiko[]
  evaluasiRisikos          EvaluasiRisiko[]
}'''
)

# 4. Back-relation on LevelRisiko
c = c.replace(
    '''  analisisRisikos        AnalisisRisiko[]
  matriksAnalisisRisikos MatriksAnalisisRisiko[]
}''',
    '''  analisisRisikos        AnalisisRisiko[]
  matriksAnalisisRisikos MatriksAnalisisRisiko[]
  evaluasiRisikos        EvaluasiRisiko[]
}'''
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

# Verify
checks = ['residualLevelKemungkinanId', 'evaluasiRisikos               EvaluasiRisiko', 'evaluasiRisikos          EvaluasiRisiko', 'evaluasiRisikos        EvaluasiRisiko']
for ck in checks:
    print(ck, ':', ck in c)
print("DONE")
