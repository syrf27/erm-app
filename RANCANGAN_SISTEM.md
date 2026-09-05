# RANCANGAN_SISTEM.md

Sistem: **Gojags Risk** (Aplikasi Enterprise Risk Management / Manajemen Risiko)

## 1. Rancangan Modul/Fitur

| Modul | Fitur Utama | Deskripsi | Pengguna/Role |
| ----- | ----------- | --------- | ------------- |
| Dashboard | Ringkasan Risiko | Menampilkan statistik dan ringkasan status risiko. | Admin, Ketua Tim, Anggota Tim |
| Penetapan Konteks | Tim Kerja, Kegiatan, Sasaran, Proses Bisnis, Pemangku Kepentingan, Peraturan Perundangan, Jenis Risiko, Sumber Risiko, Kategori Risiko, Area Dampak, Level Kemungkinan, Level Dampak, Kriteria Kemungkinan, Kriteria Dampak, Level Risiko, Matriks Risiko, Opsi Penanganan | Pengelolaan data referensi/master yang mendasari proses manajemen risiko. | Admin, Ketua Tim, Anggota Tim |
| Identifikasi Risiko | Daftar & Entri Risiko | Pencatatan risiko, penyebab, dan dampak yang diidentifikasi. | Admin, Ketua Tim, Anggota Tim |
| Analisis Risiko | Penilaian Risiko | Penentuan level kemungkinan dan dampak serta besaran risiko. | Admin, Ketua Tim, Anggota Tim |
| Evaluasi Risiko | Evaluasi & Respon Risiko | Penentuan tingkat toleransi dan pemilihan respon/penanganan risiko. | Admin, Ketua Tim, Anggota Tim |
| Rencana Penanganan (RTP) | Rencana Mitigasi | Penyusunan rencana penanganan risiko beserta dokumen pendukung. | Admin, Ketua Tim, Anggota Tim |
| Matriks Risiko | Visualisasi Matriks | Tampilan matriks pemetaan risiko. | Admin, Ketua Tim, Anggota Tim |
| Pemantauan Risiko | Pantauan Berkala | Pemantauan perkembangan dan realisasi penanganan risiko. | Admin, Ketua Tim, Anggota Tim |
| Pelaporan Risiko | Laporan Risiko | Penyajian laporan hasil manajemen risiko. | Admin, Ketua Tim, Anggota Tim |
| Bank Risiko | Kumpulan Risiko | Repositori terpusat kumpulan risiko (pencarian/akses cepat). | Admin, Ketua Tim, Anggota Tim |
| Repositori Dokumen | Dokumen Pedoman & Laporan | Penyimpanan dan akses dokumen pedoman/laporan. | Admin, Ketua Tim, Anggota Tim (baca) |
| Audit Log | Log Aktivitas | Pencatatan dan penelaahan log akses/aktivitas sistem. | Admin |
| Manajemen Pengguna | Pengguna | Kelola akun pengguna, peran, dan tim. | Admin |
| Manajemen Hak Akses | Role Permissions | Kelola peran dan hak akses (permission) pengguna. | Admin |
| Pusat Notifikasi | Notifikasi | Pengelolaan notifikasi dalam aplikasi. | Admin |
| FAQ | Tanya Jawab | Halaman pertanyaan yang sering diajukan. | Admin, Ketua Tim, Anggota Tim (baca) |

## 2. Struktur Menu

```text
Dashboard
├── Manajemen Risiko
│   ├── Penetapan Konteks
│   ├── Identifikasi Risiko
│   ├── Analisis Risiko
│   ├── Evaluasi Risiko
│   ├── Rencana Penanganan
│   └── Matriks Risiko
├── Pemantauan Risiko
├── Pelaporan Risiko
├── Bank Risiko
├── Repositori Dokumen
├── Audit Log
├── Manajemen Akses
│   ├── Pusat Notifikasi
│   ├── Pengguna
│   └── Role Permissions
└── FAQ
```

| Menu | Submenu | Route/Path | Role yang Dapat Mengakses |
| ---- | ------- | ---------- | ------------------------- |
| Dashboard | - | `/` | Admin, Ketua Tim, Anggota Tim |
| Manajemen Risiko | Penetapan Konteks | `/manajemen-risiko/penetapan-konteks` | Admin, Ketua Tim, Anggota Tim |
| Manajemen Risiko | Identifikasi Risiko | `/manajemen-risiko/identifikasi` | Admin, Ketua Tim, Anggota Tim |
| Manajemen Risiko | Analisis Risiko | `/manajemen-risiko/analisis` | Admin, Ketua Tim, Anggota Tim |
| Manajemen Risiko | Evaluasi Risiko | `/manajemen-risiko/evaluasi` | Admin, Ketua Tim, Anggota Tim |
| Manajemen Risiko | Rencana Penanganan | `/manajemen-risiko/rencana` | Admin, Ketua Tim, Anggota Tim |
| Manajemen Risiko | Matriks Risiko | `/manajemen-risiko/matriks-risiko` | Admin, Ketua Tim, Anggota Tim |
| Pemantauan Risiko | - | `/pemantauan-risiko` | Admin, Ketua Tim, Anggota Tim |
| Pelaporan Risiko | - | `/pelaporan-risiko` | Admin, Ketua Tim, Anggota Tim |
| Bank Risiko | - | `/bank-risiko` | Admin, Ketua Tim, Anggota Tim |
| Repositori Dokumen | - | `/repositori` | Admin, Ketua Tim, Anggota Tim |
| Audit Log | - | `/audit-log` | Admin |
| Manajemen Akses | Pusat Notifikasi | `/notification-center` | Admin |
| Manajemen Akses | Pengguna | `/users` | Admin |
| Manajemen Akses | Role Permissions | `/roles` | Admin |
| FAQ | - | `/faq` | Admin, Ketua Tim, Anggota Tim |

