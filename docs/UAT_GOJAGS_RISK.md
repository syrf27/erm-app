# Dokumen User Acceptance Test (UAT) — GOJAGS Risk

| Item | Keterangan |
|---|---|
| Aplikasi | GOJAGS Risk — Sistem Informasi Manajemen Risiko Enterprise (ISO 31000 / SNI 8615) |
| Basis analisis | PRD v1.2, RANCANGAN_SISTEM.md, source code (halaman, API, `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/access-control.ts`) |
| Versi dokumen | 1.0 |
| Tanggal penyusunan | 2026-09-03 |
| Status kolom Actual/Status/Evidence/Tester | **Dikosongkan — diisi oleh tester saat pengujian** |

---

## 1. Executive Summary

GOJAGS Risk adalah aplikasi web manajemen risiko end-to-end: penetapan konteks → identifikasi → analisis → evaluasi → rencana penanganan (RTP) → pemantauan realisasi + bukti dukung → pelaporan/export → repositori dokumen → audit. Login utama menggunakan **SSO GOJAGS** (bukan form email/password), hak akses dikendalikan RBAC berbasis role + permission granular + user override (grant/deny).

Dokumen UAT ini disusun dari **implementasi aktual di source code**, bukan dari nama menu. Total **63 test case** dalam 16 kelompok modul (UAT-001 s.d. UAT-154, nomor berkelompok per modul) dan **4 skenario end-to-end**, mencakup positive, negative, boundary, role/permission, integrasi, dan error/recovery.

Temuan penting yang memengaruhi cakupan UAT (detail di Bagian 15):

1. **Role `pimpinan` (PRD §4) tidak ada di implementasi** — seed dan rancangan hanya memuat `admin`, `ketua tim`, `anggota tim`. UAT dijalankan terhadap 3 role aktual.
2. **Tidak ada pembatasan data per tim/unit** — semua role non-admin melihat seluruh data organisasi (kode TODO di `access-control.ts`), berbeda dengan PRD §4.1.
3. `register`, `reset password`, modul **KRI**, dan form login email/password **tidak tersedia di UI** (KRI disembunyikan dari menu).
4. Beberapa fitur terimplementasi tanpa requirement eksplisit di PRD (Bank Risiko AI, Pusat Notifikasi, visualisasi perpindahan matriks) dan sebaliknya beberapa requirement PRD parsial (preview inline, validasi keberadaan relasi referensi).

---

## 2. Daftar Modul & Fitur

| # | Modul | Tujuan | Role Pengguna | Input | Proses | Output | Dependensi |
|---|---|---|---|---|---|---|---|
| 1 | Autentikasi & Sesi | Mengautentikasi pengguna via SSO GOJAGS; menyimpan sesi & permission | Semua role | Kredensial GOJAGS | Redirect ke IdP GOJAGS → callback → set cookie `auth` (30 hari) + daftar permission | Sesi login, profil, permission | IdP GOJAGS (gojags-api.bps.go.id), data User/Role di DB |
| 2 | Dashboard | Ringkasan eksekutif risiko | Semua role | Data risiko semua tahap | Agregasi server-side (cache) | KPI Total Risiko/Dianalisis/Rencana Penanganan, heatmap inheren 5×5, distribusi level, inheren vs residual, top risiko, funnel proses MR | Identifikasi, Analisis, Evaluasi, Rencana |
| 3 | Penetapan Konteks | Kelola 17 data referensi/master (Tim Kerja, Kegiatan, Sasaran, Proses Bisnis, Pemangku Kepentingan, Peraturan, Jenis/Sumber/Kategori Risiko, Area Dampak, Level Kemungkinan/Dampak/Risiko, Kriteria Kemungkinan/Dampak, Matriks Risiko, Opsi Penanganan) | Admin, Ketua Tim, Anggota Tim (CRUD penuh sesuai seed) | Nilai tiap field referensi | CRUD via modal (Tambah/Edit/Hapus + konfirmasi) | Data master siap dipakai modul lain | — (fondasi semua modul) |
| 4 | Identifikasi Risiko | Mencatat risiko, penyebab, dampak + relasi konteks | Admin, Ketua Tim, Anggota Tim | Spreadsheet (Handsontable): Sasaran→Kegiatan→Proses Bisnis→Risiko→Jenis→Sumber→Kategori→Area Dampak→Penyebab→Dampak; import Excel; import dari Bank Risiko | Entri sel-per-sel dengan cascade; Simpan Semua (POST/PATCH); import template Excel (maks 500 baris) | Daftar risiko bertahun (2020–2030) dengan ID sistem | Data referensi (master), Bank Risiko, filter tahun global |
| 5 | Analisis Risiko | Menilai risiko inheren + pengendalian | Admin, Ketua Tim, Anggota Tim | Level Kemungkinan, Level Dampak, Uraian Pengendalian, Efektivitas | Besaran = K × D (matriks 5×5); Level Risiko otomatis (1–5 Sangat Rendah … 20–25 Sangat Tinggi) | Data analisis inheren per risiko | Identifikasi, master Level Kemungkinan/Dampak/Matriks |
| 6 | Evaluasi Risiko | Menilai residual & menentukan respon | Admin, Ketua Tim, Anggota Tim | Level K & D residual, Respon Risiko (Mengurangi/Mengalihkan/Menghindari/Menerima) | Hitung residual dari matriks; ranking prioritas global (besaran inheren desc) | Data residual + respon risiko + prioritas | Analisis, master Level & Matriks |
| 7 | Rencana Penanganan (RTP) | Menyusun rencana mitigasi | Admin, Ketua Tim, Anggota Tim | Rencana RTP, Jenis Penanganan, Target Output, Target Waktu (tanggal), PIC (Tim Kerja), residual | Hanya risiko ber-respon "Mengurangi Risiko" yang tampil; 1 RTP per risiko | RTP siap dipantau | Evaluasi (respon), master Tim Kerja, Level |
| 8 | Matriks Risiko | Visualisasi posisi risiko & perpindahan A→R | Semua role | Pilihan risiko (multi-select) | Render heatmap 5×5 + panah Aktual→Residual | Visualisasi perpindahan risiko | Analisis, Evaluasi |
| 9 | Pemantauan Risiko | Mencatat realisasi mitigasi + bukti dukung | Admin, Ketua Tim, Anggota Tim | Keterjadian (Terjadi/Tidak Terjadi), Realisasi Waktu, Realisasi Output, Dokumen Pendukung (link URL / upload berkas); pencarian rapat GOJAGS Office | Simpan realisasi; upload berkas (maks 5 MB); ambil PDF presensi rapat GOJAGS (maks 10 MB, validasi PDF) | Realisasi terisi; DokumenPendukung → otomatis masuk Repositori sebagai "Bukti Dukung Mitigasi" | RTP (respon mengurangi), layanan upload, integrasi GOJAGS Office, Repositori |
| 10 | Pelaporan Risiko | Rekap lengkap + export + persetujuan | Semua role (persetujuan sesuai permission) | Filter tahun; aksi Unduh Excel; modal Persetujuan (Draft/Disetujui/Ditolak + Disetujui Oleh) | Render tabel mega 35+ kolom; export Excel client-side (ExcelJS); simpan persetujuan | File `Laporan_Pelaporan_Risiko_YYYY-MM-DD.xlsx`; status persetujuan RTP | Semua modul risiko |
| 11 | Bank Risiko | Pencarian risiko (semantik AI + fallback teks) | Semua role | Kata kunci bebas, Limit (5–100), tahun | Pencarian semantik (embedding + pgvector, tampil Skor %) dengan fallback trgm/ILIKE | Daftar risiko relevan + aksi "Tambah ke Identifikasi Risiko" | Identifikasi, GEMINI_API_KEY, pgvector |
| 12 | Repositori Dokumen | Kelola dokumen pedoman/laporan + bukti dukung mitigasi | Admin/Ketua/Anggota (baca semua); tulis dokumen manual sesuai permission; edit/hapus: pemilik uploader atau admin | Judul (wajib), kategori (Pedoman/Laporan), file atau tautan; ringkasan AI | Gabungan tabel Repositori + DokumenPendukung; filter kategori/tahun/pencarian; Ringkasan AI (PDF/txt); buka dokumen di tab baru | Repositori dokumen terpadu | Upload API, layanan AI ringkasan, Pemantauan (bukti_dukung) |
| 13 | Manajemen Pengguna | Kelola akun, role, tim, permission override | Admin | Nama, Email, Role, Unit Kerja/Tim, Password (min 8) | CRUD user; override permission per user (Inherit/Grant/Deny); proteksi hapus diri sendiri | Akun + hak akses efektif | Role, Permission, Team |
| 14 | Role Permissions | Atur permission per role | Admin | Toggle matriks role × resource × aksi; tambah role | Simpan langsung per toggle | Perubahan hak akses role (berlaku ke menu & API) | Permission |
| 15 | Audit Log | Jejak aktivitas | Admin | Filter user/action/resource/tanggal; pencarian | Tampil log; export CSV | Bukti audit operasi penting | AuditLog (tercatat otomatis dari API) |
| 16 | Pusat Notifikasi | Mengingatkan RTP belum realisasi | Admin (butuh permission users:update) | Aksi "Ingatkan" per baris / "Ingatkan Semua" | Kirim push notification ke anggota Tim Kerja terkait | Notifikasi terkirim; daftar RTP belum realisasi | RTP, layanan notifikasi/FCM |
| 17 | FAQ | Tanya-jawab pengguna | Admin (CRUD), Ketua/Anggota (baca) | Pertanyaan & jawaban (rich text) | Accordion + pencarian + pagination | Konten FAQ | — |

