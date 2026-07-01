# Spesifikasi Fungsional — Sistem Informasi Manajemen Risiko (ERM)

| **Dokumen** | Functional Specification Document |
|---|---|
| **Produk** | Sistem Informasi Manajemen Risiko Enterprise (ERM) |
| **Versi** | 1.0 |
| **Status** | Draf |

---

## 1. Pendahuluan

Dokumen ini berisi spesifikasi fungsional detail untuk setiap modul dalam Sistem Informasi Manajemen Risiko Enterprise (ERM). Setiap fungsi dijabarkan dalam bentuk alur kerja, aturan bisnis, validasi, dan kriteria penerimaan.

---

## 2. Modul Autentikasi & Manajemen Sesi

### 2.1 Login

| Aspek | Detail |
|---|---|
| **ID** | F-001 |
| **Aktor** | Semua pengguna (belum login) |
| **Deskripsi** | Pengguna dapat login menggunakan email dan kata sandi |
| **Trigger** | Pengguna membuka halaman `/login` |
| **Prekondisi** | Pengguna belum login, memiliki akun terdaftar |

**Alur Normal:**

| Langkah | Aksi | Sistem |
|---|---|---|
| 1 | Mengisi form email dan password | - |
| 2 | Klik tombol "Login" | Validasi input tidak kosong |
| 3 | - | Kirim `POST /api/auth/login` |
| 4 | - | Cari user by email di database |
| 5 | - | Bandingkan password (plaintext) |
| 6 | - | Load role + permissions |
| 7 | - | Apply user permission override (grant/deny) |
| 8 | - | Simpan auth state di cookie |
| 9 | - | Redirect ke halaman utama |

**Alur Alternatif:**

| Skenario | Response Sistem |
|---|---|
| Email tidak terdaftar | `400: "Invalid email or password"` |
| Password salah | `400: "Invalid email or password"` |
| Email/password kosong | `400: "Email and password are required"` |

**Kriteria Penerimaan:**
- [ ] Login dengan kredensial valid → redirect ke dashboard
- [ ] Login dengan email tidak terdaftar → tampilkan error
- [ ] Login dengan password salah → tampilkan error
- [ ] Field kosong → validasi client-side + server-side
- [ ] Setelah login, menu sesuai permissions
- [ ] Session bertahan selama cookie tidak dihapus

---

### 2.2 Registrasi

| Aspek | Detail |
|---|---|
| **ID** | F-002 |
| **Aktor** | Pengguna baru |
| **Deskripsi** | Pengguna dapat mendaftar akun baru |
| **Trigger** | Pengguna membuka halaman `/register` |

**Alur Normal:**
1. Isi form: nama, email, password, konfirmasi password
2. Validasi: email format, password match, password length
3. `POST /api/auth/register` → buat user baru (default role)
4. Redirect ke `/login`

**Aturan Bisnis:**
- Email harus unik (tidak boleh duplikat)
- Password minimal 6 karakter
- Role default = `"user"` (atau role paling rendah)

---

### 2.3 Logout

| Aspek | Detail |
|---|---|
| **ID** | F-003 |
| **Aktor** | Semua pengguna (sudah login) |
| **Deskripsi** | Pengguna dapat keluar dari sesi |
| **Trigger** | Klik tombol Logout |

**Alur:**
1. Hapus cookie `auth`
2. Catat audit log `LOGOUT` melalui `POST /api/audit-logs/create`
3. Redirect ke `/login`

---

## 3. Modul Dashboard

### 3.1 Ringkasan KPI

| Aspek | Detail |
|---|---|
| **ID** | F-010 |
| **Aktor** | Semua pengguna (sudah login) |
| **Deskripsi** | Menampilkan kartu KPI ringkasan risiko |
| **Sumber Data** | `GET /api/dashboard-stats` → `kpi` |

**Komponen:**
| Kartu | Rumus |
|---|---|
| Total Risiko | COUNT IdentifikasiRisiko |
| Dianalisis | COUNT AnalisisRisiko |
| Cakupan Penanganan | (COUNT RencanaPenanganan / COUNT IdentifikasiRisiko) × 100% |
| Jumlah KRI | COUNT Kri |

