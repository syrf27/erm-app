# Arsitektur Database — Sistem Informasi Manajemen Risiko (ERM)

| **Dokumen** | Database Architecture Document |
|---|---|
| **Produk** | Sistem Informasi Manajemen Risiko Enterprise (ERM) |
| **DBMS** | PostgreSQL |
| **ORM** | Prisma 7.8 |
| **Versi** | 1.0 |
| **Status** | Draf |

---

## 1. Tujuan Dokumen

Dokumen ini menjelaskan arsitektur database dari Sistem Informasi Manajemen Risiko Enterprise (ERM), mencakup model data, hubungan antar entitas, strategi migrasi, indeks, konvensi penamaan, serta pertimbangan performa.

---

## 2. Ringkasan Database

| Aspek | Detail |
|---|---|
| **DBMS** | PostgreSQL |
| **ORM** | Prisma 7.8 |
| **Jumlah Model** | 22 model |
| **Jumlah Migrasi** | 11 migrasi |
| **Strategi ID** | Auto-increment integer (`Int @id @default(autoincrement())`) |
| **Audit** | Menggunakan tabel `AuditLog` terpisah (bukan PostgreSQL trigger) |
| **Timezone** | UTC (default `DateTime` Prisma) |

---

## 3. Entity Relationship Diagram (ERD)

### 3.1 Model Inti Risiko

```
┌────────────────┐        ┌──────────────────────┐
│  Identifikasi  │ 1:1    │    AnalisisRisiko    │
│  Risiko        │────────│                      │
│                │        │ - levelKemungkinanId  │───┐
│ - jenisRisikoId│───┐    │ - levelDampakId       │───┤
│ - sumberRisiko │───┤    │ - levelRisikoId       │───┤
│ - kategoriId   │───┤    └──────────────────────┘   │
│ - areaDampakId │───┤                               │
│ - unitKerjaId  │───┤                               │
│ - kegiatanId   │───┤                               │
└────────┬───────┘   │                               │
         │           │                               │
         │ 1:1       │                               │
         ▼           │                               │
┌────────────────┐   │                               │
│  EvaluasiRisiko│   │                               │
│                │   │                               │
│ - residualLkId │───┘                               │
│ - residualLdId │───┘                               │
│ - residualLrId │───┘                               │
│ - responRisiko │                                   │
└────────┬───────┘                                   │
         │ 1:1                                       │
         ▼                                           │
┌────────────────┐                                   │
│  Rencana       │                                   │
│  Penanganan    │                                   │
│                │                                   │
│ - residualLkId │───┘                               │
│ - residualLdId │───┘                               │
│ - jenis        │                                   │
│ - penanggung   │                                   │
│ - targetWaktu  │                                   │
└────────┬───────┘                                   │
         │ 1:N                                       │
         ▼                                           │
┌────────────────┐                                   │
│  Kri           │                                   │
│ - batasHijau   │                                   │
│ - batasKuning  │                                   │
│ - batasMerah   │                                   │
│ - nilaiAktual  │                                   │
└────────────────┘                                   │
                                                     │
┌────────────────┐                                   │
│  Level         │◀──────────────────────────────────┘
│  Kemungkinan   │ (digunakan oleh Analisis, Evaluasi,
│ - skala (1-5)  │  RencanaPenanganan, Matriks)
└────────────────┘

┌────────────────┐
│  Level Dampak  │◀────────────────────────────────────┘
│ - skala (1-5)  │ (digunakan oleh Analisis, Evaluasi,
└────────────────┘  RencanaPenanganan, Matriks)

┌────────────────┐
│  Level Risiko  │◀────────────────────────────────────┘
│ - warna        │ (digunakan oleh Analisis, Evaluasi,
│ - rentang      │  Matriks)
│ - tindakan     │
└────────────────┘
```

### 3.2 Model Referensi & Konteks