Tidak dijadikan objek UAT (sisa scaffold / dinonaktifkan): `/blog-posts`, `/categories`, `/register`, `/forgot-password`, halaman `/manajemen-risiko/pelaporan` (duplikat lama), endpoint export lama (`download-daftar-risiko`, file `.bak`), halaman `/kri` (ada via URL langsung namun menu disembunyikan — diuji terbatas pada UAT-059).

---

## 3. Role & Permission Matrix

> **Sumber**: `prisma/seed.ts` + `src/lib/access-control.ts`. Role aktual: **admin, ketua tim, anggota tim** (role `pimpinan` dari PRD tidak diimplementasi — lihat Bagian 15). Admin bypass semua pemeriksaan. Urutan evaluasi: deny override → grant override → hak baca umum (repositori/upload) → role permission.

| Role | Modul/Fitur | View | Create | Edit | Delete | Approve/Submit | Export | Keterangan |
|---|---|---|---|---|---|---|---|---|
| Admin | Semua modul | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Bypass penuh; satu-satunya yang melihat Audit Log, Pengguna, Role Permissions, Pusat Notifikasi |
| Ketua Tim | Penetapan Konteks, Identifikasi, Analisis, Evaluasi, Rencana, Matriks, Pemantauan, Pelaporan, Bank Risiko | ✓ | ✓ | ✓ | ✓ | ✓ (persetujuan di Pelaporan) | ✓ (Excel) | Hak identik anggota tim di seed; tidak ada batasan data per tim (lihat Gap) |
| Ketua Tim | Repositori Dokumen, FAQ | ✓ | — | — | — | — | — | Hanya baca (tombol tulis disembunyikan; API menolak 403) |
| Ketua Tim | Audit Log, Pengguna, Role Permissions, Pusat Notifikasi | — | — | — | — | — | — | Menu tersembunyi; akses URL langsung → "Akses Ditolak" + redirect ke Dashboard; API 403 |
| Anggota Tim | (sama dengan Ketua Tim pada semua baris di atas) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Seed identik dengan Ketua Tim — **Perlu Konfirmasi** apakah memang disengaja |
| Semua role terautentikasi | Baca Repositori & file (upload) | ✓ | — | — | — | — | — | Hardcoded di `access-control.ts` (`AUTHENTICATED_READ_RESOURCES`) |

Export yang tersedia: Excel Pelaporan Risiko (semua role), CSV Audit Log (admin), template Excel Identifikasi (semua role).

---

## 4. User Journey

**Alur utama proses bisnis risiko:**

```
Login SSO GOJAGS
→ Dashboard (ringkasan)
→ (Admin/Tim) Penetapan Konteks: siapkan data referensi
→ Identifikasi Risiko: entri spreadsheet / import Excel / ambil dari Bank Risiko
→ Analisis Risiko: kemungkinan × dampak → besaran & level inheren
→ Evaluasi Risiko: residual + respon risiko
→ Rencana Penanganan: RTP untuk risiko "Mengurangi"
→ Pemantauan Risiko: realisasi + upload bukti / presensi GOJAGS Office
→ (otomatis) Bukti dukung muncul di Repositori Dokumen
→ Pelaporan Risiko: set persetujuan → Unduh Excel
→ Admin: Audit Log & Pusat Notifikasi (monitoring ketepatan)
```

**Journey per role:**

- **Admin**: Login → Dashboard → kelola master konteks → kelola user/role/permission → kirim pengingat notifikasi → pantau audit log → export laporan.
- **Ketua Tim**: Login → Dashboard → entri/verifikasi identifikasi tim → analisis → evaluasi → susun RTP → pantau realisasi & bukti → set persetujuan → export Excel.
- **Anggota Tim**: Login → Dashboard → input identifikasi → analisis → evaluasi → RTP → isi realisasi + upload bukti → pantau status.

---

## 5. Business Process

| ID | Proses Bisnis | Aktor | Kondisi Awal | Aktivitas Utama | Output | Kondisi Akhir |
|---|---|---|---|---|---|---|
| BP-01 | Persiapan data referensi (konteks) | Admin / Ketua Tim / Anggota Tim | Data master kosong/sebagian ada | Mengelola 17 tab data referensi di Penetapan Konteks | Master lengkap (level, matriks, tim kerja, dll.) | Referensi siap dipakai identifikasi & analisis |
| BP-02 | Identifikasi risiko | Admin / Ketua Tim / Anggota Tim | Data referensi tersedia; tahun kerja dipilih | Entri spreadsheet / import Excel / pilih dari Bank Risiko | Risiko tercatat dengan relasi konteks & tahun | Daftar risiko tahun berjalan terisi |
| BP-03 | Analisis risiko inheren | Admin / Ketua Tim / Anggota Tim | Risiko sudah diidentifikasi | Isi level kemungkinan & dampak + pengendalian | Besaran & level inheren otomatis | Semua risiko yang dianalisis memiliki level inheren |
| BP-04 | Evaluasi & respon risiko | Admin / Ketua Tim / Anggota Tim | Analisis inheren tersedia | Isi residual + pilih respon risiko | Residual + respon + ranking prioritas | Risiko terklasifikasi tindak lanjut |
| BP-05 | Penyusunan rencana penanganan | Admin / Ketua Tim / Anggota Tim | Risiko ber-respon "Mengurangi" | Isi RTP, target output/waktu, PIC, residual | RTP tersimpan (1 per risiko) | RTP siap dipantau; notifikasi terkirim |
| BP-06 | Pemantauan realisasi & bukti dukung | Admin / Ketua Tim / Anggota Tim | RTP tersedia | Isi realisasi + upload bukti / presensi GOJAGS | Realisasi terisi; dokumen pendukung tersimpan | Bukti muncul di Repositori (bukti_dukung) |
| BP-07 | Pelaporan & persetujuan | Admin / Ketua Tim / Anggota Tim | Data risiko lengkap | Set persetujuan; unduh Excel | Status persetujuan RTP; file Excel | Laporan siap dipakai manajemen |
| BP-08 | Administrasi sistem | Admin | User & role terdefinisi | Kelola user/role/permission override | Hak akses efektif berubah | Akses sesuai kebijakan; tercatat di audit log |

---

## 6. UAT Scenario

### 6.1 Positive Scenario (alur normal)
- UAT-001 Login SSO GOJAGS; UAT-002 logout.
- UAT-010 CRUD data referensi; UAT-011 validasi referensi unik.
- UAT-020 entri identifikasi spreadsheet; UAT-021 cascade + auto-fill; UAT-022 import Excel; UAT-023 unduh template; UAT-024 filter tahun.
- UAT-030 analisis inheren; UAT-031 perhitungan besaran & level.
- UAT-040 evaluasi residual + respon; UAT-041 ranking prioritas.
- UAT-050 pembuatan RTP; UAT-051 hanya respon "mengurangi".
- UAT-060 matriks visualisasi; UAT-061 perpindahan A→R.
- UAT-070 realisasi pemantauan; UAT-071 upload bukti; UAT-072 tampil di Repositori; UAT-073 presensi GOJAGS Office.
- UAT-080 export Excel pelaporan; UAT-081 persetujuan.
- UAT-090 pencarian Bank Risiko semantik; UAT-091 tambah ke identifikasi.
- UAT-100 upload dokumen repositori; UAT-101 ringkasan AI; UAT-102 filter/kategori.
- UAT-110 buat user; UAT-111 permission override; UAT-112 role permission toggle.
- UAT-120 audit log & export CSV; UAT-130 pengingat notifikasi; UAT-140 CRUD FAQ.

### 6.2 Negative Scenario
- UAT-003 akses tanpa login; UAT-004 akses menu tanpa permission (URL langsung); UAT-005 API tanpa permission (403).
- UAT-012 field wajib kosong (master konteks); UAT-013 nama duplikat referensi unik.
- UAT-025 simpan baris identifikasi tanpa FK wajib (Jenis/Sumber/Kategori/Area).
- UAT-026 import Excel salah format/kolom; UAT-027 import melebihi 500 baris; UAT-028 referensi tak dikenal di import.
- UAT-052 RTP: kolom wajib kosong.
- UAT-074 keyword rapat < 2 karakter; UAT-075 GOJAGS Office tidak tersedia.
- UAT-092 Bank Risiko: keyword tidak ditemukan / API key embedding tidak tersedia.
- UAT-103 upload repositori tanpa judul / tanpa file & link.
- UAT-113 password user < 8 karakter; UAT-114 email duplikat.
- UAT-121 hapus user diri sendiri (dicegah).

### 6.3 Boundary Scenario
- UAT-029 tahun di luar 2020–2030 (identifikasi).
- UAT-032 teks risiko/penyebab/dampak 5000+ karakter (server menolak).
- UAT-076 ukuran file bukti dukung tepat 5 MB vs > 5 MB.
- UAT-077 PDF presensi GOJAGS tepat 10 MB vs > 10 MB vs bukan PDF.
- UAT-093 Limit Bank Risiko 5 (min) / 100 (maks) / di luar rentang.
- UAT-115 jumlah import tepat 500 baris (diterima) — pasangan UAT-027 (>500 ditolak).

### 6.4 Role & Permission Scenario
- UAT-004, UAT-005 (di atas); UAT-111 (override deny menutup hak role); UAT-112 (perubahan role permission berpengaruh ke menu & akses).
- UAT-104 Ketua Tim/Anggota tidak dapat tambah/edit/hapus dokumen repositori; UAT-141 Ketua/Anggota hanya baca FAQ.

### 6.5 End-to-End Scenario → lihat Bagian 8 (E2E-001 s.d. E2E-004).