**Aturan Bisnis:**
- Angka ditampilkan dengan format bilangan (ribuan, jutaan)
- Persentase ditampilkan dengan 1 angka desimal
- Warna teks: hijau jika > 80%, kuning jika 50-80%, merah jika < 50%

---

### 3.2 Matriks Heatmap Risiko

| Aspek | Detail |
|---|---|
| **ID** | F-011 |
| **Aktor** | Semua pengguna |
| **Deskripsi** | Menampilkan matriks 5×5 kemungkinan × dampak dengan warna tingkat risiko |
| **Sumber Data** | `GET /api/dashboard-stats` → `heatmap` |

**Rentang Warna:**
| Level | Warna |
|---|---|
| Sangat Rendah | Biru |
| Rendah | Hijau |
| Sedang | Kuning |
| Tinggi | Jingga |
| Sangat Tinggi | Merah |

**Aturan Bisnis:**
- Setiap sel menunjukkan jumlah risiko pada koordinat tersebut
- Klik sel → filter ke daftar risiko terkait
- Skala sumbu X = Level Dampak, sumbu Y = Level Kemungkinan

---

### 3.3 Distribusi Risiko

| Aspek | Detail |
|---|---|
| **ID** | F-012 |
| **Aktor** | Semua pengguna |
| **Deskripsi** | Menampilkan distribusi risiko berdasarkan level, kategori, tipe, dan respons |

**Komponen:**
| Visual | Data |
|---|---|
| Progress bar | Distribusi by level (warna sesuai level) |
| Bar chart | Distribusi by kategori |
| Bar chart | Distribusi by tipe (positif/negatif) |
| Bar chart | Distribusi by respons risiko |

---

### 3.4 Perbandingan Risiko Inheren vs Residual

| Aspek | Detail |
|---|---|
| **ID** | F-013 |
| **Aktor** | Semua pengguna |
| **Deskripsi** | Menampilkan rata-rata skor risiko inheren vs residual |
| **Sumber Data** | `inherentVsResidual` |

**Aturan Bisnis:**
- Hanya risiko yang sudah dievaluasi yang dimasukkan dalam perhitungan residual
- Ditampilkan dalam bentuk progress bar berpasangan

---

### 3.5 Status KRI

| Aspek | Detail |
|---|---|
| **ID** | F-014 |
| **Aktor** | Semua pengguna |
| **Deskripsi** | Ringkasan status KRI dalam diagram lingkaran |

**Logika Status:**
| Kondisi | Status |
|---|---|
| `nilaiAktual == null` | Belum |
| `nilaiAktual <= batasHijau` | Hijau |
| `nilaiAktual >= batasMerah` | Merah |
| `nilaiAktual >= batasKuning` | Kuning |
| Lainnya | Hijau (default) |

---

### 3.6 Risiko Prioritas Tinggi

| Aspek | Detail |
|---|---|
| **ID** | F-015 |
| **Aktor** | Semua pengguna |
| **Deskripsi** | Tabel 8 risiko dengan skor tertinggi |
| **Sumber Data** | `topRisks` (sorted desc by `besaran`) |

---

### 3.7 Corong Proses ERM

| Aspek | Detail |
|---|---|
| **ID** | F-016 |
| **Aktor** | Semua pengguna |
| **Deskripsi** | Visual funnel dari 4 tahap: Identifikasi → Analisis → Evaluasi → Penanganan |
| **Sumber Data** | `funnel` |

---

## 4. Modul Penetapan Konteks

### 4.1 CRUD Data Referensi

| Aspek | Detail |
|---|---|
| **ID** | F-020 – F-036 (16 sub-modul) |
| **Aktor** | Risk Officer, Manajer Risiko, Admin |
| **Deskripsi** | Mengelola 16 data referensi untuk penetapan konteks |
| **UI** | Tab navigation + CRUD table reusable (`crud-table.tsx`) |

