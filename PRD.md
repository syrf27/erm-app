# Dokumen Kebutuhan Produk — Sistem Informasi Manajemen Risiko (ERM)

| **Dokumen** | Product Requirements Document (PRD) |
|---|---|
| **Produk** | Sistem Informasi Manajemen Risiko Enterprise (ERM) |
| **Versi** | 1.0 |
| **Status** | Draf |

---

## 1. Ringkasan Eksekutif

ERM App adalah sistem informasi manajemen risiko berbasis web yang selaras dengan standar **ISO 31000 / SNI 8615**. Sistem ini menyediakan alur kerja lengkap untuk mengelola risiko perusahaan — mulai dari penetapan konteks, identifikasi risiko, analisis, evaluasi, perencanaan penanganan, pemantauan, hingga pelaporan. Aplikasi ini dirancang khusus untuk penggunaan instansi pemerintah dan institusi di Indonesia, dengan antarmuka berbahasa Indonesia dan kepatuhan terhadap persyaratan regulasi.

---

## 2. Visi Produk

Menyediakan platform yang komprehensif, dapat diaudit, dan mudah digunakan yang memungkinkan organisasi untuk secara sistematis mengidentifikasi, menganalisis, mengevaluasi, menangani, dan memantau risiko sesuai dengan standar manajemen risiko internasional dan nasional, sehingga mendukung pengambilan keputusan berbasis data dan kepatuhan regulasi.

---

## 3. Tujuan & Sasaran

| Tujuan | Deskripsi |
|---|---|
| **T1** | Mendigitalkan sepenuhnya alur kerja manajemen risiko ISO 31000 / SNI 8615 |
| **T2** | Menyediakan kontrol akses berbasis peran dengan izin yang granular |
| **T3** | Menyediakan dasbor risiko real-time dengan analitik visual |
| **T4** | Memastikan jejak audit penuh untuk semua aktivitas terkait risiko |
| **T5** | Mendukung ekspor Excel/PDF untuk pelaporan regulasi |
| **T6** | Memungkinkan kolaborasi multi-pengguna lintas unit organisasi |

---

## 4. Pengguna Sasaran

| Persona | Deskripsi | Kebutuhan |
|---|---|---|
| **Petugas Risiko** | Entri data risiko harian | Entri data seperti spreadsheet, pemilihan dari data referensi |
| **Manajer Risiko** | Mengawasi analisis, evaluasi, penanganan risiko | Alur kerja, visualisasi matriks risiko, pelacakan rencana penanganan |
| **Kepala Unit** | Bertanggung jawab atas risiko di unitnya | Tampilan risiko per unit, dasbor pemantauan, alur persetujuan |
| **Eksekutif / Direksi** | Pengawasan tingkat tinggi | Dasbor eksekutif, heatmap, pemantauan selera risiko, laporan ringkasan |
| **Admin Sistem** | Manajemen pengguna, peran, dan izin | Konfigurasi RBAC, tinjauan log audit, konfigurasi sistem |
| **Auditor** | Verifikasi kepatuhan | Log audit, akses data risiko historis, pembuatan laporan |

---

## 5. Kebutuhan Fungsional

### 5.1 Penetapan Konteks

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-01 | Kelola **Unit Kerja** | P0 |
| FR-02 | Kelola **Kegiatan** | P0 |
| FR-03 | Kelola **Sasaran** | P0 |
| FR-04 | Kelola **Proses Bisnis** | P0 |
| FR-05 | Kelola **Pemangku Kepentingan** | P0 |
| FR-06 | Kelola **Peraturan Perundangan** | P0 |
| FR-07 | Kelola **Jenis Risiko** | P0 |
| FR-08 | Kelola **Sumber Risiko** | P0 |
| FR-09 | Kelola **Kategori Risiko** | P0 |
| FR-10 | Kelola **Area Dampak** | P0 |
| FR-11 | Kelola **Level Kemungkinan** | P0 |
| FR-12 | Kelola **Level Dampak** | P0 |
| FR-13 | Kelola **Level Risiko** | P0 |
| FR-14 | Kelola **Kriteria Kemungkinan** | P0 |
| FR-15 | Kelola **Kriteria Dampak** | P0 |
| FR-16 | Kelola **Selera Risiko** | P0 |
| FR-17 | Kelola **Opsi Penanganan** | P0 |