```
┌───────────────┐     ┌──────────────────┐
│  UnitKerja    │─────│  Kegiatan        │
│ - kode (uniq) │     │ - unitKerjaId    │
│ - nama (uniq) │     │ - sasaranId      │
└───────┬───────┘     └────────┬─────────┘
        │                     │
        │                     │
┌───────┴───────┐     ┌───────┴─────────┐
│  Sasaran      │     │  ProsesBisnis    │
│ - unitKerjaId │     │ - kegiatanId    │
└───────────────┘     └─────────────────┘

┌───────────────┐    ┌──────────────────┐    ┌───────────────┐
│  JenisRisiko  │    │  SumberRisiko    │    │ KategoriRisiko│
│ - nama (uniq) │    │ - nama (uniq)    │    │ - nama        │
└───────────────┘    └──────────────────┘    └───────┬───────┘
                                                     │
                     ┌───────────────────────┬────────┘
                     ▼                       ▼
            ┌────────────────┐     ┌──────────────────┐
            │  Kriteria      │     │  SeleraRisiko    │
            │  Kemungkinan   │     │ - kategoriId     │
            │ - kategoriId   │     │ - nilaiMin       │
            │ - levelKemungkinanId │                  │
            │ - persentase   │     └──────────────────┘
            └────────────────┘

┌───────────────┐    ┌──────────────────┐    ┌───────────────┐
│  AreaDampak   │    │  KriteriaDampak  │    │OpsiPenanganan │
│ - nama        │    │ - nama           │    │ - nama        │
└───────────────┘    └──────────────────┘    └───────────────┘

┌──────────────────────┐
│  MatriksAnalisis     │
│  Risiko              │
│ - levelKemungkinanId │───┐
│ - levelDampakId      │───┤
│ - besaran (skor)     │   │
│ - levelRisikoId      │───┤
└──────────────────────┘   │
                           │
┌───────────────┐          │
│  Level        │◀─────────┘
│  Kemungkinan  │ (skala 1-5)
└───────────────┘

┌───────────────┐
│  Level Dampak │◀────────────────────────────────┘
│ (skala 1-5)   │
└───────────────┘

┌───────────────┐
│  Level Risiko │◀────────────────────────────────┘
│ - warna       │
│ - rentang     │
│ - tindakan    │
└───────────────┘
```

### 3.3 Model Keamanan & Audit

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   User   │────▶│    Role      │◀────│ RolePerm     │────▶ Permission
│ - email  │     │ - name (uniq)│     └──────────────┘     │
│ - roleId │     └──────────────┘                          │ - resource
│ - pass   │                                              │ - action
└────┬─────┘                                              │
     │                                                     │
     └────────────────────────────────────────────────────▶│
                         UserPermission                    │
                         (grant/deny override)             │
                                                           │