**Daftar Sub-Modul:**
| No | Resource | Tabel | Unique Field |
|---|---|---|---|
| 1 | Unit Kerja | `UnitKerja` | `nama`, `kode` |
| 2 | Kegiatan | `Kegiatan` | - |
| 3 | Sasaran | `Sasaran` | - |
| 4 | Proses Bisnis | `ProsesBisnis` | - |
| 5 | Pemangku Kepentingan | `PemangkuKepentingan` | - |
| 6 | Peraturan Perundangan | `PeraturanPerundangan` | - |
| 7 | Jenis Risiko | `JenisRisiko` | `nama` |
| 8 | Sumber Risiko | `SumberRisiko` | `nama` |
| 9 | Kategori Risiko | `KategoriRisiko` | - |
| 10 | Area Dampak | `AreaDampak` | - |
| 11 | Level Kemungkinan | `LevelKemungkinan` | - |
| 12 | Level Dampak | `LevelDampak` | - |
| 13 | Level Risiko | `LevelRisiko` | - |
| 14 | Kriteria Kemungkinan | `KriteriaKemungkinan` | composite FK |
| 15 | Kriteria Dampak | `KriteriaDampak` | - |
| 16 | Selera Risiko | `SeleraRisiko` | - |
| 17 | Opsi Penanganan | `OpsiPenanganan` | - |

**Fitur CRUD Umum:**
| Aksi | Method | Endpoint |
|---|---|---|
| List | `GET` | `/api/{resource}?_start=0&_end=25` |
| Create | `POST` | `/api/{resource}` |
| Read | `GET` | `/api/{resource}/{id}` |
| Update | `PATCH` | `/api/{resource}/{id}` |
| Delete | `DELETE` | `/api/{resource}/{id}` |

**Aturan Bisnis:**
- Delete hanya jika record tidak sedang digunakan (referential integrity)
- Unique field divalidasi di server
- Modal create/edit dengan validasi required field
- Konfirmasi sebelum delete

---

## 5. Modul Identifikasi Risiko

### 5.1 Spreadsheet Risk Entry

| Aspek | Detail |
|---|---|
| **ID** | F-040 |
| **Aktor** | Risk Officer, Manajer Risiko |
| **Deskripsi** | Entri data risiko menggunakan spreadsheet (Handsontable) |
| **Trigger** | Navigasi ke `/manajemen-risiko/identifikasi` |

**Layout Spreadsheet:**
| Kolom | Tipe Input | Required | Sumber Data |
|---|---|---|---|
| ID | Auto-generated (read-only) | ✅ | Sistem |
| Risiko | Text | ✅ | Manual input |
| Jenis Risiko | Dropdown | ✅ | `GET /api/jenis-risiko` |
| Sumber Risiko | Dropdown | ✅ | `GET /api/sumber-risiko` |
| Kategori Risiko | Dropdown | ✅ | `GET /api/kategori-risiko` |
| Area Dampak | Dropdown | ✅ | `GET /api/area-dampak` |
| Unit Kerja | Dropdown | ❌ | `GET /api/unit-kerja` |
| Kegiatan | Dropdown | ❌ | `GET /api/kegiatan` |
| Penyebab | Text | ❌ | Manual input |
| Dampak | Text | ❌ | Manual input |

**Alur:**
1. Load data existing: `GET /api/identifikasi-risiko?_start=0&_end=1000` (include relasi)
2. Render spreadsheet dengan data yang ada
3. User menambah/mengedit baris
4. Dropdown validator dari API referensi
5. Klik "Simpan Semua" → batch POST/PUT ke API
6. Notifikasi sukses/gagal

**Aturan Bisnis:**
- Baris baru mendapat ID increment otomatis
- Dropdown validator menampilkan data live dari API
- Search/filter plugin untuk mencari dalam spreadsheet
- Light/dark mode theming pada Handsontable
- Auto-save atau manual save

---

## 6. Modul Analisis Risiko

### 6.1 Analisis Inheren

| Aspek | Detail |
|---|---|
| **ID** | F-050 |
| **Aktor** | Manajer Risiko |
| **Deskripsi** | Menetapkan skor kemungkinan dan dampak untuk setiap risiko |
| **Trigger** | Navigasi ke `/manajemen-risiko/analisis` |