### 5.2 Identifikasi Risiko

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-18 | Entri data risiko bergaya spreadsheet menggunakan Handsontable | P0 |
| FR-19 | Validasi dropdown dari data referensi (jenis risiko, sumber, kategori, dll.) | P0 |
| FR-20 | Kemampuan simpan semua / simpan massal | P0 |
| FR-21 | Pencarian dan filter dalam spreadsheet | P0 |
| FR-22 | Penomoran otomatis ID risiko | P0 |

### 5.3 Analisis Risiko

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-23 | Penetapan skor kemungkinan dan dampak per risiko | P0 |
| FR-24 | Perhitungan otomatis **tingkat risiko inheren** (kemungkinan × dampak) | P0 |
| FR-25 | Kode warna tingkat risiko (visualisasi heatmap) | P0 |

### 5.4 Evaluasi Risiko

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-26 | Penilaian risiko residual setelah penanganan | P0 |
| FR-27 | Perbandingan risiko inheren vs residual | P0 |
| FR-28 | Keputusan respons risiko (terima/mitigasi/transfer/hindari) | P0 |

### 5.5 Rencana Penanganan Risiko

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-29 | Buat rencana penanganan per risiko yang teridentifikasi | P0 |
| FR-30 | Klasifikasi jenis penanganan (Pencegahan/Perbaikan/Deteksi) | P0 |
| FR-31 | Tetapkan PIC, jadwal, dan anggaran | P0 |
| FR-32 | Pelacakan status penanganan | P0 |

### 5.6 Pemantauan Risiko

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-33 | Pantau realisasi penanganan | P0 |
| FR-34 | Pelacakan kejadian (Terjadi/Tidak Terjadi/Berpotensi Terjadi) | P0 |
| FR-35 | Indikator status dengan kode warna | P0 |
| FR-36 | Tampilan data pemantauan dengan paginasi | P0 |

### 5.7 Indikator Risiko Utama (KRI)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-37 | Definisikan KRI per risiko | P1 |
| FR-38 | Tetapkan nilai ambang batas (hijau/kuning/merah) | P1 |
| FR-39 | Pelacakan status KRI | P1 |
| FR-40 | Visualisasi dasbor KRI | P1 |

### 5.8 Dasbor

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-41 | Kartu ringkasan KPI (total risiko, dianalisis, cakupan penanganan, jumlah KRI) | P0 |
| FR-42 | Matriks heatmap risiko (kemungkinan × dampak) | P0 |
| FR-43 | Distribusi risiko berdasarkan tingkat dengan progress bar | P0 |
| FR-44 | Perbandingan risiko inheren vs residual | P0 |
| FR-45 | Distribusi risiko berdasarkan kategori/jenis | P0 |
| FR-46 | Diagram lingkaran status KRI (hijau/kuning/merah) | P0 |
| FR-47 | Tabel risiko prioritas tertinggi | P0 |
| FR-48 | Corong proses ERM (identifikasi → analisis → evaluasi → penanganan) | P0 |

### 5.9 Pelaporan Risiko

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-49 | Laporan risiko komprehensif dengan 24+ kolom | P1 |
| FR-50 | **Ekspor Excel** (workbook Daftar Risiko) | P0 |
| FR-51 | Unduh laporan risiko berdasarkan periode/unit | P1 |
| FR-52 | Kolom laporan yang dapat dikonfigurasi | P2 |

### 5.10 Manajemen Pengguna & Akses

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-53 | Kontrol akses berbasis peran (RBAC) | P0 |
| FR-54 | Izin granular resource × action | P0 |
| FR-55 | Pengesampingan izin per pengguna (grant/deny) | P0 |
| FR-56 | CRUD pengguna dengan manajemen kata sandi | P0 |
| FR-57 | CRUD peran dengan matriks izin | P0 |
| FR-58 | Visibilitas menu berdasarkan izin | P0 |