┌─────────────────────────────────────────────────────────┘
│
▼
┌──────────┐
│ AuditLog │
│ - userId │
│ - action │──▶ CREATE, UPDATE, DELETE, LOGIN, LOGOUT
│ - resource
│ - details (Json)
│ - timestamp
└──────────┘
```

---

## 4. Model Data Detail

### 4.1 Model Konteks

| Model | Kolom Kunci | Relasi |
|---|---|---|
| **UnitKerja** | `id`, `nama` (unique), `kode` (unique) | ⬌ Kegiatan, Sasaran, IdentifikasiRisiko |
| **Kegiatan** | `id`, `nama`, `unitKerjaId?`, `sasaranId?` | → UnitKerja, Sasaran; ⬌ ProsesBisnis, IdentifikasiRisiko |
| **Sasaran** | `id`, `nama`, `unitKerjaId?` | → UnitKerja; ⬌ Kegiatan |
| **ProsesBisnis** | `id`, `nama`, `kegiatanId?` | → Kegiatan |
| **PemangkuKepentingan** | `id`, `nama` | Standalone |
| **PeraturanPerundangan** | `id`, `nama` | Standalone |

### 4.2 Model Referensi Risiko

| Model | Kolom Kunci | Relasi |
|---|---|---|
| **JenisRisiko** | `id`, `nama` (unique) | ⬌ IdentifikasiRisiko |
| **SumberRisiko** | `id`, `nama` (unique) | ⬌ IdentifikasiRisiko |
| **KategoriRisiko** | `id`, `nama` | ⬌ IdentifikasiRisiko, KriteriaKemungkinan, SeleraRisiko |
| **AreaDampak** | `id`, `nama` | ⬌ IdentifikasiRisiko |
| **LevelKemungkinan** | `id`, `nama`, `skala` (1-5) | ⬌ AnalisisRisiko, EvaluasiRisiko, RencanaPenanganan, MatriksAnalisisRisiko, KriteriaKemungkinan |
| **LevelDampak** | `id`, `nama`, `skala` (1-5), `deskripsi?` | ⬌ AnalisisRisiko, EvaluasiRisiko, RencanaPenanganan, MatriksAnalisisRisiko |
| **LevelRisiko** | `id`, `nama`, `rentang?`, `tindakan?`, `warna?` | ⬌ AnalisisRisiko, EvaluasiRisiko, MatriksAnalisisRisiko |
| **KriteriaKemungkinan** | `id`, `kategoriRisikoId`, `levelKemungkinanId`, `persentaseKemungkinan`, `deskripsi?` | → KategoriRisiko, LevelKemungkinan |
| **KriteriaDampak** | `id`, `nama`, `deskripsi?` | Standalone |
| **SeleraRisiko** | `id`, `kategoriRisikoId`, `besaranRisikoMinimum`, `deskripsi?` | → KategoriRisiko |
| **OpsiPenanganan** | `id`, `nama`, `deskripsi?` | Standalone |
| **MatriksAnalisisRisiko** | `id`, `levelKemungkinanId`, `levelDampakId`, `besaran`, `levelRisikoId` | → LevelKemungkinan, LevelDampak, LevelRisiko |

### 4.3 Model Inti Risiko

| Model | Kolom Kunci | Relasi |
|---|---|---|
| **IdentifikasiRisiko** | `id`, `risiko`, `jenisRisikoId`, `sumberRisikoId`, `kategoriRisikoId`, `areaDampakId`, `penyebab?`, `dampak?`, `kegiatanId?`, `unitKerjaId?` | → JenisRisiko, SumberRisiko, KategoriRisiko, AreaDampak, UnitKerja, Kegiatan; ⬌ AnalisisRisiko (1:1), EvaluasiRisiko (1:1), RencanaPenanganan (1:1), Kri (1:N) |
| **AnalisisRisiko** | `id`, `identifikasiRisikoId` (unique), `levelKemungkinanId?`, `levelDampakId?`, `levelRisikoId?`, `pengendalianUraian?`, `pengendalianEfektivitas?` | → IdentifikasiRisiko, LevelKemungkinan, LevelDampak, LevelRisiko |
| **EvaluasiRisiko** | `id`, `identifikasiRisikoId` (unique), `responRisiko?`, `residualLevelKemungkinanId?`, `residualLevelDampakId?`, `residualLevelRisikoId?` | → IdentifikasiRisiko, LevelKemungkinan, LevelDampak, LevelRisiko |
| **RencanaPenanganan** | `id`, `identifikasiRisikoId` (unique), `jenisPenanganan?`, `rencanaTidakPenanganan?`, `targetOutput?`, `targetWaktu?`, `penanggungJawab?`, `residualLevelKemungkinanId?`, `residualLevelDampakId?`, `keterjadiRisiko?`, `realisasiWaktu?`, `realisasiOutput?`, `dokumenPendukung?`, `persetujuan?`, `disetujuiOleh?` | → IdentifikasiRisiko, LevelKemungkinan, LevelDampak |

### 4.4 Model KRI

| Model | Kolom Kunci | Relasi |
|---|---|---|
| **Kri** | `id`, `namaIndikator`, `batasHijau?`, `batasKuning?`, `batasMerah?`, `nilaiAktual?`, `frekuensiPemantauan?`, `identifikasiRisikoId?`, `penanggungJawab?`, `targetNilaiHarapan?` | → IdentifikasiRisiko |

### 4.5 Model Keamanan

| Model | Kolom Kunci | Relasi |
|---|---|---|
| **User** | `id`, `email` (unique), `name`, `roleId`, `password` | → Role; ⬌ UserPermission |
| **Role** | `id`, `name` (unique), `description?` | ⬌ User, RolePermission |
| **Permission** | `id`, `resource`, `action` (unique: resource+action) | ⬌ RolePermission, UserPermission |
| **RolePermission** | `roleId`, `permissionId` (composite PK) | → Role, Permission (Cascade delete) |
| **UserPermission** | `userId`, `permissionId` (composite PK), `value` ("grant"/"deny") | → User, Permission (Cascade delete) |

### 4.6 Model Audit

| Model | Kolom Kunci | Index |
|---|---|---|
| **AuditLog** | `id`, `userId`, `userName`, `action`, `resource`, `resourceId?`, `details` (Json?), `ipAddress?`, `userAgent?`, `timestamp` | `@@index([userId])`, `@@index([action])`, `@@index([resource])`, `@@index([timestamp])` |

### 4.7 Model Lainnya

| Model | Kolom Kunci |
|---|---|
| **Faq** | `id`, `question`, `answer`, `order` (urutan tampil) |

---

## 5. Hubungan & Relasi

### 5.1 Relasi 1:1

Dari IdentifikasiRisiko ke model turunan — setiap risiko hanya memiliki satu analisis, satu evaluasi, dan satu rencana penanganan:

| Model | Kolom FK | Unik |
|---|---|---|
| `AnalisisRisiko.identifikasiRisikoId` | → `IdentifikasiRisiko.id` | `@unique` |
| `EvaluasiRisiko.identifikasiRisikoId` | → `IdentifikasiRisiko.id` | `@unique` |
| `RencanaPenanganan.identifikasiRisikoId` | → `IdentifikasiRisiko.id` | `@unique` |

### 5.2 Relasi 1:N

| Sumber | Tujuan | Foreign Key |
|---|---|---|
| `UnitKerja` | `Kegiatan` | `kegiatan.unitKerjaId` |
| `UnitKerja` | `Sasaran` | `sasaran.unitKerjaId` |
| `UnitKerja` | `IdentifikasiRisiko` | `identifikasiRisiko.unitKerjaId` |
| `Sasaran` | `Kegiatan` | `kegiatan.sasaranId` |
| `Kegiatan` | `ProsesBisnis` | `prosesBisnis.kegiatanId` |
| `Kegiatan` | `IdentifikasiRisiko` | `identifikasiRisiko.kegiatanId` |
| `KategoriRisiko` | `KriteriaKemungkinan` | `kriteriaKemungkinan.kategoriRisikoId` |
| `KategoriRisiko` | `SeleraRisiko` | `seleraRisiko.kategoriRisikoId` |
| `LevelKemungkinan` | `AnalisisRisiko` | `analisisRisiko.levelKemungkinanId` |
| `LevelKemungkinan` | `EvaluasiRisiko` | `evaluasiRisiko.residualLevelKemungkinanId` |
| `LevelKemungkinan` | `MatriksAnalisisRisiko` | `matriksAnalisisRisiko.levelKemungkinanId` |
| `LevelDampak` | `AnalisisRisiko` | `analisisRisiko.levelDampakId` |
| `LevelDampak` | `EvaluasiRisiko` | `evaluasiRisiko.residualLevelDampakId` |
| `LevelDampak` | `MatriksAnalisisRisiko` | `matriksAnalisisRisiko.levelDampakId` |
| `LevelRisiko` | `AnalisisRisiko` | `analisisRisiko.levelRisikoId` |
| `LevelRisiko` | `EvaluasiRisiko` | `evaluasiRisiko.residualLevelRisikoId` |
| `LevelRisiko` | `MatriksAnalisisRisiko` | `matriksAnalisisRisiko.levelRisikoId` |
| `IdentifikasiRisiko` | `Kri` | `kri.identifikasiRisikoId` |
| `Role` | `User` | `user.roleId` |

### 5.3 Relasi M:N (Junction Tables)

| Tabel Junction | Kiri | Kanan | Composite Key |
|---|---|---|---|
| `RolePermission` | `Role` | `Permission` | `[roleId, permissionId]` |
| `UserPermission` | `User` | `Permission` | `[userId, permissionId]` |

---

## 6. Indeks & Optimasi

### 6.1 Indeks Eksplisit

```prisma
model AuditLog {
  @@index([userId])     // Filter log by user
  @@index([action])     // Filter log by action type
  @@index([resource])   // Filter log by resource
  @@index([timestamp])  // Sort/range filter by date
}
```

### 6.2 Indeks Implisit (dari Prisma)

Prisma secara otomatis membuat indeks untuk:
- **Primary Key** (`@id`) — setiap model
- **Unique constraint** (`@unique`) — `User.email`, `UnitKerja.nama`, `UnitKerja.kode`, `JenisRisiko.nama`, `SumberRisiko.nama`, `Role.name`, `Permission.[resource, action]`
- **Foreign Key** — setiap kolom dengan `@relation()` otomatis diindeks oleh Prisma

### 6.3 Strategi Query

| Query | Model | Filter | Pagination |
|---|---|---|---|
| List data referensi | Semua model konteks | Optional filter | `skip`/`take` |
| List IdentifikasiRisiko | `IdentifikasiRisiko` | `include` relasi | `skip`/`take` |
| Dashboard stats | Agregasi multi-tabel | - | Single query |
| Audit log | `AuditLog` | user, action, resource, date range | `skip`/`take` |
| Identifikasi spreadsheet | `IdentifikasiRisiko` + relasi | `include` all FK | - |

---

## 7. Strategi Migrasi

### 7.1 Riwayat Migrasi

| No | Nama Migrasi | Tanggal | Perubahan |
|---|---|---|---|
| 1 | `add_new_models` | 24 Jun | Model awal: UnitKerja, Kegiatan, Sasaran, ProsesBisnis, PemangkuKepentingan, PeraturanPerundangan, Jenis/Sumber/Kategori Risiko, AreaDampak, Level Kemungkinan/Dampak/Risiko, OpsiPenanganan, Faq, KriteriaKemungkinan, SeleraRisiko, User, Role, Permission, RolePermission, UserPermission |
| 2 | `add_identifikasi_risiko` | 24 Jun | Model IdentifikasiRisiko |
| 3 | `add_analisis_risiko` | 24 Jun | Model AnalisisRisiko |
| 4 | `make_level_fks_optional` | 24 Jun | Ubah FK LevelKemungkinan/Dampak/Risiko jadi opsional |
| 5 | `add_evaluasi_risiko` | 24 Jun | Model EvaluasiRisiko |
| 6 | `add_rencana_penanganan` | 24 Jun | Model RencanaPenanganan |
| 7 | `add_kri` | 24 Jun | Model Kri |
| 8 | `audit_log_and_management_user` | 29 Jun | Model AuditLog, tambah kolom ke User |
| 9 | `add_kertas_kerja_fields` | 29 Jun | Tambah field Kertas Kerja ke RencanaPenanganan |
| 10 | `add_evaluasi_residual` | 29 Jun | Tambah field residual risk ke EvaluasiRisiko |
| 11 | `add_faq_model` | 29 Jun | Model Faq |

### 7.2 Perintah Migrasi

```bash
# Development: buat migrasi baru
npx prisma migrate dev --name nama_migrasi