**Alur:**
1. Load daftar risiko yang sudah diidentifikasi (belum dianalisis)
2. Untuk setiap risiko, pilih:
   - **Level Kemungkinan** (skala 1-5) → dropdown dari `LevelKemungkinan`
   - **Level Dampak** (skala 1-5) → dropdown dari `LevelDampak`
3. Sistem menghitung **besaran risiko inheren** = kemungkinan × dampak
4. Sistem menentukan **Level Risiko** dari `MatriksAnalisisRisiko`
5. User dapat mengisi uraian dan efektivitas pengendalian yang ada
6. Simpan → `POST /api/analisis-risiko`

**Rumus Perhitungan:**
```
besaran = levelKemungkinan.skala × levelDampak.skala
levelRisiko = MatriksAnalisisRisiko.find(besaran)
            → Sangat Rendah (1-5), Rendah (6-10), Sedang (11-14),
              Tinggi (15-19), Sangat Tinggi (20-25)
```

**Aturan Bisnis:**
- Satu risiko hanya boleh memiliki satu analisis (relasi 1:1)
- Jika analisis sudah ada, tampilkan data untuk di-edit (PATCH)
- Warna level risiko ditampilkan sesuai definisi (Biru, Hijau, Kuning, Jingga, Merah)

---

## 7. Modul Evaluasi Risiko

### 7.1 Evaluasi & Residu

| Aspek | Detail |
|---|---|
| **ID** | F-060 |
| **Aktor** | Manajer Risiko |
| **Deskripsi** | Evaluasi risiko dan perhitungan risiko residual |

**Alur:**
1. Load daftar risiko yang sudah dianalisis
2. Tampilkan: nama risiko, level kemungkinan inheren, level dampak inheren, level risiko inheren
3. User menentukan:
   - **Respon Risiko**: dropdown (Mitigasi / Diterima / Transfer / Dihindari)
   - **Residual Level Kemungkinan**: dropdown dari `LevelKemungkinan`
   - **Residual Level Dampak**: dropdown dari `LevelDampak`
4. Sistem menghitung residual level risiko otomatis
5. Simpan → `POST /api/evaluasi-risiko`

**Aturan Bisnis:**
- Satu risiko hanya boleh memiliki satu evaluasi
- Jika evaluasi sudah ada, tampilkan untuk diedit (PATCH)
- Residual level = kemungkinan residual × dampak residual
- Perbandingan inherent vs residual ditampilkan

---

## 8. Modul Rencana Penanganan Risiko

### 8.1 Treatment Plan

| Aspek | Detail |
|---|---|
| **ID** | F-070 |
| **Aktor** | Manajer Risiko, Risk Officer |
| **Deskripsi** | Membuat rencana penanganan untuk setiap risiko |

**Form:**
| Field | Tipe | Required |
|---|---|---|
| Jenis Penanganan | Dropdown | ✅ |
| Rencana Tidak Penanganan | Textarea | ❌ |
| Target Output | Text | ✅ |
| Target Waktu | Text (date) | ✅ |
| Penanggung Jawab (PIC) | Text | ✅ |
| Residual Level Kemungkinan | Dropdown | ❌ |
| Residual Level Dampak | Dropdown | ❌ |

**Dropdown Jenis Penanganan:**
| Value | Deskripsi |
|---|---|
| Pencegahan | Tindakan preventif |
| Perbaikan | Tindakan korektif |
| Deteksi | Tindakan deteksi dini |

**Alur:**
1. Load risiko yang sudah dievaluasi
2. Isi form rencana penanganan
3. Simpan → `POST /api/rencana-penanganan`
4. Jika sudah ada, PATCH

**Aturan Bisnis:**
- Satu risiko satu rencana penanganan (relasi 1:1)
- Residual dihitung otomatis dari kemungkinan × dampak residual
- Status penanganan: Belum Dimulai, Sedang Berjalan, Selesai

---

## 9. Modul Pemantauan Risiko

### 9.1 Monitoring Risiko