### 6.6 Error & Recovery Scenario
- UAT-075 (GOJAGS Office gagal) — alur tetap bisa upload/link manual.
- UAT-092 (embedding gagal → fallback teks).
- UAT-150 sesi berakhir/cookie dihapus di tengah penggunaan → redirect ke login; data terakhir tersimpan aman setelah simpan sukses.
- UAT-151 refresh halaman setelah "Simpan Semua" → data tetap tampil.
- UAT-152 upload gagal di tengah proses (file terlalu besar / jaringan) → notifikasi gagal, tidak ada dokumen setengah jadi.
- UAT-153 ringkasan AI gagal (file bukan PDF/txt) → pesan error, record dokumen tidak rusak.
- UAT-154 delete dokumen dengan file fisik hilang → record tetap terhapus tanpa error fatal.

---

## 7. Detailed UAT Test Cases

> Kolom **Actual Result, Status, Evidence, Catatan** sengaja kosong untuk tester. P = Pengguna. "Tahun kerja" merujuk filter tahun global di sidebar.

| No | ID UAT | Modul | Skenario Pengujian | Role | Precondition | Langkah Pengujian | Data Uji | Expected Result | Actual Result | Status | Evidence | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | UAT-001 | Autentikasi | Pengguna dapat masuk aplikasi menggunakan akun GOJAGS (SSO) | Semua | Akun GOJAGS valid; kredensial GOJAGS tersedia; user sudah dibuat di aplikasi dengan role sesuai | 1. Buka URL aplikasi. 2. Klik tombol login SSO GOJAGS. 3. Masukkan kredensial di halaman GOJAGS. 4. Kembalilah otomatis ke aplikasi | Akun SSO GOJAGS uji | Diarahkan ke halaman GOJAGS lalu kembali ke Dashboard; nama pengguna tampil di pojok kanan atas; menu tampil sesuai role | | | | |
| 2 | UAT-002 | Autentikasi | Pengguna dapat keluar dari aplikasi dengan konfirmasi | Semua | Sudah login | 1. Klik menu profil (pojok kanan atas). 2. Pilih "Logout". 3. Konfirmasi pada modal "Konfirmasi Logout" | — | Kembali ke halaman login; saat membuka URL aplikasi lagi diminta login ulang | | | | |
| 3 | UAT-003 | Autentikasi | Pengguna yang belum login tidak dapat membuka halaman aplikasi | Semua | Belum login / sesi terhapus | 1. Buka URL aplikasi tanpa login (atau hapus cookie lalu buka) | — | Diarahkan ke halaman login, tidak ada data risiko yang tampil | | | | |
| 4 | UAT-004 | Hak Akses | Pengguna tidak dapat membuka halaman admin lewat URL langsung tanpa hak | Ketua Tim | Login sebagai Ketua Tim | 1. Ketik URL `/users` di address bar. 2. Ulangi untuk `/roles` dan `/audit-log` | — | Tampil notifikasi "Akses Ditolak" dan diarahkan ke Dashboard; menu admin tidak muncul di sidebar | | | | |
| 5 | UAT-005 | Hak Akses | Aksi admin ditolak untuk pengguna tanpa hak (API) | Ketua Tim | Login sebagai Ketua Tim; browser punya devtools | 1. Buka halaman FAQ. 2. Coba aksi tambah FAQ melalui UI (tombol tidak ada), lalu verifikasi juga tidak ada tombol Pengguna/Role di sidebar | — | Tidak ada tombol aksi tulis; (opsional teknis: panggilan API tanpa permission mengembalikan pesan akses ditolak) | | | | |
| 6 | UAT-010 | Penetapan Konteks | Pengguna dapat menambah data referensi baru | Admin | Login; data referensi belum ada | 1. Buka menu Manajemen Risiko → Penetapan Konteks. 2. Pilih tab "Tim Kerja". 3. Klik "Tambah". 4. Isi nama & kode. 5. Simpan | Tim Kerja: nama "Tim UAT", kode "TIM_UAT" | Data baru muncul di daftar tab terkait | | | | |
| 7 | UAT-011 | Penetapan Konteks | Pengguna dapat mengubah dan menghapus data referensi | Admin | Data UAT-010 ada | 1. Pilih tab "Tim Kerja". 2. Edit "Tim UAT" → ubah nama. 3. Simpan. 4. Hapus data tersebut. 5. Konfirmasi hapus | "Tim UAT" | Nama berubah di daftar; setelah hapus data tidak ada lagi (muncul konfirmasi sebelum hapus) | | | | |
| 8 | UAT-012 | Penetapan Konteks | Sistem menolak penyimpanan jika field wajib kosong | Admin | Login | 1. Buka tab "Tim Kerja". 2. Klik "Tambah". 3. Kosongkan semua field. 4. Simpan | — | Form tidak tersimpan; field wajib ditandai wajib diisi | | | | |
| 9 | UAT-013 | Penetapan Konteks | Sistem menolak nama referensi yang sama (duplikat) | Admin | "Tim UAT" sudah ada | 1. Tambah Tim Kerja baru dengan nama & kode sama persis dengan data yang sudah ada. 2. Simpan | nama "Tim UAT", kode "TIM_UAT" | Penyimpanan gagal dengan pesan kegagalan; tidak ada baris ganda di daftar | | | | |
| 10 | UAT-020 | Identifikasi Risiko | Pengguna dapat mencatat risiko baru melalui tabel spreadsheet | Admin | Data referensi tersedia; tahun kerja dipilih | 1. Buka Manajemen Risiko → Identifikasi Risiko. 2. Isi baris baru: Sasaran → Kegiatan → Proses Bisnis → Risiko → Jenis Risiko → Sumber Risiko → Kategori → Area Dampak → Penyebab → Dampak. 3. Klik "Simpan Semua" | Sasaran "Meningkatnya kualitas layanan"; Kegiatan bebas dari daftar; Risiko "Keterlambatan pelaporan data"; referensi dari daftar; Penyebab "SDM terbatas"; Dampak "Laporan terlambat" | Notifikasi tersimpan; setelah halaman dimuat ulang baris tetap ada dan memiliki ID sistem | | | | |
| 11 | UAT-021 | Identifikasi Risiko | Kolom terkunci berurutan dan terisi otomatis saat memilih Kegiatan | Admin | Halaman identifikasi terbuka | 1. Coba isi kolom "Risiko" sebelum memilih Sasaran/Kegiatan. 2. Pilih Kegiatan terlebih dahulu. 3. Perhatikan kolom Sasaran & Proses Bisnis. 4. Isi baris lengkap lalu Simpan Semua | Kegiatan apa pun dari daftar | Kolom tidak bisa diisi sebelum kolom sebelumnya terisi; Sasaran & Proses Bisnis terisi otomatis dari Kegiatan; data tersimpan | | | | |
| 12 | UAT-022 | Identifikasi Risiko | Pengguna dapat mengimpor daftar risiko dari file Excel | Admin | Template telah diunduh dan diisi | 1. Klik "Import Excel". 2. Pilih file Excel berisi ±3 risiko (2 baru, 1 dengan ID Sistem terisi untuk pembaruan). 3. Periksa ringkasan "Hasil Import Excel" | File Excel sesuai template: 2 baris baru + 1 baris update | Ringkasan menampilkan "2 dibuat / 1 diperbarui / 0 gagal / 3 total baris"; data muncul di tabel | | | | |
| 13 | UAT-023 | Identifikasi Risiko | Pengguna dapat mengunduh template Excel identifikasi | Admin | Tahun kerja dipilih | 1. Klik "Unduh Template". 2. Buka file yang terunduh | — | File .xlsx terunduh berisi kolom sesuai template (termasuk "ID Sistem") dan sheet Petunjuk; data risiko tahun terpilih ikut terisi | | | | |
| 14 | UAT-024 | Identifikasi Risiko | Pengguna dapat memfilter daftar risiko berdasarkan rentang tahun | Admin | Risiko tahun 2025 dan 2026 ada | 1. Pada sidebar, atur filter tahun: Dari 2025 Sampai 2025. 2. Buka Identifikasi Risiko. 3. Ubah ke 2026 | 2025, 2026 | Daftar hanya menampilkan risiko pada rentang tahun yang dipilih | | | | |
| 15 | UAT-025 | Identifikasi Risiko | Baris tanpa referensi wajib tidak tersimpan diam-diam / memberi indikasi | Admin | Halaman identifikasi terbuka | 1. Isi baris: Risiko dan Penyebab saja (kosongkan Jenis/Sumber/Kategori/Area Dampak). 2. Klik "Simpan Semua". 3. Muat ulang halaman | Baris tanpa 4 referensi wajib | Perilaku aktual dicatat: baris tidak tersimpan di server. **Perlu Konfirmasi** apakah boleh tanpa pesan per baris (bug UX jika tidak ada indikasi sama sekali) | | | | |
| 16 | UAT-026 | Identifikasi Risiko | Impor ditolak bila file bukan Excel/CSV yang sesuai template | Admin | Siapkan file salah format | 1. Klik "Import Excel". 2. Pilih file .xlsx kosong tanpa kolom template. 3. Periksa hasil | File Excel acak | Impor gagal dengan pesan header template tidak sesuai; tidak ada data dibuat | | | | |
| 17 | UAT-027 | Identifikasi Risiko | Impor ditolak bila melebihi 500 baris | Admin | Siapkan Excel 501 baris data | 1. Klik "Import Excel". 2. Pilih file 501 baris. 3. Periksa pesan | Excel 501 baris data | Impor ditolak dengan pesan batas 500 baris per impor | | | | |
| 18 | UAT-028 | Identifikasi Risiko | Impor menolak baris dengan nama referensi yang tidak dikenal | Admin | Siapkan Excel dengan referensi salah tulis | 1. Isi kolom Jenis Risiko "Negatip" (salah tulis). 2. Impor. 3. Periksa ringkasan | Jenis Risiko: "Negatip" | Ringkasan menampilkan baris gagal dengan alasan referensi tidak dikenal; baris lain tetap berhasil | | | | |
| 19 | UAT-029 | Identifikasi Risiko | Tahun di luar 2020–2030 ditolak | Admin | Siapkan Excel/entri dengan tahun 2019 atau 2031 | 1. Isi/impor baris dengan tahun 2019. 2. Simpan/impor | tahun 2019 | Server menolak dengan pesan validasi; risiko tidak tersimpan | | | | |
| 20 | UAT-030 | Analisis Risiko | Pengguna dapat mengisi analisis risiko inheren | Admin | Risiko sudah diidentifikasi | 1. Buka Analisis Risiko. 2. Pilih Level Kemungkinan "Sering Terjadi" (4) dan Level Dampak "Signifikan" (4). 3. Isi Uraian Pengendalian dan Efektivitas. 4. Klik "Simpan Semua" | K=4, D=4, Uraian "SOP pelaporan", Efektivitas "kurang efektif" | Tersimpan; kolom readonly menampilkan Besaran dan Level Risiko otomatis | | | | |
| 21 | UAT-031 | Analisis Risiko | Besaran dan level risiko dihitung otomatis sesuai matriks | Admin | UAT-030 selesai | 1. Isi beberapa kombinasi: K=1,D=1; K=5,D=5; K=3,D=3; K=4,D=5. 2. Simpan. 3. Periksa kolom Besaran & Level | Kombinasi di atas | K1×D1=1 (Sangat Rendah), K5×D5=25 (Sangat Tinggi), K3×D3=14 (Sedang), K4×D5=24 (Sangat Tinggi) sesuai matriks 5×5; warna level sesuai kategori | | | | |
| 22 | UAT-032 | Analisis Risiko | Teks lebih dari 5000 karakter ditolak server | Admin | Siapkan teks panjang | 1. Isi Uraian Pengendalian dengan teks > 5000 karakter (paste). 2. Simpan Semua | Teks 5001+ karakter | Server menolak dengan pesan validasi; baris tidak tersimpan | | | | |
| 23 | UAT-040 | Evaluasi Risiko | Pengguna dapat mengisi risiko residual dan respon risiko | Admin | Analisis tersedia | 1. Buka Evaluasi Risiko. 2. Isi Level K & D residual (mis. 2 & 3). 3. Pilih Respon "Mengurangi Risiko". 4. Simpan Semua | Residual K=2, D=3; respon Mengurangi | Tersimpan; Level & Besaran residual tampil otomatis; daftar terurut prioritas tertinggi di atas | | | | |
| 24 | UAT-041 | Evaluasi Risiko | Prioritas risiko terurut dari besaran tertinggi | Admin | Beberapa risiko dengan besaran berbeda | 1. Perhatikan urutan baris & kolom Prioritas di Evaluasi/Analisis | — | Risiko dengan besaran inheren tertinggi menempati prioritas teratas | | | | |
| 25 | UAT-050 | Rencana Penanganan | Pengguna dapat menyusun rencana tindak penanganan (RTP) | Admin | Risiko dengan respon "Mengurangi" ada | 1. Buka Rencana Penanganan. 2. Isi Rencana RTP, Jenis Penanganan, Target Output, Target Waktu, Penanggung Jawab. 3. Simpan Semua | Rencana "Menambah SDM pelaporan"; Target Output "Laporan tepat waktu"; Target Waktu 31-12-2026; PIC Tim terdaftar | Tersimpan; kolom Prioritas & Risiko readonly tetap tampil; data tampil di Pemantauan Risiko | | | | |
| 26 | UAT-051 | Rencana Penanganan | Hanya risiko ber-respon "Mengurangi" muncul di Rencana Penanganan | Admin | Ada risiko respon "Menerima" dan "Mengurangi" | 1. Di Evaluasi Risiko, set risiko A "Menerima Risiko". 2. Buka Rencana Penanganan | Risiko A (menerima), Risiko B (mengurangi) | Risiko A tidak tampil di daftar RTP; hanya risiko "mengurangi" yang dapat diberi RTP | | | | |
| 27 | UAT-052 | Rencana Penanganan | RTP dengan kolom tanggal tidak valid tidak tersimpan | Admin | Halaman RTP terbuka | 1. Isi RTP tanpa Target Waktu / dengan teks pada kolom tanggal. 2. Simpan Semua | Target Waktu kosong | Penyimpanan kolom tanggal gagal/divalidasi; perilaku sistem tercatat (pesan atau kolom diabaikan) — catat sebagai temuan bila data salah tetap masuk | | | | |
| 28 | UAT-060 | Matriks Risiko | Pengguna dapat melihat posisi risiko pada matriks 5×5 | Admin | Analisis tersedia | 1. Buka Matriks Risiko. 2. Periksa posisi risiko pada sel K×D. 3. Cari risiko di tabel daftar | — | Risiko tampil pada sel yang benar sesuai K dan D; kartu ringkasan Aktual/Residual konsisten dengan data analisis | | | | |
| 29 | UAT-061 | Matriks Risiko | Panah perpindahan Aktual → Residual tampil untuk risiko terpilih | Admin | Risiko punya data aktual & residual | 1. Pilih risiko di tabel daftar (centang). 2. Perhatikan panah pada matriks | — | Panah menghubungkan sel aktual (A) ke sel residual (R); bisa multi-pilih risiko | | | | |
| 30 | UAT-070 | Pemantauan Risiko | Pengguna dapat mengisi realisasi pemantauan | Admin | RTP tersedia | 1. Buka Pemantauan Risiko. 2. Klik ikon pensil "Update Realisasi". 3. Pilih Keterjadian "Tidak Terjadi", isi Realisasi Waktu & Output. 4. Klik "Simpan Realisasi" | Keterjadian "Tidak Terjadi"; Waktu 30-06-2026; Output "Laporan terbit tepat waktu" | Tersimpan; tabel Pemantauan menampilkan realisasi baru | | | | |
| 31 | UAT-071 | Pemantauan Risiko | Pengguna dapat mengunggah dokumen bukti pendukung | Admin | Modal realisasi terbuka | 1. Di modal, klik "+ Tambah Dokumen". 2. Pilih metode "Upload Berkas", pilih PDF ≤ 5 MB. 3. Isi judul. 4. Simpan Realisasi | PDF uji 2 MB, judul "Bukti Sosialisasi SOP" | Upload sukses; dokumen tampil pada kolom Dokumen Pendukung baris terkait | | | | |
| 32 | UAT-072 | Pemantauan Risiko | Bukti dukung otomatis muncul di Repositori sebagai "Bukti Dukung Mitigasi" | Admin | UAT-071 sukses | 1. Buka Repositori Dokumen. 2. Buka folder "Bukti Dukung Mitigasi". 3. Cari judul dokumen | — | Dokumen tampil dengan kategori Bukti Dukung Mitigasi beserta risiko terkait | | | | |
| 33 | UAT-073 | Pemantauan Risiko | Pengguna dapat mengambil daftar hadir rapat dari GOJAGS Office | Admin | Integrasi GOJAGS Office aktif (API key terpasang); modal realisasi terbuka | 1. Di panel "Ambil Daftar Hadir dari GOJAGS Office", ketik kata kunci agenda. 2. Klik "Cari". 3. Pilih rapat → "Tambahkan Presensi". 4. Simpan Realisasi | Keyword "mitigasi risiko" | Hasil pencarian menampilkan agenda, tanggal-jam, pemimpin, ruangan, status, jumlah peserta; PDF daftar hadir tersimpan sebagai dokumen "Daftar Hadir - {agenda}" dan tampil di daftar dokumen | | | | |
| 34 | UAT-074 | Pemantauan Risiko | Pencarian rapat menolak keyword kurang dari 2 karakter | Admin | Panel GOJAGS terbuka | 1. Ketik 1 karakter (mis. "a"). 2. Klik "Cari" | "a" | Muncul pesan "Masukkan minimal 2 karakter keyword rapat"; pencarian tidak dijalankan | | | | |
| 35 | UAT-075 | Pemantauan Risiko | Layanan GOJAGS Office tidak tersedia: pesan jelas dan alur manual tetap bisa | Admin | Simulasi: API key salah/layanan mati (koordinasi admin) | 1. Cari rapat seperti UAT-073. 2. Amati pesan. 3. Tetap lakukan upload berkas manual | — | Tampil pesan kegagalan yang jelas; pengguna masih dapat menambah dokumen dengan upload/tautan manual | | | | |
| 36 | UAT-076 | Pemantauan Risiko | Batas ukuran file bukti 5 MB ditegakkan | Admin | Siapkan file 4,9 MB, 5 MB, dan 5,1 MB | 1. Upload masing-masing file via "+ Tambah Dokumen". 2. Amati hasil | File PDF 4,9/5/5,1 MB | ≤ 5 MB diterima; > 5 MB ditolak dengan pesan "File too large. Maximum size is 5MB" | | | | |
| 37 | UAT-077 | Pemantauan Risiko | PDF presensi GOJAGS divalidasi tipe & batas 10 MB | Admin | Koordinasi dengan data rapat GOJAGS | 1. Tambahkan presensi rapat dengan PDF normal. 2. (Teknis) verifikasi penolakan bila respons bukan PDF / > 10 MB | PDF presensi uji | PDF valid tersimpan; bukan-PDF atau > 10 MB ditolak dengan pesan yang jelas (tanpa file korup tersimpan) | | | | |
| 38 | UAT-080 | Pelaporan Risiko | Pengguna dapat mengunduh laporan Excel | Admin | Data risiko lengkap; tahun kerja dipilih | 1. Buka Pelaporan Risiko. 2. Klik "Unduh Excel". 3. Buka file hasil | — | File `Laporan_Pelaporan_Risiko_YYYY-MM-DD.xlsx` terunduh berisi kolom lengkap (identifikasi, aktual, pengendalian, residual, respon, RTP, pemantauan, persetujuan) sesuai data di layar | | | | |
| 39 | UAT-081 | Pelaporan Risiko | Pengguna dapat menetapkan persetujuan RTP | Admin | RTP tersedia | 1. Di Pelaporan Risiko, buka Aksi → persetujuan. 2. Pilih "Disetujui", isi "Disetujui Oleh". 3. Simpan. 4. Unduh Excel | Persetujuan "Disetujui"; nama approver | Status persetujuan tersimpan dan berwarna sesuai status di layar & Excel; pilihan lain: Draft/Ditolak juga tersimpan | | | | |
| 40 | UAT-090 | Bank Risiko | Pencarian risiko menghasilkan risiko relevan dengan skor | Admin | Ada data risiko; embedding siap (atau fallback aktif) | 1. Buka Bank Risiko. 2. Ketik deskripsi mirip risiko yang ada. 3. Klik "Cari". 4. Perhatikan badge metode & kolom Skor | "risiko keterlambatan pelaporan data statistik" | Daftar hasil relevan tampil; badge metode "Semantik (AI)" atau fallback teks dengan keterangan; Skor tampil (mode semantik) | | | | |
| 41 | UAT-091 | Bank Risiko | Pengguna dapat menambahkan risiko hasil pencarian ke Identifikasi | Admin | Hasil pencarian tampil | 1. Klik aksi "Tambah ke Identifikasi Risiko" pada salah satu hasil. 2. Buka Identifikasi Risiko tahun aktif | — | Risiko tersalin ke Identifikasi Risiko tahun berjalan dan tampil di daftar | | | | |
| 42 | UAT-092 | Bank Risiko | Kata kunci tanpa hasil & layanan embedding gagal ditangani rapi | Admin | Simulasi: keyword aneh; (opsional) API key embedding dimatikan | 1. Cari kata tidak wajar ("zzqqxx"). 2. Perhatikan pesan metode. 3. Ulangi saat embedding tidak tersedia | "zzqqxx" | Tampil pesan "tidak ditemukan" / badge fallback dengan keterangan penyebab (mis. API key tidak valid, layanan gagal); aplikasi tidak crash | | | | |
| 43 | UAT-093 | Bank Risiko | Batas Limit hasil pencarian 5–100 ditegakkan | Admin | Halaman Bank Risiko | 1. Set Limit 5, cari. 2. Set Limit 100, cari. 3. Coba isi 3 atau 200 (jika input mengizinkan) | Limit 5/100/3/200 | 5 dan 100 dijalankan; nilai di luar rentang ditolak/dikoreksi input | | | | |
| 44 | UAT-100 | Repositori Dokumen | Pengguna dapat mengunggah dokumen manual | Admin | Halaman repositori terbuka | 1. Klik "Upload Dokumen". 2. Isi Judul, pilih kategori "Pedoman & Kebijakan", metode "Upload Berkas", pilih file. 3. Simpan | Judul "Pedoman MR 2026"; PDF ≤ 5 MB | Dokumen tampil di folder Pedoman & Kebijakan | | | | |
| 45 | UAT-101 | Repositori Dokumen | Pengguna dapat membuat ringkasan AI dari PDF | Admin | Dokumen PDF terunggah | 1. Klik "Lihat Ringkasan AI" pada dokumen PDF. 2. Tunggu proses. 3. Buka ulang ringkasan | PDF berteks (bukan scan) | Modal "Ringkasan Dokumen AI" menampilkan ringkasan; ringkasan tersimpan (buka ulang tidak menghitung ulang) | | | | |
| 46 | UAT-102 | Repositori Dokumen | Pencarian & filter tahun/kategori bekerja | Admin | Dokumen dari ≥2 kategori & tahun | 1. Ketik kata kunci di "Cari Berkas". 2. Ganti folder kategori. 3. Ganti "Tahun Risiko" | — | Daftar dokumen sesuai filter yang dipilih | | | | |
| 47 | UAT-103 | Repositori Dokumen | Upload ditolak bila judul kosong atau tanpa file & tautan | Admin | Modal upload terbuka | 1. Kosongkan judul → Simpan. 2. Isi judul, kosongkan file & tautan → Simpan | — | Pesan "Judul dokumen harus diisi" dan "Dokumen atau tautan harus disediakan"; tidak ada dokumen tersimpan | | | | |
| 48 | UAT-104 | Repositori Dokumen | Ketua Tim / Anggota Tim tidak dapat menulis dokumen repositori | Ketua Tim | Login Ketua Tim | 1. Buka Repositori Dokumen. 2. Periksa tombol Upload/Edit/Hapus pada dokumen milik admin | — | Tombol tulis tidak tampil; hanya Buka Dokumen & Lihat Ringkasan | | | | |
| 49 | UAT-110 | Manajemen Pengguna | Admin dapat menambah pengguna baru | Admin | Login admin | 1. Buka Manajemen Akses → Pengguna. 2. Klik "Tambah User". 3. Isi Nama, Email, Role, Tim, Password. 4. Simpan | "Tester UAT", tester.uat@example.com, role "anggota tim", Tim Keuangan, password 8+ karakter | User tampil di daftar; bisa login (UAT-001) dengan role sesuai | | | | |
| 50 | UAT-111 | Manajemen Pengguna | Admin dapat mengatur permission override (Grant/Deny) per user | Admin | User UAT-110 ada | 1. Aksi user → "Manage Permissions Override". 2. Set FAQ:create = Grant. 3. Simpan. 4. Login sebagai user tsb → cek FAQ. 5. Set kembali Deny → cek ulang | Override FAQ create | Dengan Grant: tombol tambah FAQ muncul; dengan Deny: hilang meski role punya/ tidak punya hak (deny menang atas role) | | | | |
| 51 | UAT-112 | Role Permissions | Perubahan permission role berpengaruh ke menu & akses | Admin | Login admin + sesi Ketua Tim lain | 1. Buka Role Permissions. 2. Cabut (uncheck) hak "identifikasi-risiko:create" untuk role ketua tim. 3. Login Ketua Tim → buka Identifikasi. 4. Kembalikan hak | Toggle create identifikasi-risiko | Setelah dicabut, Ketua Tim tidak dapat menyimpan identifikasi (dan menu terkait menyesuaikan); setelah dikembalikan normal lagi | | | | |
| 52 | UAT-113 | Manajemen Pengguna | Password kurang dari 8 karakter ditolak | Admin | Modal Tambah User | 1. Isi password "abc12". 2. Simpan | password "abc12" | Server menolak dengan pesan validasi minimal 8 karakter; user tidak dibuat | | | | |
| 53 | UAT-114 | Manajemen Pengguna | Email duplikat ditolak | Admin | tester.uat@example.com sudah ada | 1. Tambah User dengan email yang sama. 2. Simpan | email duplikat | Penyimpanan gagal dengan pesan; tidak ada user ganda | | | | |
| 54 | UAT-115 | Manajemen Pengguna | Admin tidak dapat menghapus akun dirinya sendiri | Admin | Login admin | 1. Cari akun sendiri di daftar. 2. Periksa aksi Hapus | — | Tombol hapus diri sendiri nonaktif/tidak tersedia | | | | |
| 55 | UAT-120 | Audit Log | Admin dapat melihat & memfilter jejak aktivitas | Admin | Ada aktivitas dari UAT sebelumnya | 1. Buka Audit Log. 2. Filter action=CREATE dan rentang tanggal hari ini. 3. Buka detail satu log. 4. Ekspor CSV | Filter hari ini | Log terbaru tampil (CREATE/UPDATE/DELETE/UPLOAD/LOGIN); detail & CSV sesuai isi log | | | | |
| 56 | UAT-130 | Pusat Notifikasi | Admin dapat mengingatkan penanggung jawab RTP yang belum realisasi | Admin | Ada RTP tanpa realisasi | 1. Buka Pusat Notifikasi. 2. Perhatikan badge "Belum Realisasi". 3. Klik "Ingatkan" pada satu baris. 4. (Opsional) "Ingatkan Semua" | — | Notifikasi terkirim ke anggota Tim terkait (cek di pengguna terkait / ikon lonceng); daftar konsisten dengan RTP belum realisasi | | | | |
| 57 | UAT-140 | FAQ | Admin dapat mengelola FAQ; pengguna lain hanya membaca | Admin + Ketua Tim | Login admin | 1. Admin: tambah FAQ ("Bagaimana cara mengisi identifikasi risiko?" + jawaban). 2. Edit & hapus FAQ uji. 3. Login Ketua Tim → buka FAQ | FAQ uji | Admin dapat tambah/edit/hapus; Ketua Tim hanya melihat daftar tanpa tombol tulis | | | | |
| 58 | UAT-141 | FAQ | Ketua Tim / Anggota Tim tidak dapat mengubah FAQ | Ketua Tim | Login Ketua Tim | 1. Buka FAQ. 2. Cari tombol tambah/edit/hapus | — | Tidak ada tombol tulis; (teknis: API FAQ non-read ditolak) | | | | |
| 59 | UAT-150 | Sesi | Sesi berakhir: pengguna diarahkan ke login tanpa kehilangan data tersimpan | Semua | Sudah login; hapus cookie (atau tunggu kedaluwarsa) | 1. Hapus cookie sesi via pengaturan browser. 2. Klik menu apa pun / muat ulang. 3. Login kembali | — | Diarahkan ke login; data yang telah tersimpan sebelumnya tetap ada setelah login ulang | | | | |
| 60 | UAT-151 | Sesi | Refresh halaman tidak menghilangkan data yang sudah disimpan | Admin | Baris identifikasi telah disimpan | 1. Tekan F5/refresh pada halaman Identifikasi. 2. Amati daftar | — | Data tersimpan tetap tampil; baris kosong siap entri baru | | | | |
| 61 | UAT-152 | Upload | Upload gagal (jaringan/ukuran) memberi notifikasi dan tidak meninggalkan data setengah jadi | Admin | Modal realisasi/upload terbuka | 1. Upload file > 5 MB. 2. Amati notifikasi. 3. Periksa daftar dokumen | File 6 MB | Notifikasi kegagalan tampil; dokumen tidak masuk daftar; realisasi lain yang sudah terisi tidak hilang | | | | |

