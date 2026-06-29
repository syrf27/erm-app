# ERM App Schema Update - Kertas Kerja Compliance

## Summary
Based on the PDF template "20_SESTAMA_KK MR2026 - 23.pdf", we need to add fields for complete risk management workflow tracking.

## NEW MODELS TO ADD

```prisma
model UnitKerja {
  id        Int      @id @default(autoincrement())
  nama      String   @unique
  kode      String   @unique // e.g., "SESTAMA", "INSPEKTORAT"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sasarans           Sasaran[]
  kegiatans          Kegiatan[]
  identifikasiRisiko IdentifikasiRisiko[]
}

model Kegiatan {
  id          Int       @id @default(autoincrement())
  nama        String
  deskripsi   String?
  unitKerjaId Int?
  sasaranId   Int?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  unitKerja          UnitKerja?          @relation(fields: [unitKerjaId], references: [id], onDelete: SetNull)
  sasaran            Sasaran?            @relation(fields: [sasaranId], references: [id], onDelete: SetNull)
  prosesBisnis       ProsesBisnis[]
  identifikasiRisiko IdentifikasiRisiko[]
}
```

## FIELDS TO ADD TO EXISTING MODELS

### Sasaran
- **unitKerjaId** Int? (foreign key to UnitKerja)
- **Relations**: unitKerja, kegiatans[]

### ProsesBisnis
- **kode** String? // e.g., "K01", "K03"
- **kegiatanId** Int? (foreign key to Kegiatan)
- **Relation**: kegiatan

### IdentifikasiRisiko
- **kegiatanId** Int? (foreign key to Kegiatan)
- **unitKerjaId** Int? (foreign key to UnitKerja)
- **Relations**: kegiatan, unitKerja

### AnalisisRisiko
- **jenisPenanganan** String? // "Pencegahan"/"Perbaikan"/"Deteksi"

### PemantauanRisiko
- **keterjadiRisiko** String? // "Terjadi"/"Tidak Terjadi"/"Berpotensi Terjadi"

## NEXT STEPS

Due to the complexity of the schema, I recommend:

1. **I'll create a complete new schema.prisma file** with all changes properly integrated
2. **You review the changes** in a diff view
3. **Run Prisma migration** to update the database
4. **Update seed data** to add Unit Kerja examples
5. **Update UI pages** one by one to use the new fields

Shall I proceed with creating the complete updated schema file?
