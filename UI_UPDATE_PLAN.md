# UI Updates Required - Kertas Kerja Compliance

## Summary of Required Changes

Based on the Kertas Kerja template and newly added database fields, we need to update 5 pages.

---

## 1. PENETAPAN KONTEKS PAGE
**Location:** `src/app/(app)/manajemen-risiko/penetapan-konteks/page.tsx`

**New Sections to Add:**
### A. Unit Kerja Management (New)
- Add a card for "Kelola Unit Kerja"
- CRUD for Unit Kerja (nama, kode)
- Table showing existing Unit Kerja

### B. Kegiatan Management (New)
- Add a card for "Kelola Kegiatan"
- Form fields: nama, deskripsi, unit kerja dropdown, sasaran dropdown
- Table showing existing Kegiatan with filters

### C. Update ProsesBisnis Section
- Add "Kode" field (e.g., "K01", "K03")
- Add "Kegiatan" dropdown

---

## 2. IDENTIFIKASI RISIKO PAGE
**Location:** `src/app/(app)/manajemen-risiko/identifikasi/page.tsx`

**Changes:**
- Add **Unit Kerja dropdown** (filters available Kegiatan)
- Add **Kegiatan dropdown** (filtered by selected Unit Kerja)
- Show full context breadcrumb: Unit Kerja → Sasaran → Kegiatan → Proses Bisnis
- Update table columns to show unit kerja and kegiatan

---

## 3. EVALUASI RISIKO PAGE  
**Location:** `src/app/(app)/manajemen-risiko/evaluasi/page.tsx`

**Changes:**
- Add **Jenis Penanganan** dropdown in the Rencana Penanganan section
- Options: "Pencegahan", "Perbaikan", "Deteksi"
- Show in table columns

---

## 4. PEMANTAUAN RISIKO PAGE
**Location:** `src/app/(app)/pemantauan-risiko/page.tsx`

**Changes:**
- Add **Keterjadian Risiko** dropdown
- Options: "Terjadi", "Tidak Terjadi", "Berpotensi Terjadi"
- Show in monitoring table
- Use color coding (red=Terjadi, green=Tidak Terjadi, yellow=Berpotensi Terjadi)

---

## 5. PELAPORAN RISIKO PAGE
**Location:** `src/app/(app)/pelaporan-risiko/page.tsx`

**Changes:**
- Show Unit Kerja column
- Show Kegiatan column
- Show Jenis Penanganan
- Show Keterjadian Risiko
- Update Excel export to include all new fields

---

**Shall I proceed with implementing these UI changes?**
(Starting with Penetapan Konteks page)