### Error & Recovery (lanjutan)

| No | ID UAT | Modul | Skenario Pengujian | Role | Precondition | Langkah Pengujian | Data Uji | Expected Result | Actual Result | Status | Evidence | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 62 | UAT-153 | Repositori | Ringkasan AI gagal untuk file non-PDF/txt tanpa merusak dokumen | Admin | Dokumen .docx/.xlsx terunggah | 1. Klik "Lihat Ringkasan AI" pada dokumen non-PDF. 2. Amati pesan. 3. Buka ulang dokumen | File .docx uji | Pesan kegagalan jelas (format tidak didukung); dokumen tetap utuh dan dapat dibuka | | | | |
| 63 | UAT-154 | Repositori | Hapus dokumen saat file fisik sudah hilang tetap menghapus record | Admin | Dokumen terunggah; (opsional) file dihapus manual oleh admin server | 1. Hapus dokumen tersebut. 2. Konfirmasi. 3. Periksa daftar | — | Record terhapus dari daftar tanpa error fatal; (teknis) file fisik tidak ada tetap ditangani | | | | |

---

## 8. End-to-End Scenario

| E2E ID | Business Scenario | Aktor | Alur | Expected Outcome | Status |
|---|---|---|---|---|---|
| E2E-001 | Siklus manajemen risiko lengkap satu risiko | Admin (atau Ketua/Anggota) | Penetapan Konteks (pastikan referensi ada) → Identifikasi (entri risiko baru) → Analisis (K×D, level terisi) → Evaluasi (residual + respon "Mengurangi") → Rencana Penanganan (isi RTP + target + PIC) → Pemantauan (isi realisasi + upload bukti PDF) → Repositori Dokumen → Pelaporan Risiko (set "Disetujui", Unduh Excel) | Risiko lengkap di semua tahap; bukti tampil di Repositori sebagai Bukti Dukung Mitigasi; status persetujuan tersimpan; Excel berisi seluruh data | |
| E2E-002 | Import massal risiko tahunan lalu analisis & evaluasi | Admin | Unduh template → isi 10+ risiko (termasuk 1 dengan ID Sistem lama untuk update, 1 referensi salah) → Import Excel → periksa ringkasan per baris → Analisis sebagian risiko → Evaluasi respon | Ringkasan import: created/updated/failed akurat; baris gagal dengan alasan jelas; analisis/evaluasi hanya pada risiko yang tampil | |
| E2E-003 | Bukti dukung dari integrasi GOJAGS Office sampai repositori | Admin | Pemantauan → buka RTP → cari rapat GOJAGS (keyword ≥2 karakter) → Tambahkan Presensi → Simpan Realisasi → buka Repositori → folder Bukti Dukung Mitigasi → buka dokumen → Ringkasan AI | PDF presensi tersimpan sebagai "Daftar Hadir - {agenda}"; muncul sebagai Bukti Dukung Mitigasi; ringkasan AI tersedia untuk PDF | |
| E2E-004 | Administrasi akses: buat user → override → audit | Admin | Pengguna → Tambah User (role anggota tim, password ≥8) → login user baru (SSO/kredensial) → verifikasi menu → beri override FAQ:create=Grant → login ulang → verifikasi bisa tambah FAQ → set Deny → verifikasi terkunci → Audit Log: periksa jejak CREATE/UPDATE dari aktivitas ini | Menu & akses user mengikuti role + override; deny menutup hak; seluruh aktivitas tercatat di Audit Log dan dapat diekspor CSV | |