Catatan: Halaman KRI (`/kri`) dan modul blog/kategori terdapat pada kode namun tidak ditampilkan dalam navigasi sidebar.

## 3. Rancangan Antarmuka

**Tautan Figma:** [Tambahkan tautan Figma di sini]

| No | Halaman/Antarmuka | Modul | Tautan Figma |
| -- | ----------------- | ----- | ------------ |
| 1  | Dashboard | Dashboard | [Tambahkan tautan] |
| 2  | Penetapan Konteks | Penetapan Konteks | [Tambahkan tautan] |
| 3  | Identifikasi Risiko | Identifikasi Risiko | [Tambahkan tautan] |
| 4  | Analisis Risiko | Analisis Risiko | [Tambahkan tautan] |
| 5  | Evaluasi Risiko | Evaluasi Risiko | [Tambahkan tautan] |
| 6  | Rencana Penanganan | Rencana Penanganan | [Tambahkan tautan] |
| 7  | Matriks Risiko | Matriks Risiko | [Tambahkan tautan] |
| 8  | Pemantauan Risiko | Pemantauan Risiko | [Tambahkan tautan] |
| 9  | Pelaporan Risiko | Pelaporan Risiko | [Tambahkan tautan] |
| 10 | Bank Risiko | Bank Risiko | [Tambahkan tautan] |
| 11 | Repositori Dokumen | Repositori Dokumen | [Tambahkan tautan] |
| 12 | Audit Log | Audit Log | [Tambahkan tautan] |
| 13 | Pengguna | Manajemen Pengguna | [Tambahkan tautan] |
| 14 | Role Permissions | Manajemen Hak Akses | [Tambahkan tautan] |
| 15 | Pusat Notifikasi | Pusat Notifikasi | [Tambahkan tautan] |
| 16 | FAQ | FAQ | [Tambahkan tautan] |

## 4. Rancangan Hak Akses Pengguna (RBAC)

Sistem menggunakan peran (role) dengan hak akses per resource dan aksi (`create`, `read`, `update`, `delete`). Admin memiliki akses penuh (bypass semua pemeriksaan). Anggota dapat memiliki overrides izin individu (grant/deny) di luar hak peran.

### Role

| Role | Keterangan Singkat |
| ---- | ------------------ |
| Admin | Administrator dengan akses penuh ke semua resource dan aksi, termasuk fungsi administratif (pengguna, role, audit log). |
| Ketua Tim | Ketua tim yang dapat mengelola data risiko dan repositori, namun tidak memiliki akses fungsi administratif. |
| Anggota Tim | Anggota tim dengan cakupan akses sama dengan Ketua Tim berdasarkan seed. |

### Matriks Akses per Modul

| Modul/Fitur | Admin | Ketua Tim | Anggota Tim |
| ----------- | :---: | :-------: | :---------: |
| Dashboard | ✓ | ✓ | ✓ |
| Penetapan Konteks | ✓ | ✓ | ✓ |
| Identifikasi Risiko | ✓ | ✓ | ✓ |
| Analisis Risiko | ✓ | ✓ | ✓ |
| Evaluasi Risiko | ✓ | ✓ | ✓ |
| Rencana Penanganan | ✓ | ✓ | ✓ |
| Matriks Risiko | ✓ | ✓ | ✓ |
| Pemantauan Risiko | ✓ | ✓ | ✓ |
| Pelaporan Risiko | ✓ | ✓ | ✓ |
| Bank Risiko | ✓ | ✓ | ✓ |
| Repositori Dokumen | ✓ | ✓ | ✓ |
| Audit Log | ✓ | - | - |
| Manajemen Pengguna | ✓ | - | - |
| Manajemen Role & Hak Akses | ✓ | - | - |
| Pusat Notifikasi | ✓ | - | - |
| FAQ | ✓ | ✓ | ✓ |

### Matriks Aksi Granular

`C` = Create, `R` = Read, `U` = Update, `D` = Delete.

| Modul | Aksi | Admin | Ketua Tim | Anggota Tim |
| ----- | ---- | :---: | :-------: | :---------: |
| Penetapan Konteks, Identifikasi, Analisis, Evaluasi, Rencana Penanganan, Matriks Risiko, Pemantauan, Pelaporan, Bank Risiko | C / R / U / D | ✓ / ✓ / ✓ / ✓ | ✓ / ✓ / ✓ / ✓ | ✓ / ✓ / ✓ / ✓ |
| Repositori Dokumen | C / R / U / D | ✓ / ✓ / ✓ / ✓ | - / ✓ / - / - | - / ✓ / - / - |
| FAQ | C / R / U / D | ✓ / ✓ / ✓ / ✓ | - / ✓ / - / - | - / ✓ / - / - |
| Pengguna (users) | C / R / U / D | ✓ / ✓ / ✓ / ✓ | - / - / - / - | - / - / - / - |
| Role Permissions (roles) | C / R / U / D | ✓ / ✓ / ✓ / ✓ | - / - / - / - | - / - / - / - |
| Audit Log (audit-logs) | C / R / U / D | ✓ / ✓ / ✓ / ✓ | - / - / - / - | - / - / - / - |

Catatan: Hak baca (read) untuk resource `repositori` dan `upload` diberikan kepada seluruh pengguna terautentikasi. Peran Ketua Tim dan Anggota Tim memperoleh hak akses yang identik pada data seed; perbedaan antar keduanya dapat dikonfigurasi melalui *user permission override* (grant/deny) yang belum terdefinisi secara eksplisit di seed.
