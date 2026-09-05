# Product Requirements Document (PRD) - GOJAGS Risk

| Item | Detail |
|---|---|
| Produk | GOJAGS Risk / Sistem Informasi Manajemen Risiko Enterprise |
| Dokumen | Product Requirements Document (PRD) |
| Versi | 1.2 |
| Status | Updated Draft |
| Platform | Web application |
| Target deployment | Server mandiri / server organisasi |
| Terakhir diperbarui | 2026-08-20 |

---

## 1. Ringkasan Eksekutif

GOJAGS Risk adalah aplikasi web manajemen risiko enterprise yang membantu organisasi mengelola siklus risiko secara end-to-end: penetapan konteks, identifikasi risiko, analisis risiko, evaluasi risiko, rencana penanganan, pemantauan risiko, pelaporan, repositori dokumen, dan audit akses.

Aplikasi dirancang untuk konteks organisasi Indonesia, menggunakan bahasa Indonesia, dan mengacu pada praktik manajemen risiko ISO 31000 / SNI 8615. Sistem ditujukan untuk digunakan pada server organisasi sendiri dengan penyimpanan data dan dokumen yang persistent.

Fokus utama dokumen ini:

- Menjadi acuan kebutuhan produk GOJAGS Risk saat ini.
- Memastikan alur manajemen risiko berjalan lengkap dari identifikasi sampai pemantauan.
- Memastikan dokumen pendukung dapat diunggah, disimpan, dilihat, diunduh, diringkas, dan dihapus.
- Memastikan bukti pendukung dari menu Pemantauan Risiko otomatis muncul di Repositori Dokumen sebagai `Bukti Dukung Mitigasi`.
- Mengintegrasikan Pemantauan Risiko dengan GOJAGS Office untuk mencari rapat dan mengambil daftar hadir rapat sebagai bukti pendukung.
- Menetapkan peran pengguna hanya terdiri dari `admin`, `ketua tim`, `anggota tim`, dan `pimpinan`.

---

## 2. Visi Produk

Menyediakan platform manajemen risiko yang komprehensif, aman, dapat diaudit, dan mudah digunakan agar organisasi dapat mengambil keputusan berbasis data, menjaga kepatuhan, dan memantau efektivitas mitigasi risiko secara berkelanjutan.

---

## 3. Tujuan Produk

| ID | Tujuan |
|---|---|
| T1 | Mendigitalkan alur kerja manajemen risiko sesuai ISO 31000 / SNI 8615. |
| T2 | Menyediakan kontrol akses berbasis empat peran utama: admin, ketua tim, anggota tim, dan pimpinan. |
| T3 | Menyediakan dashboard risiko dengan visualisasi tingkat risiko dan progress mitigasi. |
| T4 | Menyediakan Repositori Dokumen yang menyatukan dokumen manual dan bukti dukung mitigasi. |
| T5 | Mendukung upload, preview, download, delete, dan summarization dokumen. |
| T6 | Memastikan dokumen yang diunggah tersimpan secara persistent di server. |
| T7 | Memastikan operasi penting dapat diaudit dan aman dari akses tidak sah. |
| T8 | Menghubungkan data rapat GOJAGS Office sebagai sumber bukti dukung mitigasi. |

---

## 4. Peran Pengguna

Sistem hanya mengenal empat peran utama berikut.

| Peran | Deskripsi | Kebutuhan Utama |
|---|---|---|
| Admin | Pengelola sistem dan konfigurasi utama aplikasi. | Mengelola user, role, permission, data referensi, audit log, FAQ, dan seluruh data aplikasi. |
| Ketua Tim | Penanggung jawab tim/unit dalam proses manajemen risiko. | Meninjau data risiko tim, mengarahkan anggota tim, memvalidasi rencana penanganan, memantau realisasi mitigasi. |
| Anggota Tim | Pengguna operasional yang menginput dan memperbarui data risiko. | Mengisi data risiko, analisis, evaluasi, rencana penanganan, realisasi pemantauan, dan upload bukti pendukung. |
| Pimpinan | Pengambil keputusan dan pemantau risiko tingkat organisasi. | Melihat dashboard, laporan ringkas, risiko prioritas, progress mitigasi, dan bukti dukung strategis. |