---

## 9. Test Data

### Valid Data
| Field / Kegunaan | Nilai |
|---|---|
| User admin | admin@mr.com (seed; password sesuai environment — **Perlu Konfirmasi** kredensial produksi karena login utama SSO) |
| Role | admin / ketua tim / anggota tim |
| Risiko | "Keterlambatan pelaporan data statistik kepada stakeholders" |
| Penyebab | "Keterbatasan SDM analis data" |
| Dampak | "Laporan tahunan terlambat > 1 bulan" |
| Referensi | Jenis "Negatif", Sumber "Internal", Kategori "Gangguan Terhadap Layanan Organisasi", Area Dampak "Penurunan Reputasi" |
| Tahun | 2026 (rentang valid 2020–2030) |
| Analisis | K=4 (Sering Terjadi), D=4 (Signifikan) → besaran 19, Tinggi |
| RTP | "Rekrutmen dan pelatihan analis tambahan", target output "2 analis tersertifikasi", target waktu 31-12-2026 |
| File bukti | PDF valid ≤ 5 MB (bukan scan kosong), mis. "Bukti_Sosialisasi_SOP.pdf" |
| Rapat GOJAGS | keyword "mitigasi risiko" (≥ 2 karakter) |
| User baru | tester.uat@example.com, password "Uat#2026pass" (12 karakter) |