| Aspek | Detail |
|---|---|
| **ID** | F-080 |
| **Aktor** | Risk Officer, Manajer Risiko |
| **Deskripsi** | Memantau realisasi penanganan risiko |
| **Trigger** | Navigasi ke `/pemantauan-risiko` |

**Tabel Pemantauan:**
| Kolom | Tipe |
|---|---|
| Risiko | Text (read-only) |
| Jenis Penanganan | Text (read-only) |
| Target Output | Text (read-only) |
| Target Waktu | Text (read-only) |
| Realisasi Output | Text (editable) |
| Realisasi Waktu | Date (editable) |
| Keterjadian Risiko | Dropdown ✅ |
| Dokumen Pendukung | File upload |
| Persetujuan | Dropdown |
| Disetujui Oleh | Text |

**Dropdown Keterjadian Risiko:**
| Value | Warna |
|---|---|
| Terjadi | Merah |
| Tidak Terjadi | Hijau |
| Berpotensi Terjadi | Kuning |

**Aturan Bisnis:**
- Pagination server-side (50 per halaman)
- Warna baris berdasarkan keterjadian risiko
- Dokumen pendukung di-upload via `/api/upload`
- Status persetujuan: Disetujui / Ditolak / Menunggu

---

## 10. Modul Key Risk Indicators (KRI)

### 10.1 CRUD KRI

| Aspek | Detail |
|---|---|
| **ID** | F-090 |
| **Aktor** | Risk Officer, Manajer Risiko |
| **Deskripsi** | Mengelola Key Risk Indicators per risiko |
| **UI** | CRUD Table (reuse `CrudTable`) |

**Fields:**
| Field | Tipe | Required |
|---|---|---|
| Nama Indikator | Text | ✅ |
| Identifikasi Risiko | Dropdown | ❌ |
| Batas Hijau | Number | ❌ |
| Batas Kuning | Number | ❌ |
| Batas Merah | Number | ❌ |
| Nilai Aktual | Number | ❌ |
| Frekuensi Pemantauan | Text | ❌ |
| Penanggung Jawab | Text | ❌ |
| Target Nilai Harapan | Number | ❌ |

**Aturan Bisnis:**
- Status otomatis berdasarkan nilai aktual vs threshold
- Nilai aktual bisa di-update terpisah
- KRI bisa tidak terikat ke risiko tertentu

---

## 11. Modul Pelaporan Risiko

### 11.1 Laporan Komprehensif

| Aspek | Detail |
|---|---|
| **ID** | F-100 |
| **Aktor** | Manajer Risiko, Eksekutif |
| **Deskripsi** | Laporan risiko dengan 24+ kolom dan ekspor Excel |

**Kolom Laporan:**
| No | Kolom | Sumber Data |
|---|---|---|
| 1 | No | Auto |
| 2 | Unit Kerja | `IdentifikasiRisiko.unitKerja` |
| 3 | Sasaran | via Kegiatan → Sasaran |
| 4 | Kegiatan | `IdentifikasiRisiko.kegiatan` |
| 5 | Risiko | `IdentifikasiRisiko.risiko` |
| 6 | Jenis Risiko | `IdentifikasiRisiko.jenisRisiko` |
| 7 | Sumber Risiko | `IdentifikasiRisiko.sumberRisiko` |
| 8 | Kategori Risiko | `IdentifikasiRisiko.kategoriRisiko` |
| 9 | Area Dampak | `IdentifikasiRisiko.areaDampak` |
| 10 | Penyebab | `IdentifikasiRisiko.penyebab` |
| 11 | Dampak | `IdentifikasiRisiko.dampak` |
| 12 | Level Kemungkinan | `AnalisisRisiko.levelKemungkinan` |
| 13 | Level Dampak | `AnalisisRisiko.levelDampak` |
| 14 | Tingkat Risiko Inheren | `AnalisisRisiko.levelRisiko` |
| 15 | Pengendalian | `AnalisisRisiko.pengendalianUraian` |
| 16 | Respon Risiko | `EvaluasiRisiko.responRisiko` |
| 17 | Residual Kemungkinan | `EvaluasiRisiko.residualLevelKemungkinan` |
| 18 | Residual Dampak | `EvaluasiRisiko.residualLevelDampak` |
| 19 | Residual Tingkat | `EvaluasiRisiko.residualLevelRisiko` |
| 20 | Jenis Penanganan | `RencanaPenanganan.jenisPenanganan` |
| 21 | Target Output | `RencanaPenanganan.targetOutput` |
| 22 | Target Waktu | `RencanaPenanganan.targetWaktu` |
| 23 | PIC | `RencanaPenanganan.penanggungJawab` |
| 24 | Realisasi | `RencanaPenanganan.realisasiOutput` |