### 4.1 Prinsip Akses

- Admin memiliki akses penuh terhadap konfigurasi dan data aplikasi.
- Ketua Tim memiliki akses terhadap data risiko dan anggota pada lingkup tim/unit yang menjadi tanggung jawabnya.
- Anggota Tim memiliki akses untuk membuat dan memperbarui data operasional sesuai penugasan atau lingkup timnya.
- Pimpinan memiliki akses utama untuk monitoring, review, dan laporan, bukan pengelolaan teknis sistem.
- Hak akses detail tetap dikendalikan oleh permission aplikasi agar dapat disesuaikan tanpa menambah jenis peran baru.

---

## 5. Ruang Lingkup Produk

### 5.1 In Scope

- Autentikasi user berbasis email/password dan session cookie.
- Role-Based Access Control (RBAC) untuk empat peran utama.
- Pengelolaan data referensi risiko.
- Identifikasi risiko berbasis tabel/spreadsheet.
- Analisis risiko inheren.
- Evaluasi risiko residual.
- Rencana penanganan risiko.
- Pemantauan realisasi mitigasi.
- Upload bukti pendukung mitigasi.
- Repositori dokumen.
- Integrasi GOJAGS Office untuk pencarian rapat dan import daftar hadir.
- Summarization/resume isi PDF.
- Preview dan download dokumen.
- Delete dokumen dan cleanup file storage.
- Dashboard risiko.
- Export laporan Excel.
- Audit log.
- Deployment pada server organisasi sendiri.

### 5.2 Out of Scope Saat Ini

- Penyimpanan binary file langsung di database.
- Akses upload langsung dari client ke layanan storage eksternal.
- Penambahan role di luar admin, ketua tim, anggota tim, dan pimpinan.
- Workflow approval kompleks multi-level.
- Mobile-first redesign penuh.
- Integrasi sistem eksternal di luar kebutuhan aplikasi inti.

---

## 6. Modul Fungsional

### 6.1 Penetapan Konteks

| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Kelola Unit Kerja. | P0 |
| FR-02 | Kelola Kegiatan. | P0 |
| FR-03 | Kelola Sasaran. | P0 |
| FR-04 | Kelola Proses Bisnis. | P0 |
| FR-05 | Kelola Pemangku Kepentingan. | P0 |
| FR-06 | Kelola Peraturan Perundangan. | P0 |
| FR-07 | Kelola Jenis Risiko, Sumber Risiko, Kategori Risiko, dan Area Dampak. | P0 |
| FR-08 | Kelola Level Kemungkinan, Level Dampak, dan Level Risiko. | P0 |
| FR-09 | Kelola Kriteria Kemungkinan, Kriteria Dampak, Selera Risiko, dan Opsi Penanganan. | P0 |

### 6.2 Identifikasi Risiko

| ID | Requirement | Prioritas |
|---|---|---|
| FR-10 | User dapat mencatat risiko, penyebab, dampak, tahun, unit kerja, kegiatan, sasaran, dan proses bisnis. | P0 |
| FR-11 | User dapat memilih referensi risiko dari data master. | P0 |
| FR-12 | Sistem mendukung input bergaya spreadsheet untuk mempercepat entri data. | P0 |
| FR-13 | Sistem melakukan validasi field wajib dan relasi referensi. | P0 |
| FR-14 | Sistem mendukung filter dan pencarian data risiko. | P0 |

### 6.3 Analisis Risiko

| ID | Requirement | Prioritas |
|---|---|---|
| FR-15 | User dapat mengisi level kemungkinan dan level dampak inheren. | P0 |
| FR-16 | Sistem menghitung atau menyimpan level risiko inheren berdasarkan matriks risiko. | P0 |
| FR-17 | Sistem menampilkan tingkat risiko dengan indikator warna. | P0 |