### Invalid Data
| Field / Kegunaan | Nilai |
|---|---|
| Risiko kosong | (kosong) |
| Referensi FK kosong pada baris identifikasi | Jenis/Sumber/Kategori/Area Dampak kosong |
| Tahun | 2019, 2031, "abc", -1 |
| Respon risiko | nilai di luar daftar (dropdown strict menolak) |
| Keterjadian | "Mungkin Terjadi" (hanya "Terjadi"/"Tidak Terjadi" valid) |
| Password user | "abc12" (< 8 karakter) |
| Email | "bukan-email", duplikat user yang sudah ada |
| Keyword rapat GOJAGS | "a" (1 karakter) |
| File bukti | .exe, .sh, .bat; PDF yang isinya bukan PDF (ekstensi bohong); > 5 MB |
| Import | file .numbers; Excel tanpa kolom template; 501 baris; referensi "Negatip" |

### Boundary Data
| Batas | Nilai uji |
|---|---|
| Tahun | 2020 (min), 2030 (maks) |
| Panjang teks risiko/penyebab/dampak | 5000 karakter (diterima), 5001 (ditolak) |
| Ukuran file bukti pendukung | 4,9 MB / 5 MB (diterima), 5,1 MB (ditolak) |
| PDF presensi GOJAGS | 10 MB (diterima), > 10 MB (ditolak), bukan-PDF (ditolak) |
| Limit Bank Risiko | 5 (min), 100 (maks), 3 & 200 (ditolak) |
| Keyword rapat | 2 karakter (min), 1 karakter (ditolak) |
| Import Excel | tepat 500 baris (diterima), 501 (ditolak) |
| Password | 8 karakter (diterima), 7 (ditolak) |

### Special Character
Uji pada kolom risiko/penyebab/dampak/judul dokumen (aplikasi bahasa Indonesia, teks bebas — dicek tidak crash, tersimpan, dan tampil benar):
`Risiko "kebocoran" data — 'single quote' / slash \ backslash <tag> & ampersand émojis 🚨 àéîõü`

### Duplicate Data
| Kegunaan | Nilai |
|---|---|
| Referensi unik (Tim Kerja, Jenis Risiko, Sumber Risiko) | nama & kode yang sudah ada (UAT-013) |
| Email user | email user yang sudah terdaftar (UAT-114) |
| RTP ganda | mencoba membuat RTP kedua untuk risiko yang sama (skema: 1 RTP per risiko — relasi unik) |
| Risiko identik dalam satu import | 2 baris sama persis tanpa ID Sistem (harus dibuat 2 baris berbeda; amati & catat perilaku) |

---

## 10. Requirement Traceability Matrix