# Production: apply migrasi
npx prisma migrate deploy

# Reset database + seed
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

---

## 8. Skema Seed

Skrip seed (`prisma/seed.ts`) mengisi data awal:

| Data | Detail |
|---|---|
| **JenisRisiko** | Positif, Negatif |
| **SumberRisiko** | Internal, Eksternal |
| **LevelRisiko** | 5 level (Sangat Rendah — Sangat Tinggi) dengan warna, rentang skor, dan tindakan |
| **UnitKerja** | SESTAMA, INSPEKTORAT, DJP, DJBC |
| **LevelKemungkinan** | 5 level (skala 1-5) |
| **LevelDampak** | 5 level (skala 1-5) |
| **MatriksAnalisisRisiko** | 25 sel (5×5) dengan besaran skor dan mapping ke LevelRisiko |
| **AreaDampak** | 5 area (Reputasi, Layanan, Kecelakaan, Hukum, Fraud) |
| **KategoriRisiko** | 5 kategori (sama dengan AreaDampak) |
| **KriteriaDampak** | 5 kriteria |
| **Roles** | admin (full akses), ketua tim (akses terbatas) |
| **Permissions** | 25 resource × 4 action = 100 permission |
| **Users** | admin@erm.com (admin123), ketuatim@erm.com (tim123) |