### 6.4 Evaluasi Risiko

| ID | Requirement | Prioritas |
|---|---|---|
| FR-18 | User dapat menentukan respon risiko. | P0 |
| FR-19 | User dapat mengisi level kemungkinan dan dampak residual. | P0 |
| FR-20 | Sistem dapat membandingkan risiko inheren dan residual. | P0 |

### 6.5 Rencana Penanganan Risiko

| ID | Requirement | Prioritas |
|---|---|---|
| FR-21 | User dapat membuat satu rencana penanganan untuk setiap risiko. | P0 |
| FR-22 | User dapat mengisi rencana, target output, target waktu, PIC, jenis penanganan, dan status persetujuan. | P0 |
| FR-23 | Sistem menyimpan relasi rencana penanganan ke risiko asal. | P0 |

### 6.6 Pemantauan Risiko

| ID | Requirement | Prioritas |
|---|---|---|
| FR-24 | User dapat memperbarui realisasi waktu, realisasi output, dan keterjadian risiko. | P0 |
| FR-25 | User dapat upload satu atau lebih dokumen bukti pendukung. | P0 |
| FR-26 | Dokumen bukti pendukung dari Pemantauan Risiko disimpan sebagai `DokumenPendukung`. | P0 |
| FR-27 | Dokumen bukti pendukung harus otomatis muncul di Repositori Dokumen sebagai tipe `Bukti Dukung Mitigasi`. | P0 |
| FR-28 | Jika judul dokumen kosong, sistem menggunakan nama file atau fallback `Bukti Dukung Mitigasi`. | P0 |
| FR-29 | User dapat mencari rapat dari GOJAGS Office berdasarkan keyword agenda rapat. | P0 |
| FR-30 | User dapat menambahkan PDF daftar hadir rapat GOJAGS Office sebagai dokumen pendukung mitigasi. | P0 |

### 6.7 Repositori Dokumen

| ID | Requirement | Prioritas |
|---|---|---|
| FR-31 | User dapat mengunggah dokumen manual ke repository. | P0 |
| FR-32 | Repository menggabungkan data dari tabel `Repositori` dan `DokumenPendukung`. | P0 |
| FR-33 | Dokumen manual memiliki kategori seperti `pedoman` atau `laporan`. | P0 |
| FR-34 | Dokumen bukti pendukung mitigasi memiliki kategori `bukti_dukung`. | P0 |
| FR-35 | User dapat mencari, memfilter tahun, dan memfilter kategori dokumen. | P0 |
| FR-36 | User dapat preview atau download dokumen sesuai URL yang disimpan. | P0 |
| FR-37 | User dapat membuat summary/resume isi PDF. | P0 |
| FR-38 | Summary dokumen disimpan ke database tanpa menyimpan binary PDF di database. | P0 |

### 6.8 Upload, Preview, Download, Delete, dan Summarization

| ID | Requirement | Prioritas |
|---|---|---|
| FR-39 | Sistem menyediakan endpoint upload server-side. | P0 |
| FR-40 | File dokumen disimpan sebagai file persistent di server, bukan binary di database. | P0 |
| FR-41 | Sistem menyimpan metadata dokumen ke database, minimal judul, URL/path, kategori, tahun, uploader, dan summary jika tersedia. | P0 |
| FR-42 | Sistem membuat folder penyimpanan file jika belum tersedia. | P0 |
| FR-43 | Preview/download dokumen dilakukan melalui route aplikasi yang aman. | P0 |
| FR-44 | Delete dokumen harus menghapus record database dan file fisik jika file merupakan file upload yang dikelola aplikasi. | P0 |
| FR-45 | Summarization PDF membaca file dari penyimpanan dokumen server-side. | P0 |
| FR-46 | Validasi tipe file dan batas ukuran file harus dipertahankan. | P0 |
| FR-47 | File upload tidak boleh dieksekusi sebagai script oleh server. | P0 |

### 6.9 Dashboard dan Pelaporan