| Requirement ID | Requirement/Kebutuhan | Modul | UAT ID | Coverage | Status |
|---|---|---|---|---|---|
| FR-01..FR-09 | Kelola data referensi (unit kerja, kegiatan, sasaran, proses bisnis, pemangku kepentingan, peraturan, jenis/sumber/kategori/area, level, kriteria, selera, opsi penanganan) | Penetapan Konteks | UAT-010, UAT-011, UAT-012, UAT-013 | Penuh (selera risiko & kriteria kemungkinan diuji sebagai bagian tab umum) | ✔ Tercakup |
| FR-10 | Catat risiko, penyebab, dampak, tahun, unit kerja, kegiatan, sasaran, proses bisnis | Identifikasi | UAT-020, UAT-021, E2E-001 | Penuh | ✔ Tercakup |
| FR-11 | Memilih referensi dari data master | Identifikasi | UAT-020, UAT-021 | Penuh (dropdown strict) | ✔ Tercakup |
| FR-12 | Input bergaya spreadsheet | Identifikasi | UAT-020, UAT-021 | Penuh (Handsontable) | ✔ Tercakup |
| FR-13 | Validasi field wajib & relasi referensi | Identifikasi | UAT-025, UAT-028, UAT-029 | Parsial — keberadaan FK tidak divalidasi (500 dari DB); baris invalid dilewati diam | ⚠ Parsial |
| FR-14 | Filter & pencarian data risiko | Identifikasi | UAT-024, UAT-090 | Penuh | ✔ Tercakup |
| FR-15..FR-17 | Analisis inheren + perhitungan matriks + indikator warna | Analisis | UAT-030, UAT-031, UAT-060 | Penuh | ✔ Tercakup |
| FR-18..FR-20 | Respon risiko + residual + perbandingan inheren/residual | Evaluasi, Matriks, Dashboard | UAT-040, UAT-041, UAT-061, Dashboard (E2E-001) | Penuh | ✔ Tercakup |
| FR-21..FR-23 | RTP per risiko + isi rencana/target/PIC/jenis/persetujuan + relasi | Rencana | UAT-050, UAT-051, UAT-052, UAT-081 | Penuh | ✔ Tercakup |
| FR-24 | Realisasi waktu/output + keterjadian | Pemantauan | UAT-070 | Penuh | ✔ Tercakup |
| FR-25..FR-28 | Upload bukti + DokumenPendukung + muncul di repositori + fallback judul | Pemantauan, Repositori | UAT-071, UAT-072, UAT-076, UAT-103 | Penuh (fallback judul: uji dengan judul kosong saat upload bukti dari Pemantauan — ikut UAT-071 varian) | ✔ Tercakup |
| FR-29, FR-30 | Cari rapat GOJAGS + daftar hadir sebagai bukti | Pemantauan | UAT-073, UAT-074, E2E-003 | Penuh | ✔ Tercakup |
| FR-31..FR-35 | Upload dokumen manual, gabungan 2 sumber, kategori, filter | Repositori | UAT-100, UAT-102, UAT-072 | Penuh | ✔ Tercakup |
| FR-36 | Preview/download via route aplikasi | Repositori | UAT-102 (Buka Dokumen), UAT-072 | Penuh (buka di tab baru; tidak ada preview inline — sesuai implementasi) | ✔ Tercakup |
| FR-37, FR-38 | Summary PDF + disimpan metadata tanpa binary | Repositori | UAT-101, UAT-153 | Penuh | ✔ Tercakup |
| FR-39..FR-42 | Upload server-side, file persistent, metadata, auto-create folder | Upload API | UAT-071, UAT-076, UAT-152 | Penuh dari UI (auto-create folder & persistence dicek teknis oleh admin server) | ✔ Tercakup |
| FR-43 | Preview/download route aman | Upload API | UAT-072, UAT-102 | Tercakup | ✔ Tercakup |
| FR-44 | Delete dokumen + cleanup file fisik | Repositori | UAT-011 (konfirmasi), UAT-154 | Penuh | ✔ Tercakup |
| FR-45 | Summarization server-side | Repositori | UAT-101, UAT-153 | Penuh | ✔ Tercakup |
| FR-46 | Validasi tipe & ukuran file | Upload API | UAT-076, UAT-077, UAT-152 | Penuh | ✔ Tercakup |
| FR-47 | File upload tidak dieksekusi sebagai script | Upload API | UAT-152 (varian file .exe/.sh — lihat Invalid Data) | Tercakup via validasi whitelist + magic bytes | ✔ Tercakup |
| FR-48, FR-49 | Dashboard KPI + heatmap | Dashboard | E2E-001 langkah terakhir (verifikasi visual) | Tercakup — tidak ada test case dashboard tersendiri; direkomendasikan pemeriksaan visual saat E2E | ⚠ Parsial |
| FR-50, FR-51 | Export Excel + filter | Pelaporan | UAT-080, UAT-024 | Penuh | ✔ Tercakup |
| FR-52 | Login, logout, register, reset password | Autentikasi | UAT-001..UAT-003 | **Gap**: register & reset password tidak ada di UI; login email/password tidak tampil (SSO saja) | ✘ Gap |
| FR-53 | Empat peran utama | RBAC | UAT-004, UAT-005, E2E-004 | **Gap**: role `pimpinan` tidak diimplementasi (3 role) | ✘ Gap |
| FR-54 | Permission granular menu & aksi | RBAC | UAT-004, UAT-005, UAT-111, UAT-112 | Penuh | ✔ Tercakup |
| FR-55 | Override permission per user | RBAC | UAT-111 | Penuh | ✔ Tercakup |
| FR-56 | Menu & API mengikuti permission | RBAC | UAT-004, UAT-005, UAT-112 | Penuh | ✔ Tercakup |
| FR-57, FR-58 | Audit log + filter admin | Audit Log | UAT-120 | Penuh | ✔ Tercakup |
| FR-59 | Admin kelola FAQ | FAQ | UAT-140, UAT-141 | Penuh | ✔ Tercakup |
| NFR-09 | Notifikasi sukses/gagal upload jelas | Upload | UAT-071, UAT-152 | Tercakup | ✔ Tercakup |
| NFR-11 | API key GOJAGS tidak terekspos ke client | Integrasi | UAT-073 (pemeriksaan teknis: tidak ada kunci di network tab browser) | Tercakup (cek teknis oleh tester IT) | ✔ Tercakup |
| PRD §8.3 | PDF presensi divalidasi sebelum disimpan | Integrasi | UAT-077 | Penuh | ✔ Tercakup |

**Requirement tanpa test case / tidak dapat diuji dari UI:** penyimpanan persisten antar-redeploy (NFR-02) dan backup/restore (NFR-10) — diuji di level operasi server, bukan UAT fungsional; selera risiko & kriteria kemungkinan hanya diuji sebagai tab umum Penetapan Konteks (UAT-010).

---

## 11. Tester Guide

1. **Tujuan UAT** — memastikan aplikasi GOJAGS Risk dapat dipakai pengguna nyata menyelesaikan proses manajemen risiko dari awal (identifikasi) sampai akhir (laporan & bukti dukung) dengan benar, sesuai hak aksesnya.
2. **Cara menjalankan test case** — kerjakan berurutan per modul sesuai kolom "Langkah Pengujian". Gunakan akun sesuai kolom "Role". Jangan lompat precondition (mis. UAT-030 butuh risiko dari UAT-020).
3. **Yang harus diperiksa** — (a) aksi berhasil sesuai Expected Result; (b) data yang tampil benar (angka, level, tanggal); (c) pesan/notifikasi sukses-gagal muncul; (d) menu/tombol sesuai role Anda.
4. **PASS** — hanya bila **seluruh** Expected Result terpenuhi.
5. **FAIL** — bila salah satu Expected Result tidak terpenuhi. Isi Actual Result dengan apa yang benar-benar terjadi (jangan "gagal" saja — tulis pesan error/keadaan layar).
6. **Mencatat defect** — isi Defect Log (Bagian 12): satu defect per masalah, cantumkan UAT ID, langkah reproduksi persis, evidence.
7. **Evidence** — tangkapan layar (PNG) yang menampilkan: kondisi sebelum (bila relevan), hasil aksi (notifikasi/daftar), dan bukti data (mis. file Excel terbuka). Untuk bug, sertakan pesan error utuh. Beri nama file `<UAT-ID>_<nama-singkat>.png`.
8. Tandai **Blocked** bila test case tidak bisa dijalankan karena test case lain gagal; **Not Tested** bila belum sempat diuji.

---

## 12. Defect Log

| Defect ID | UAT ID | Modul | Deskripsi Masalah | Severity | Priority | Langkah Reproduksi | Expected | Actual | Evidence | Status | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEF-001 | | | | | | | | | | Open | |
| DEF-002 | | | | | | | | | | Open | |
| DEF-003 | | | | | | | | | | Open | |

Severity: **Critical** (proses bisnis utama berhenti / data hilang / akses tidak sah diberikan) · **Major** (fitur penting salah, ada workaround berat) · **Minor** (gangguan kecil, ada workaround mudah) · **Cosmetic** (tampilan/typo).

---

## 13. UAT Summary Template

| Indikator | Nilai |
|---|---|
| Total Test Case | 63 |
| PASS | |
| FAIL | |
| Blocked | |
| Not Tested | |
| **Pass Rate** = PASS / (PASS + FAIL) × 100% | |
| Critical Failure | |
| Major Failure | |
| Minor Failure | |
| Cosmetic Failure | |

Ringkasan per modul (isi saat UAT selesai):

| Modul | Total | PASS | FAIL | Blocked | Not Tested | Pass Rate |
|---|---|---|---|---|---|---|
| Autentikasi & Sesi (UAT-001..003, 150, 151) | 5 | | | | | |
| Hak Akses (UAT-004, 005) | 2 | | | | | |
| Penetapan Konteks (UAT-010..013) | 4 | | | | | |
| Identifikasi Risiko (UAT-020..029) | 10 | | | | | |
| Analisis Risiko (UAT-030..032) | 3 | | | | | |
| Evaluasi Risiko (UAT-040, 041) | 2 | | | | | |
| Rencana Penanganan (UAT-050..052) | 3 | | | | | |
| Matriks Risiko (UAT-060, 061) | 2 | | | | | |
| Pemantauan & Integrasi GOJAGS (UAT-070..077) | 8 | | | | | |
| Pelaporan Risiko (UAT-080, 081) | 2 | | | | | |
| Bank Risiko (UAT-090..093) | 4 | | | | | |
| Repositori Dokumen (UAT-100..104, 153, 154) | 7 | | | | | |
| Manajemen Pengguna & Role (UAT-110..115) | 6 | | | | | |
| Audit Log (UAT-120) | 1 | | | | | |
| Pusat Notifikasi (UAT-130) | 1 | | | | | |
| FAQ (UAT-140, 141) | 2 | | | | | |
| Upload/Recovery (UAT-152) | 1 | | | | | |
| **Total** | **63** | | | | | |

Catatan: Not Tested dan Blocked **tidak** masuk denominator Pass Rate.

---

## 14. UAT Exit Criteria

> Semua angka berikut adalah **Rekomendasi** (PRD belum menetapkan ambang exit criteria).

### ACCEPTED (Layak diterima)
- Tidak ada defect **Critical**.
- Tidak ada defect **Major** yang menghambat proses bisnis utama (identifikasi → analisis → evaluasi → RTP → pemantauan).
- Seluruh test case berprioritas **Critical** dan **High** berstatus PASS (100%).
- Pass Rate keseluruhan ≥ **95%**.
- Keempat skenario E2E (E2E-001 s.d. E2E-004) PASS.
- Coverage requirement utama (semua FR berstatus ✔) terpenuhi; gap terdaftar memiliki keputusan eksplisit dari pemilik produk.