### 5.11 Log Audit

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-59 | Pencatatan otomatis semua operasi CRUD | P0 |
| FR-60 | Catat event login/logout pengguna | P0 |
| FR-61 | Filter berdasarkan pengguna, aksi, resource, rentang tanggal | P0 |
| FR-62 | Label aksi dengan kode warna | P0 |
| FR-63 | Ekspor CSV log audit | P0 |

### 5.12 Autentikasi

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-64 | Login dengan email/kata sandi | P0 |
| FR-65 | Registrasi pengguna | P0 |
| FR-66 | Lupa kata sandi / reset kata sandi | P0 |
| FR-67 | Manajemen sesi berbasis cookie | P0 |
| FR-68 | Verifikasi autentikasi sisi server | P0 |

### 5.13 Manajemen FAQ

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-69 | CRUD FAQ dengan tampilan akordeon | P1 |
| FR-70 | Pengurutan ulang FAQ | P1 |

---

## 6. Kebutuhan Non-Fungsional

| ID | Kebutuhan | Deskripsi |
|---|---|---|
| **NFR-01** | **Kinerja** | Muat halaman < 2 detik; operasi spreadsheet < 500ms |
| **NFR-02** | **Skalabilitas** | Mendukung hingga 10.000 risiko di berbagai unit |
| **NFR-03** | **Keamanan** | RBAC, pemeriksaan izin sisi server, pencegahan SQL injection via Prisma |
| **NFR-04** | **Keandalan** | Uptime 99,9%, boundary error yang tepat, degradasi yang baik |
| **NFR-05** | **Perawatan** | Arsitektur modular, TypeScript strict mode, pengujian otomatis |
| **NFR-06** | **Kegunaan** | Mode gelap/terang, sidebar responsif, breadcrumb, notifikasi |
| **NFR-07** | **Kepatuhan** | Selaras ISO 31000 / SNI 8615, jejak audit penuh |
| **NFR-08** | **Integritas Data** | Konstrain database, transaksi Prisma, integritas referensial |
| **NFR-09** | **Dukungan Peramban** | Chrome, Firefox, Edge, Safari versi terbaru |
| **NFR-10** | **Aksesibilitas** | Standar aksesibilitas Mantine UI |

---

## 7. Arsitektur Sistem

| Lapisan | Teknologi |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Mantine UI v7 |
| **Admin Framework** | Refine v5 (CRUD, auth, routing, data fetching) |
| **Spreadsheet** | Handsontable 17 |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7.8 |
| **Auth** | Custom session berbasis cookie |
| **Authz** | RBAC dengan pengesampingan izin per pengguna |
| **Ekspor** | ExcelJS |
| **Kontainer** | Docker |

### Diagram Arsitektur (Konseptual)

```
Peramban ──▶ Next.js App Router ──▶ API Routes ──▶ Prisma ──▶ PostgreSQL
                ├── Mantine UI (komponen)
                ├── Refine (data/ auth provider)
                ├── Handsontable (identifikasi risiko)
                └── ExcelJS (ekspor laporan)
```

---

## 8. Gambaran Skema Database

Sistem menggunakan 22+ tabel PostgreSQL:

| Kategori | Tabel |
|---|---|
| **Konteks** | `UnitKerja`, `Kegiatan`, `Sasaran`, `ProsesBisnis`, `PemangkuKepentingan`, `PeraturanPerundangan` |
| **Referensi Risiko** | `JenisRisiko`, `SumberRisiko`, `KategoriRisiko`, `AreaDampak`, `LevelKemungkinan`, `LevelDampak`, `LevelRisiko`, `KriteriaKemungkinan`, `KriteriaDampak`, `SeleraRisiko`, `OpsiPenanganan` |
| **Inti Risiko** | `IdentifikasiRisiko`, `AnalisisRisiko`, `EvaluasiRisiko`, `RencanaPenanganan` |
| **Matriks Risiko** | `MatriksAnalisisRisiko` |
| **KRI** | `Kri` |
| **Keamanan** | `User`, `Role`, `Permission`, `RolePermission`, `UserPermission` |
| **Audit** | `AuditLog` |
| **Lainnya** | `Faq` |

---