---

## 9. Konvensi Penamaan

| Aspek | Konvensi | Contoh |
|---|---|---|
| **Nama Model** | PascalCase, singular | `IdentifikasiRisiko`, `LevelKemungkinan` |
| **Nama Kolom** | camelCase | `unitKerjaId`, `createdAt` |
| **Tabel (Prisma)** | Auto dari nama model | `IdentifikasiRisiko` → `identifikasi_risiko` (PostgreSQL) |
| **Foreign Key** | `modelField` + `Id` | `jenisRisikoId`, `unitKerjaId` |
| **Field Waktu** | `createdAt`, `updatedAt` | `@default(now())`, `@updatedAt` |
| **Composite Key** | `@@id([fieldA, fieldB])` | `RolePermission: [roleId, permissionId]` |
| **Unique Constraint** | `@@unique([fieldA, fieldB])` | `Permission: [resource, action]` |

---

## 10. Pertimbangan Performa

| Aspek | Pendekatan |
|---|---|
| **Pagination** | Semua list menggunakan `skip`/`take` server-side |
| **Eager Loading** | `include` relasi yang diperlukan (FK reference data) |
| **N+1 Query** | Dihindari dengan `include` di Prisma (JOIN SQL) |
| **Agregasi Dashboard** | Single query ke PostgreSQL dengan `count`, `groupBy`, `aggregate` |
| **Audit Log** | Index di kolom yang sering difilter (userId, action, resource, timestamp) |
| **Batch Insert** | `createMany` untuk data massal (seed, Handsontable save) |
| **Unique Index** | Memastikan integritas data (email, nama resource tertentu) |