| ID | Requirement | Prioritas |
|---|---|---|
| FR-48 | Dashboard menampilkan KPI risiko utama. | P0 |
| FR-49 | Dashboard menampilkan heatmap atau distribusi tingkat risiko. | P0 |
| FR-50 | Sistem mendukung export Excel untuk daftar risiko. | P0 |
| FR-51 | Laporan dapat difilter berdasarkan tahun atau konteks yang tersedia. | P1 |

### 6.10 Manajemen User, Role, dan Permission

| ID | Requirement | Prioritas |
|---|---|---|
| FR-52 | Sistem mendukung login, logout, register, dan reset password. | P0 |
| FR-53 | Sistem hanya menggunakan empat peran utama: admin, ketua tim, anggota tim, dan pimpinan. | P0 |
| FR-54 | Sistem mendukung permission granular untuk mengatur akses menu dan aksi per peran. | P0 |
| FR-55 | Sistem mendukung override permission per user jika diperlukan. | P1 |
| FR-56 | Menu dan akses API mengikuti permission user. | P0 |

### 6.11 Audit Log dan FAQ

| ID | Requirement | Prioritas |
|---|---|---|
| FR-57 | Sistem mencatat operasi penting ke audit log. | P0 |
| FR-58 | Admin dapat melihat dan memfilter audit log. | P0 |
| FR-59 | Admin dapat mengelola FAQ. | P1 |

---

## 7. Penyimpanan Dokumen

### 7.1 Prinsip Penyimpanan

- Dokumen upload disimpan sebagai file persistent di server.
- Database hanya menyimpan metadata dokumen, seperti `title`, `url`, `category`, `tahun`, `uploader`, dan `summary`.
- Binary PDF atau file upload lain tidak disimpan langsung di database.
- File upload harus tetap tersedia setelah aplikasi di-restart atau di-deploy ulang pada server.
- Folder penyimpanan upload harus dikecualikan dari Git karena merupakan runtime data.

### 7.2 Backward Compatibility

Sistem harus tetap dapat membaca data lama dengan bentuk lokasi file:

- `/api/uploads/<filename>`
- `/uploads/<filename>`
- `uploads/<filename>`

### 7.3 Preview dan Download

Preview/download dokumen dilakukan melalui route aplikasi, bukan dengan membuka path filesystem server secara langsung.

Flow umum:

```text
User membuka dokumen
  |
  v
Route preview/download aplikasi
  |
  v
Baca file dari penyimpanan dokumen server
  |
  v
Kembalikan response file ke browser
```

### 7.4 Delete File

Jika user menghapus dokumen:

- Sistem menghapus record database sesuai behavior modul terkait.
- Sistem menghapus file fisik jika file tersebut merupakan file upload yang dikelola aplikasi.
- Jika file tidak ditemukan, sistem tetap harus menangani kondisi tersebut tanpa merusak proses hapus record.

### 7.5 Summarization PDF

Summarization PDF membaca file secara server-side dari penyimpanan dokumen.

Flow umum:

```text
User meminta summarize
  |
  v
API summarize membaca file dokumen
  |
  v
PDF text extraction
  |
  v
Generate summary
  |
  v
Simpan summary ke database
```

---

## 8. Integrasi GOJAGS Office

### 8.1 Tujuan Integrasi

Integrasi GOJAGS Office digunakan untuk mengambil data rapat yang relevan dengan kegiatan mitigasi risiko. Dari rapat yang dipilih, sistem dapat mengambil PDF daftar hadir dan menambahkannya sebagai dokumen pendukung pada Pemantauan Risiko.

### 8.2 Alur Integrasi

```text
User membuka modal Pemantauan Risiko
  |
  v
User mencari rapat berdasarkan keyword
  |
  v
API internal aplikasi memanggil GOJAGS Office /api/tr-rapat
  |
  v
User memilih rapat dan menambahkan daftar hadir
  |
  v
API internal mengambil PDF presensi GOJAGS Office
  |
  v
PDF disimpan sebagai file dokumen aplikasi
  |
  v
Metadata dokumen disimpan sebagai DokumenPendukung saat realisasi disimpan
  |
  v
Dokumen muncul di Repositori Dokumen sebagai Bukti Dukung Mitigasi
```