### ACCEPTED WITH MINOR ISSUES (Diterima dengan catatan)
- Tidak ada defect Critical.
- Defect Major tersisa ≤ **2** dan semuanya memiliki workaround yang bisa diterima pengguna + jadwal perbaikan disepakati.
- Seluruh test case Critical PASS; test case High PASS ≥ **90%**.
- Pass Rate keseluruhan ≥ **85%**.
- Defect Minor/Cosmetic dicatat dalam backlog, tidak menghambat operasional.

### NOT ACCEPTED (Belum dapat diterima)
- Ada ≥ 1 defect Critical, **atau**
- Ada defect Major yang memutus proses bisnis utama tanpa workaround, **atau**
- Test case Critical ada yang FAIL, **atau**
- Pass Rate < **85%**, atau alur E2E-001 (siklus risiko lengkap) gagal.

---

## 15. Requirement / Implementation Gap

| # | Area | Requirement (PRD/Rancangan) | Implementasi Aktual | Dampak ke UAT | Rekomendasi |
|---|---|---|---|---|---|
| 1 | Role pimpinan | PRD §4: 4 peran, termasuk **pimpinan** untuk monitoring/laporan | Seed & akses hanya admin/ketua tim/anggota tim; tidak ada role pimpinan | Tidak ada test case pimpinan | Konfirmasi: tambahkan role atau perbarui PRD. Jika ditambahkan, tambah test case akses read-only + dashboard |
| 2 | Lingkup data per tim | PRD §4.1: Ketua/Anggota pada lingkup timnya; record-level access | `checkRecordPermission` selalu true (TODO di kode); semua user melihat semua data organisasi | UAT tidak bisa menguji isolasi data antar tim | Konfirmasi kebijakan; jika diinginkan, tambah test case "Ketua Tim A tidak melihat risiko Tim B" |
| 3 | Register & reset password | FR-52: login, logout, register, reset password | Halaman `/register` & `/forgot-password` ada sebagai scaffold, tidak dipakai; login hanya SSO GOJAGS | UAT hanya mencakup SSO | Konfirmasi apakah register/reset dihilangkan dari scope; perbarui PRD |
| 4 | Login email/password | PRD §5.1: autentikasi email/password + session cookie | Endpoint `/api/auth/login` ada, tapi UI login hanya SSO; cookie sesi tetap dipakai | UAT-001 ditulis untuk SSO | Samakan dokumen PRD dengan alur SSO |
| 5 | Modul KRI | Rancangan menyebut KRI; PRD tidak detail | Halaman `/kri` hidup via URL langsung, menu disembunyikan; kartu KRI dashboard dikomentari | Tidak ada UAT KRI reguler (di luar scope UAT ini) | Konfirmasi status KRI: diaktifkan atau dipensiunkan |
| 6 | Preview dokumen inline | FR-36: preview/download | Hanya "Buka Dokumen" di tab baru; tidak ada preview inline | UAT memakai "Buka Dokumen" | Tidak menghambat; perbarui PRD bila preview inline diinginkan |
| 7 | Validasi relasi referensi | FR-13: validasi relasi referensi | Validator memeriksa tipe angka, bukan keberadaan FK; FK salah → error 500 database; baris invalid di identifikasi dilewati diam | UAT-025 mencatat perilaku; berpotensi bug UX | Tambahkan pesan per baris saat simpan gagal; validasi FK eksplisit |
| 8 | Fitur di luar PRD | — | Bank Risiko pencarian semantik AI + Skor; Pusat Notifikasi & pengingat; visualisasi perpindahan matriks; dark mode; welcome tour; import Excel; push notification FCM | Test case ditambahkan (UAT-090..093, UAT-130, UAT-061) | Tambal PRD agar fitur ini jadi requirement resmi |
| 9 | Filter tahun repositori | — | Dropdown "Tahun Risiko" hardcoded 2024/2025/2026, tidak ikut filter tahun global | UAT-102 terbatas pada tahun tsb | Sinkronkan dengan YearFilter global |
| 10 | Export backend | FR-50: sistem mendukung export Excel | Export dilakukan client-side (ExcelJS di browser); endpoint export lama dinonaktifkan (`.bak`) | UAT-080 tetap valid | Dokumentasikan keputusan arsitektur |
| 11 | Kredensial UAT | — | Seed: admin@mr.com / ketuatim@mr.com (password ter-hash di seed); tidak ada user anggota tim di seed; login UI hanya SSO | Tester perlu akun SSO uji + user yang sudah dibuat admin | Admin membuat user uji per role sebelum UAT (UAT-110) |

---

## 16. Daftar Hal yang Perlu Dikonfirmasi

1. **Role pimpinan** — apakah akan diimplementasi atau PRD direvisi? (Gap #1)
2. **Isolasi data per tim/unit** — apakah Ketua/Anggota memang boleh melihat semua data organisasi? (Gap #2)
3. **Kredensial UAT** — akun SSO GOJAGS untuk tiap role + user yang sudah dibuat di aplikasi sebelum UAT dimulai. (Gap #11)
4. **Baris identifikasi invalid dilewati diam** saat "Simpan Semua" — diterima sebagai perilaku atau harus ada pesan per baris? (UAT-025, Gap #7)
5. **Status modul KRI** — diaktifkan kembali atau dihapus dari rencana? (Gap #5)
6. **Register/reset password** — dihapus dari scope resmi? (Gap #3)
7. **Rentang tahun filter repositori** (2024–2026 hardcoded) — apakah harus mengikuti tahun kerja global? (Gap #9)
8. **Lingkungan UAT** — GOJAGS Office (API key & base URL) dan GEMINI_API_KEY tersedia di server UAT? Tanpa itu, UAT-073/UAT-077 (integrasi) dan UAT-090 (semantik) akan berjalan di mode fallback/error.
9. **Ambang exit criteria** — angka di Bagian 14 berstatus Rekomendasi; mohon disepakati pemilik produk sebelum UAT dimulai.
10. **Perbedaan hak Ketua Tim vs Anggota Tim** — seed identik; apakah ada pembatasan yang dimaksudkan (mis. anggota tidak boleh hapus)?

---

## 6a. Prioritas Pengujian

| ID | Skenario | Priority | Alasan |
|---|---|---|---|
| UAT-001 | Login SSO | Critical | Gerbang seluruh penggunaan aplikasi |
| UAT-020 | Entri identifikasi risiko | Critical | Inti proses bisnis; semua tahap bergantung padanya |
| UAT-030/031 | Analisis & perhitungan matriks | Critical | Dasar penentuan prioritas & RTP |
| UAT-040 | Evaluasi & respon risiko | Critical | Menentukan risiko yang masuk RTP |
| UAT-050 | Pembuatan RTP | Critical | Dasar pemantauan & pelaporan |
| UAT-070/071 | Realisasi + upload bukti | Critical | Bukti mitigasi = output utama pemantauan |
| UAT-072 | Bukti otomatis ke Repositori | Critical | Requirement otomatisasi kunci (FR-27) |
| UAT-080 | Export Excel | Critical | Output resmi laporan ke manajemen |
| UAT-003 | Redirect belum login | Critical | Keamanan dasar |
| UAT-073 | Integrasi GOJAGS Office | High | Requirement integrasi utama; bergantung layanan eksternal |
| UAT-004/005 | Pembatasan akses role | High | Keamanan & kepatuhan RBAC |
| UAT-022/026/027/028 | Import Excel + penolakan | High | Efisiensi input massal tahunan |
| UAT-110..115 | Manajemen user & password | High | Fondasi administrasi akses |
| UAT-120 | Audit log | High | Kepatuhan/auditabilitas (FR-57) |
| UAT-076/077 | Batas ukuran & tipe file | High | Keamanan server (FR-46/47) |
| UAT-081 | Persetujuan RTP | High | Bagian alur pelaporan |
| UAT-090..093 | Bank Risiko | Medium | Nilai tambah, punya fallback |
| UAT-100..104 | Repositori manual + ringkasan AI | Medium | Pendukung, bukan jalur utama |
| UAT-111/112 | Override & role permission | Medium | Konfigurasi lanjutan, jarang diubah |
| UAT-130 | Pengingat notifikasi | Medium | Pendukung ketepatan realisasi |
| UAT-140/141 | FAQ | Medium | Pendukung pengguna |
| UAT-010..013 | CRUD referensi | Medium | Prasyarat tapi jarang berubah |
| UAT-060/061 | Visualisasi matriks | Medium | Informasi, tidak mengubah data |
| UAT-024 | Filter tahun | Medium | Navigasi data |
| UAT-150..154 | Error & recovery | Medium | Ketahanan penggunaan |
| UAT-021 | Cascade & auto-fill | Medium | Kenyamanan entri (perilaku sudah cukup diuji UAT-020) |
| UAT-023 | Unduh template | Low | Pendukung import |
| UAT-091 | Tambah ke identifikasi dari Bank Risiko | Low | Fitur kenyamanan |
| UAT-052 | Validasi tanggal RTP | Low | Perilaku minor yang perlu didokumentasikan |
| UAT-115 | Proteksi hapus diri sendiri | Low | Proteksi administratif kecil |

---

*Dokumen ini siap dipindahkan ke Excel/Google Sheets: tabel pada Bagian 7 (Detailed UAT Test Cases), 6a (Prioritas), 8 (E2E), 12 (Defect Log), dan 13 (Summary) dapat langsung disalin per kolom. Kolom Actual Result, Status, Evidence, Catatan, Tanggal Pengujian, dan Nama Tester sengaja dibiarkan kosong untuk diisi tester.*
