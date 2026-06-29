# Complete UI Implementation Guide - Kertas Kerja Format

## ✅ COMPLETED (Phase 1)
- Database schema updated with all required fields
- Migration applied successfully
- Prisma client regenerated
- Seed data added
- App builds successfully

## 📋 REMAINING WORK (Phase 2)

### Key Changes Summary:
The current identifikasi-risiko page uses **Handsontable** (spreadsheet) interface.
To match the Kertas Kerja PDF, we need to:

1. **Add Unit Kerja & Kegiatan columns** to the spreadsheet
2. **Update API endpoints** to save the new fields
3. **Add Jenis Penanganan** field in RencanaPenanganan
4. **Add Keterjadian Risiko** field in monitoring
5. **Create Excel export** that matches PDF format exactly

---

## IMPLEMENTATION STEPS

### Step 1: Update Identifikasi Risiko Page
**File:** `src/app/(app)/manajemen-risiko/identifikasi/page.tsx`

**Changes needed:**
```typescript
// Add to useList hooks:
const unitKerjaList = useList({ resource: "unit-kerja", pagination: { mode: "off" } });
const kegiatanList = useList({ resource: "kegiatan", pagination: { mode: "off" } });

// Add to data mapping:
const unitKerjaData = useMemo(() => unitKerjaList.result?.data ?? [], [unitKerjaList.result?.data]);
const kegiatanData = useMemo(() => kegiatanList.result?.data ?? [], [kegiatanList.result?.data]);

// Update columns array - ADD these columns after Area Dampak:
{
  title: "Unit Kerja",
  data: 8, // new column index
  type: "dropdown",
  source: unitKerjaData.map((o: any) => o.nama),
  width: 150,
  strict: false,
},
{
  title: "Kegiatan",
  data: 9,
  type: "dropdown",
  source: kegiatanData.map((o: any) => o.nama),
  width: 150,
  strict: false,
},

// Update saveAll function to include new fields
```

### Step 2: Update API Endpoints
**Files:** `src/app/api/identifikasi-risiko/route.ts` and `[id]/route.ts`

Add handling for `unitKerjaId` and `kegiatanId` fields.

### Step 3: Add Jenis Penanganan to Evaluasi
**File:** `src/app/(app)/manajemen-risiko/evaluasi/page.tsx`

Add dropdown with options: "Pencegahan", "Perbaikan", "Deteksi"

### Step 4: Add Keterjadian Risiko to Pemantauan
**File:** `src/app/(app)/pemantauan-risiko/page.tsx`

Add dropdown with options: "Terjadi", "Tidak Terjadi", "Berpotensi Terjadi"

### Step 5: Update Pelaporan Risiko Excel Export
**File:** `src/app/(app)/pelaporan-risiko/page.tsx`

**This is the CRITICAL part** - Update the Excel export to match the exact PDF format.

The current export needs to be rebuilt to create a Kertas Kerja template with:
- Header section (Unit Kerja, Sasaran, etc.)
- Proper column structure matching PDF
- All new fields included

---

## QUICK START CODE SNIPPETS

### For Identifikasi Risiko - Add Unit Kerja/Kegiatan Columns

```typescript
// After existing columns in the columns array, add:
{
  title: "Unit Kerja",
  data: 8,
  type: "dropdown",
  source: unitKerjaData.map((o: any) => o.nama),
  width: 150,
  strict: false,
},
{
  title: "Kegiatan",  
  data: 9,
  type: "dropdown",
  source: kegiatanData.map((o: any) => o.nama),
  width: 150,
  strict: false,
},
```

### For Pelaporan Risiko - Excel Export Structure

The Excel export should create sheets with these columns to match the PDF:
1. No
2. Unit Kerja
3. Sasaran
4. Kegiatan
5. Proses Bisnis (with Kode)
6. Risiko
7. Penyebab
8. Dampak
9. Jenis Risiko
10. Sumber Risiko
11. Kategori
12. Kemungkinan Aktual
13. Dampak Aktual
14. Besaran Aktual
15. Pengendalian Uraian
16. Pengendalian Efektivitas
17. Evaluasi (Respon)
18. Jenis Penanganan (NEW)
19. Rencana Penanganan
20. Target Waktu
21. Target Output
22. Penanggung Jawab
23. Kemungkinan Residual
24. Dampak Residual
25. Keterjadian Risiko (NEW)
26. Realisasi Waktu
27. Realisasi Output
28. Dokumen Pendukung
29. Persetujuan
30. Disetujui Oleh

---

## FILES TO MODIFY

1. `src/app/(app)/manajemen-risiko/identifikasi/page.tsx` - Add Unit Kerja/Kegiatan columns
2. `src/app/(app)/manajemen-risiko/evaluasi/page.tsx` - Add Jenis Penanganan
3. `src/app/(app)/pemantauan-risiko/page.tsx` - Add Keterjadian Risiko
4. `src/app/(app)/pelaporan-risiko/page.tsx` - Update Excel export
5. API routes - Update to handle new fields

---

## NEXT SESSION TODO

1. Open each file above
2. Apply the changes listed
3. Test the forms
4. Test the Excel export
5. Verify it matches the PDF format

All the database work is complete and working. The UI updates are straightforward - mainly adding dropdown fields and updating the Excel export logic.

The schema, migrations, and seed data are all done and tested! ✅