### 8.3 Aturan Keamanan Integrasi

- API key GOJAGS Office hanya boleh digunakan server-side.
- Client/browser tidak boleh memanggil GOJAGS Office langsung dengan API key.
- Endpoint internal integrasi harus mengikuti permission aplikasi.
- PDF presensi yang diambil dari GOJAGS Office harus divalidasi sebagai PDF sebelum disimpan.
- File daftar hadir disimpan sebagai dokumen aplikasi, bukan sebagai binary di database.

---

## 9. Data Model Utama

| Model | Fungsi |
|---|---|
| `IdentifikasiRisiko` | Data risiko utama, termasuk tahun dan relasi konteks. |
| `AnalisisRisiko` | Data analisis risiko inheren. |
| `EvaluasiRisiko` | Data evaluasi dan residual risk. |
| `RencanaPenanganan` | Rencana dan realisasi mitigasi risiko. |
| `DokumenPendukung` | Bukti pendukung mitigasi yang terkait ke `RencanaPenanganan`. |
| `Repositori` | Dokumen manual repository seperti pedoman dan laporan. |
| `User`, `Role`, `Permission` | Autentikasi dan otorisasi. |
| `AuditLog` | Jejak aktivitas penting. |

### 9.1 Dokumen Repository

Repositori Dokumen adalah gabungan dari:

- Tabel `Repositori` untuk dokumen manual.
- Tabel `DokumenPendukung` untuk bukti dukung mitigasi dari Pemantauan Risiko.

Mapping repository:

| Sumber Data | Category | Label UI |
|---|---|---|
| `Repositori.category = pedoman` | `pedoman` | Pedoman |
| `Repositori.category = laporan` | `laporan` | Laporan |
| `DokumenPendukung` | `bukti_dukung` | Bukti Dukung Mitigasi |

Tidak diperlukan migrasi database untuk kebutuhan repository saat ini karena field existing `url`, `title`, dan `summary` sudah cukup.

---

## 10. Arsitektur Teknis

| Layer | Teknologi |
|---|---|
| Frontend | Next.js App Router, React |
| UI | Mantine UI |
| Admin/Data | Refine |
| Spreadsheet | Handsontable |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| ORM | Prisma |
| File Storage | Penyimpanan file persistent di server |
| PDF Processing | Server-side PDF text extraction |
| Export | ExcelJS |
| Auth | Cookie-based custom session |
| Deployment | Server organisasi sendiri |

### 10.1 Diagram Konseptual

```text
Browser
  |
  v
Next.js App Router
  |
  +--> API Routes
        |
        +--> Prisma --> PostgreSQL
        |
        +--> File Storage --> Persistent upload directory
```

### 10.2 Flow Upload Dokumen

```text
User upload file
  |
  v
POST /api/upload
  |
  v
Simpan file ke penyimpanan dokumen server
  |
  v
Return URL/path dokumen
  |
  v
Save metadata dokumen ke database
```

### 10.3 Flow Bukti Dukung Mitigasi

```text
Pemantauan Risiko
  |
  v
Upload bukti pendukung
  |
  v
Save RencanaPenanganan + DokumenPendukung
  |
  v
Repositori Dokumen fetches DokumenPendukung
  |
  v
Display as category bukti_dukung / Bukti Dukung Mitigasi
```

---

## 11. Konfigurasi Server

Server aplikasi harus menyediakan:

- Environment variable database sesuai konfigurasi PostgreSQL.
- Secret/session key untuk autentikasi.
- Folder persistent untuk file upload.
- `GOJAGS_OFFICE_API_KEY_RAPAT` untuk integrasi data rapat GOJAGS Office.
- `GOJAGS_OFFICE_BASE_URL` jika base URL GOJAGS Office perlu dikonfigurasi eksplisit.
- Permission filesystem yang memungkinkan aplikasi membaca, menulis, dan menghapus file upload.
- Backup database dan folder upload secara berkala.