## 9. Kebutuhan UI/UX

| ID | Kebutuhan | Prioritas |
|---|---|---|
| **UX-01** | Toggle mode gelap/terang | P1 |
| **UX-02** | Sidebar yang dapat diciutkan (60px / 280px) | P1 |
| **UX-03** | Navigasi breadcrumb | P1 |
| **UX-04** | Paginasi sisi server dengan pemilih ukuran halaman | P0 |
| **UX-05** | Sistem notifikasi untuk umpan balik sukses/error | P0 |
| **UX-06** | Panel perintah (kbar) untuk pengguna power | P2 |
| **UX-07** | Desain responsif untuk penggunaan desktop | P1 |
| **UX-08** | Handsontable dengan header kolom, validasi, filtering | P0 |
| **UX-09** | Status loading dan boundary error | P1 |
| **UX-10** | Status kosong dengan panduan yang membantu | P2 |

---

## 10. Kriteria Rilis

### Minimum Viable Product (MVP)

- [x] Semua kebutuhan fungsional P0 (FR-01 hingga FR-68, kecuali FR-37–FR-40)
- [x] Ekspor Excel untuk Daftar Risiko
- [x] Autentikasi dan RBAC
- [x] Log audit
- [x] Dasbor dengan KPI dan heatmap
- [x] Identifikasi risiko berbasis spreadsheet

### V2 (Mendatang)

- [ ] Pembuatan laporan PDF (format Kertas Kerja)
- [ ] Notifikasi email untuk event risiko
- [ ] Dasbor KRI tingkat lanjut
- [ ] Pemodelan skenario risiko / analisis what-if
- [ ] Integrasi dengan sistem eksternal (API)
- [ ] Dukungan multi-bahasa
- [ ] Desain responsif mobile
- [ ] Mesin alur kerja persetujuan
- [ ] Generator dokumen register risiko (Word/PDF)
- [ ] Rekomendasi skor risiko otomatis

---

## 11. Kendala & Asumsi

| ID | Kendala / Asumsi |
|---|---|
| C01 | PostgreSQL adalah database yang diperlukan (diterapkan oleh skema Prisma) |
| C02 | Aplikasi harus berjalan dalam bahasa Indonesia |
| C03 | Harus mematuhi standar ISO 31000 / SNI 8615 |
| C04 | Semua operasi terkait risiko harus dapat diaudit sepenuhnya |
| C05 | Pengguna harus login untuk mengakses halaman mana pun selain login |
| C06 | Peran Admin memiliki akses tidak terbatas ke semua resource |

---

## 12. Glosarium

| Istilah | Definisi |
|---|---|
| **ERM** | Enterprise Risk Management — Manajemen Risiko Perusahaan |
| **ISO 31000** | Standar internasional untuk manajemen risiko |
| **SNI 8615** | Standar nasional Indonesia untuk manajemen risiko |
| **KRI** | Key Risk Indicator — Indikator Risiko Utama |
| **RBAC** | Role-Based Access Control — Kontrol Akses Berbasis Peran |
| **PIC** | Person In Charge — Penanggung Jawab |
| **Risiko Inheren** | Tingkat risiko sebelum penanganan |
| **Risiko Residual** | Tingkat risiko setelah penanganan |
| **Penetapan Konteks** | Penentuan konteks organisasi dan manajemen risiko |
| **Identifikasi Risiko** | Proses menemukan, mengenali, dan mendeskripsikan risiko |
| **Analisis Risiko** | Proses memahami sifat risiko dan menentukan tingkat risiko |
| **Evaluasi Risiko** | Proses membandingkan hasil analisis dengan kriteria risiko |
| **Rencana Penanganan** | Rencana tindakan untuk menangani risiko |
| **Pemantauan Risiko** | Proses memantau risiko dan efektivitas penanganan |
| **Pelaporan Risiko** | Proses menyusun dan menyajikan laporan risiko |
| **Kertas Kerja** | Dokumen kerja risiko (template) |
| **Handsontable** | Pustaka spreadsheet JavaScript untuk entri data grid |
| **Refine** | Kerangka kerja admin berbasis React untuk operasi CRUD |