**Ekspor Excel:**
- Klik tombol "Download Excel"
- Generate workbook dengan styling (header bold, border, column width)
- File: `Daftar-Risiko-{kode}-{date}.xlsx`

---

## 12. Modul Manajemen Pengguna

### 12.1 CRUD Users

| Aspek | Detail |
|---|---|
| **ID** | F-110 |
| **Aktor** | Admin |
| **Deskripsi** | Mengelola pengguna sistem |

**Fields:**
| Field | Tipe | Required |
|---|---|---|
| Email | Text (email) | ✅ |
| Nama | Text | ✅ |
| Role | Dropdown | ✅ |
| Password | Password | ✅ (create) / ❌ (edit) |
| Permission Override | Table (permissionId + grant/deny) | ❌ |

**Aturan Bisnis:**
- Email harus unik
- Password bisa di-reset oleh admin
- Role menentukan permission dasar
- Permission override: grant menambah, deny mencabut akses

---

### 12.2 CRUD Roles

| Aspek | Detail |
|---|---|
| **ID** | F-111 |
| **Aktor** | Admin |
| **Deskripsi** | Mengelola peran dan izin |

**Halaman Edit Role:**
- Nama role
- Matriks izin: tabel resource × action dengan checkbox
- Resource: 25 resource × 4 action (create, read, update, delete)

**Aturan Bisnis:**
- Admin role memiliki semua izin (bypass)
- Role yang sedang digunakan tidak bisa dihapus (butuh konfirmasi)
- Nama role unik

---

## 13. Modul Log Audit

### 13.1 View Audit Log

| Aspek | Detail |
|---|---|
| **ID** | F-120 |
| **Aktor** | Admin, Auditor |
| **Deskripsi** | Melihat dan memfilter log aktivitas pengguna |

**Filter:**
| Filter | Tipe |
|---|---|
| User | Dropdown |
| Aksi | Dropdown (CREATE, UPDATE, DELETE, LOGIN, dll.) |
| Resource | Dropdown |
| Rentang Tanggal | Date range picker |
| Pencarian | Text (search di details) |

**Tabel:**
| Kolom | Format |
|---|---|
| Timestamp | `DD/MM/YYYY HH:mm:ss` |
| User | Nama + email |
| Aksi | Badge berwarna |
| Resource | Text |
| Detail | Expandable JSON |

**Warna Badge Aksi:**
| Aksi | Warna |
|---|---|
| CREATE | Hijau |
| UPDATE | Biru |
| DELETE | Merah |
| LOGIN | Cyan |
| LOGOUT | Gray |
| VIEW | Default |
| DOWNLOAD | Orange |

**Ekspor CSV:**
- Klik "Export CSV"
- Download file dengan data yang sedang difilter

**Pagination:**
- 50 record per halaman (default)
- Pilihan: 10, 25, 50, 100

---

### 13.2 Audit Log Entry (Otomatis)

Setiap operasi berikut otomatis tercatat:
| Aksi | Sumber | Resource Tercatat |
|---|---|---|
| Login | `POST /api/auth/login` | `auth`, action `LOGIN` |
| Logout | Client-side → `POST /api/audit-logs/create` | `auth`, action `LOGOUT` |
| Create | `POST /api/{resource}` | Resource bersangkutan |
| Update | `PATCH /api/{resource}/{id}` | Resource bersangkutan |
| Delete | `DELETE /api/{resource}/{id}` | Resource bersangkutan |

---

## 14. Modul FAQ

### 14.1 CRUD FAQ