Catatan keamanan:

- Secret tidak boleh disimpan di source code.
- File `.env` tidak boleh di-commit ke Git.
- Folder upload tidak boleh di-commit ke Git.
- File upload harus divalidasi dari sisi server.

---

## 12. Kebutuhan Non-Fungsional

| ID | Requirement | Deskripsi |
|---|---|---|
| NFR-01 | Security | Secret aplikasi dan konfigurasi server tidak boleh terekspos ke client. |
| NFR-02 | Storage persistence | File upload harus tetap tersedia setelah restart atau redeploy aplikasi. |
| NFR-03 | Compatibility | Data lama dengan path `uploads/<filename>` tetap dapat dibaca. |
| NFR-04 | Reliability | Upload, preview, download, summarize, dan delete harus berjalan konsisten. |
| NFR-05 | Maintainability | Logic upload dan pembacaan file harus mudah dirawat dan tidak tersebar berlebihan. |
| NFR-06 | Performance | Preview/download harus menangani ukuran file yang didukung secara efisien. |
| NFR-07 | Data integrity | Database hanya menyimpan metadata/URL/summary, bukan binary file. |
| NFR-08 | Auditability | Aktivitas penting tetap dapat dilacak sesuai mekanisme audit aplikasi. |
| NFR-09 | Usability | Upload harus memberikan notifikasi sukses/gagal yang jelas. |
| NFR-10 | Backup readiness | Database dan folder upload harus dapat dibackup dan dipulihkan. |
| NFR-11 | Integration security | API key GOJAGS Office tidak boleh terekspos ke client. |

---

## 13. Acceptance Criteria

### 13.1 Manajemen Dokumen

- [ ] File upload tersimpan di penyimpanan dokumen server.
- [ ] Folder upload dibuat otomatis atau tersedia saat aplikasi berjalan.
- [ ] Upload dari Repositori Dokumen berhasil.
- [ ] Upload bukti pendukung dari Pemantauan Risiko berhasil.
- [ ] Preview/download dokumen berhasil melalui route aplikasi.
- [ ] Summarization PDF berhasil membaca file dari penyimpanan dokumen.
- [ ] Delete dokumen menghapus record dan file upload yang dikelola aplikasi.
- [ ] Binary file tidak disimpan langsung di database.

### 13.2 Repositori Dokumen

- [ ] Dokumen manual muncul di Repositori Dokumen.
- [ ] Bukti pendukung dari Pemantauan Risiko muncul sebagai `Bukti Dukung Mitigasi`.
- [ ] Dokumen bukti pendukung tetap tersimpan meskipun user tidak mengisi judul, selama file/URL tersedia.
- [ ] Filter kategori `bukti_dukung` menampilkan bukti pendukung mitigasi.
- [ ] Summary PDF dapat dibuat untuk dokumen repository yang didukung.

### 13.3 Peran Pengguna

- [ ] Sistem hanya menggunakan role admin, ketua tim, anggota tim, dan pimpinan.
- [ ] Admin dapat mengelola konfigurasi utama aplikasi.
- [ ] Ketua Tim dapat mengelola atau memantau risiko pada lingkup tim/unitnya.
- [ ] Anggota Tim dapat menginput dan memperbarui data sesuai lingkup penugasannya.
- [ ] Pimpinan dapat melihat dashboard, laporan, dan ringkasan risiko organisasi.
- [ ] Menu dan API mengikuti permission user.

### 13.4 Integrasi GOJAGS Office