---

## 11. Diagram Relasi Lengkap

```
┌───────────────────┐
│  Pemangku         │       ┌──────────────────────┐
│  Kepentingan      │       │  Peraturan           │
└───────────────────┘       │  Perundangan         │
                            └──────────────────────┘

┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  JenisRisiko      │────┐│  SumberRisiko     │────┐│  KategoriRisiko   │────┐
└───────────────────┘    │└───────────────────┘    │└───────────────────┘    │
                         │                         │                         │
┌───────────────────┐    │┌───────────────────┐    │┌───────────────────┐    │
│  AreaDampak       │────┤│  Identifikasi     │◀───┘│  Kriteria         │    │
└───────────────────┘    └┤  Risiko           │     │  Kemungkinan      │◀───┘
                          └────────┬──────────┘     └───────────────────┘
┌───────────────────┐              │ 1:1
│  UnitKerja        │────┐         ▼
└───────────────────┘    │  ┌──────────────┐
                         │  │  Analisis    │───┐
┌───────────────────┐    │  │  Risiko      │   │
│  Kegiatan         │────┤  └──────────────┘   │
└───────────────────┘    │                     │
                         │  ┌──────────────┐   │
┌───────────────────┐    │  │  Evaluasi    │   │
│  Sasaran          │────┘  │  Risiko      │   │
└───────────────────┘       └──────────────┘   │
                                               │
┌───────────────────┐                          │
│  ProsesBisnis     │                          │
└───────────────────┘                          │
                                               │
┌───────────────────┐     ┌──────────────┐     │
│  Level            │◀────│  Matriks     │     │
│  Kemungkinan      │     │  Analisis    │     │
│  (skala 1-5)      │     │  Risiko      │     │
└───────────────────┘     └──────────────┘     │
                          (5×5 = 25 sel)       │
┌───────────────────┐                          │
│  Level Dampak     │◀─────────────────────────┘
│  (skala 1-5)      │
└───────────────────┘
     │
     ▼
┌───────────────────┐
│  Level Risiko     │
│  (5 level)        │
└───────────────────┘

┌───────────────────┐
│  SeleraRisiko     │
│  - kategoriId     │
│  - nilaiMin       │
└───────────────────┘

┌───────────────────┐     ┌───────────────────┐
│  Identifikasi     │────▶│  Kri              │
│  Risiko           │ 1:N │  (Key Risk        │
└───────────────────┘     │   Indicator)       │
                          └───────────────────┘
┌───────────────────┐     ┌───────────────────┐
│  Rencana          │────▶│  AuditLog         │
│  Penanganan       │ 1:1 │  - userId         │
└───────────────────┘     │  - action         │
                          │  - resource       │
┌───────────────────┐     │  - timestamp      │
│  OpsiPenanganan   │     └───────────────────┘
└───────────────────┘

┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  User             │────▶│  Role             │◀────│  RolePermission   │────▶ Permission
└────────┬──────────┘     └───────────────────┘     └───────────────────┘     │
         │                                                                     │
         └────────────────────────────────────────────────────────────────────▶│
                              UserPermission (grant/deny)                      │
                                                                               │
┌───────────────────┐                                                         │
│  Faq              │                                                         │
└───────────────────┘                                                         │
                                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Permission (resource + action unique)                                          │
│  Contoh: ("identifikasi-risiko", "create"), ("users", "read"), ("audit-logs", "delete") │
└──────────────────────────────────────────────────────────────────────────────────┘
```