| Aspek | Detail |
|---|---|
| **ID** | F-130 |
| **Aktor** | Admin |
| **Deskripsi** | Mengelola Frequently Asked Questions |

**Fields:**
| Field | Tipe | Required |
|---|---|---|
| Question | Text | ✅ |
| Answer | Rich Text | ✅ |
| Order | Number | ✅ |

**Tampilan Publik:**
- Accordion style
- Urutan sesuai field `order`
- Search/filter (opsional)

---

## 15. Aturan Bisnis Global

### 15.1 Relasi 1:1 pada Inti Risiko

```
IdentifikasiRisiko ── 1:1 ── AnalisisRisiko
IdentifikasiRisiko ── 1:1 ── EvaluasiRisiko
IdentifikasiRisiko ── 1:1 ── RencanaPenanganan
IdentifikasiRisiko ── 1:N ── Kri
```

Setiap risiko hanya boleh memiliki satu analisis, satu evaluasi, dan satu rencana penanganan. Operasi `POST` pada resource yang sudah ada akan gagal (unique constraint).

### 15.2 Status Proses Risiko

| State | Transisi Ke | Kondisi |
|---|---|---|
| Teridentifikasi | Dianalisis | Memiliki AnalisisRisiko |
| Dianalisis | Dievaluasi | Memiliki EvaluasiRisiko |
| Dievaluasi | Ditangani | Memiliki RencanaPenanganan |
| Ditangani | Dipantau | Memiliki entry pemantauan |

### 15.3 Permission Default

| Role | Deskripsi |
|---|---|
| `admin` | Full akses ke semua resource & action (bypass) |
| `ketua tim` | Akses ke context, risk management, KRI, FAQ (read-only); tidak bisa akses users, roles, audit-logs |

### 15.4 Validasi Data

| Aturan | Penerapan |
|---|---|
| Unique constraint | Server-side via Prisma + database constraint |
| Required fields | Client-side (form validation) + server-side (model required) |
| Foreign key integrity | Database referential constraint |
| Data format | Client-side validation sebelum submit |

---

## 16. Matriks Resource × Action / Permission

| Resource | create | read | update | delete |
|---|---|---|---|---|
| `sasaran` | ✅ | ✅ | ✅ | ✅ |
| `prosesBisnis` | ✅ | ✅ | ✅ | ✅ |
| `pemangkuKepentingan` | ✅ | ✅ | ✅ | ✅ |
| `peraturanPerundangan` | ✅ | ✅ | ✅ | ✅ |
| `jenisRisiko` | ✅ | ✅ | ✅ | ✅ |
| `sumberRisiko` | ✅ | ✅ | ✅ | ✅ |
| `kategoriRisiko` | ✅ | ✅ | ✅ | ✅ |
| `areaDampak` | ✅ | ✅ | ✅ | ✅ |
| `levelKemungkinan` | ✅ | ✅ | ✅ | ✅ |
| `levelDampak` | ✅ | ✅ | ✅ | ✅ |
| `levelRisiko` | ✅ | ✅ | ✅ | ✅ |
| `opsiPenanganan` | ✅ | ✅ | ✅ | ✅ |
| `kriteriaKemungkinan` | ✅ | ✅ | ✅ | ✅ |
| `kriteriaDampak` | ✅ | ✅ | ✅ | ✅ |
| `seleraRisiko` | ✅ | ✅ | ✅ | ✅ |
| `identifikasiRisiko` | ✅ | ✅ | ✅ | ✅ |
| `analisisRisiko` | ✅ | ✅ | ✅ | ✅ |
| `evaluasiRisiko` | ✅ | ✅ | ✅ | ✅ |
| `rencanaPenanganan` | ✅ | ✅ | ✅ | ✅ |
| `kri` | ✅ | ✅ | ✅ | ✅ |
| `matriksAnalisisRisiko` | ✅ | ✅ | ✅ | ✅ |
| `faq` | ✅ | ✅ | ✅ | ✅ |
| `users` | ✅ | ✅ | ✅ | ✅ |
| `roles` | ✅ | ✅ | ✅ | ✅ |
| `audit-logs` | - | ✅ | - | - |