- [ ] User dapat mencari rapat GOJAGS Office dari modal Pemantauan Risiko.
- [ ] Hasil pencarian menampilkan agenda, tanggal, jam, pemimpin, ruangan, status, dan jumlah peserta.
- [ ] User dapat mengambil PDF daftar hadir dari rapat yang dipilih.
- [ ] PDF daftar hadir tersimpan sebagai dokumen pendukung mitigasi.
- [ ] Dokumen daftar hadir muncul di Repositori Dokumen sebagai `Bukti Dukung Mitigasi` setelah realisasi disimpan.
- [ ] API key GOJAGS Office tidak pernah dikirim ke client.

---

## 14. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Folder upload tidak persistent | File hilang setelah restart atau redeploy | Gunakan folder persistent di server dan backup berkala. |
| Permission filesystem tidak sesuai | Upload, preview, atau delete gagal | Pastikan user proses aplikasi memiliki akses baca/tulis/hapus pada folder upload. |
| Data lama memakai path `uploads/<filename>` | Dokumen lama tidak bisa dibaca | Route dokumen harus tetap mendukung format path lama. |
| User upload bukti pendukung tanpa judul | Dokumen tidak masuk repository | Gunakan nama file/fallback sebagai judul. |
| File upload berbahaya | Risiko keamanan server | Validasi tipe file, ukuran file, dan jangan eksekusi file upload sebagai script. |
| PDF parser gagal membaca file tertentu | Summary gagal | Tampilkan pesan error yang jelas dan jangan merusak record dokumen. |
| API key GOJAGS Office terekspos | Risiko keamanan integrasi | Semua call GOJAGS Office dilakukan via API internal server-side. |
| Endpoint GOJAGS Office tidak tersedia | User tidak bisa mengambil daftar hadir | Tampilkan pesan error dan tetap izinkan upload/link manual. |

---

## 15. Release Checklist

- [ ] Jalankan `npm run build`.
- [ ] Jalankan typecheck jika tersedia, misalnya `npx tsc --noEmit --pretty false`.
- [ ] Pastikan konfigurasi database tersedia di server.
- [ ] Pastikan secret/session key tersedia di server.
- [ ] Pastikan `GOJAGS_OFFICE_API_KEY_RAPAT` tersedia di server.
- [ ] Pastikan folder upload persistent tersedia di server.
- [ ] Pastikan folder upload tidak di-track Git.
- [ ] Test upload repository.
- [ ] Test upload bukti pendukung di Pemantauan Risiko.
- [ ] Test search rapat GOJAGS Office dari Pemantauan Risiko.
- [ ] Test import PDF daftar hadir GOJAGS Office sebagai dokumen pendukung.
- [ ] Test preview/download.
- [ ] Test summarize PDF.
- [ ] Test delete dokumen.
- [ ] Test backup dan restore database serta folder upload.

---

## 16. Glosarium

| Istilah | Definisi |
|---|---|
| ERM | Enterprise Risk Management / Manajemen Risiko Enterprise. |
| GOJAGS Risk | Nama aplikasi manajemen risiko. |
| ISO 31000 | Standar internasional manajemen risiko. |
| SNI 8615 | Standar Nasional Indonesia untuk manajemen risiko. |
| RBAC | Role-Based Access Control. |
| KRI | Key Risk Indicator. |
| PIC | Person In Charge. |
| Risiko Inheren | Tingkat risiko sebelum penanganan. |
| Risiko Residual | Tingkat risiko setelah penanganan. |
| Rencana Penanganan | Rencana mitigasi atau perlakuan risiko. |
| Pemantauan Risiko | Proses memantau realisasi penanganan dan keterjadian risiko. |
| Bukti Dukung Mitigasi | Dokumen pendukung yang membuktikan pelaksanaan mitigasi risiko. |
| Repositori Dokumen | Modul untuk mengelola dan melihat dokumen manual serta bukti dukung mitigasi. |
| GOJAGS Office | Aplikasi eksternal yang menyediakan data rapat dan daftar hadir. |
| Admin | Peran pengelola sistem. |
| Ketua Tim | Peran penanggung jawab tim/unit risiko. |
| Anggota Tim | Peran pengguna operasional dalam tim. |
| Pimpinan | Peran pemantau dan pengambil keputusan tingkat organisasi. |
