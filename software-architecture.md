# Arsitektur Perangkat Lunak — Sistem Informasi Manajemen Risiko (ERM)

| **Dokumen** | Software Architecture Document (SAD) |
|---|---|
| **Produk** | Sistem Informasi Manajemen Risiko Enterprise (ERM) |
| **Versi** | 1.0 |
| **Status** | Draf |

---

## 1. Tujuan Dokumen

Dokumen ini menjelaskan arsitektur perangkat lunak dari Sistem Informasi Manajemen Risiko Enterprise (ERM). Arsitektur ini mencakup struktur sistem, komponen utama, alur data, teknologi yang digunakan, serta keputusan desain yang mendasarinya.

---

## 2. Ringkasan Arsitektur

Sistem ERM dibangun di atas arsitektur **monolitik modern** menggunakan **Next.js 16** sebagai kerangka kerja full-stack. Aplikasi ini menggunakan **App Router** Next.js yang menyatukan frontend dan backend dalam satu codebase, dengan pemisahan yang jelas antara komponen klien dan server.

Pendekatan arsitektur utama:
- **Full-stack Next.js** — frontend React 19 + backend API Routes dalam satu proyek
- **Refine v5** sebagai kerangka kerja admin yang menyediakan abstraksi CRUD, autentikasi, routing, dan data fetching
- **Prisma ORM** sebagai lapisan akses data ke PostgreSQL
- **Server-side rendering (SSR)** untuk halaman yang membutuhkan SEO atau data awal cepat
- **Client-side data fetching** untuk interaksi CRUD yang dinamis

```
┌─────────────────────────────────────────────────────────────┐
│                     PERAMBA (CLIENT)                        │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Mantine  │ │Handsontbl│ │ React Hook │ │  ExcelJS   │  │
│  │ UI v7    │ │   17     │ │   Form     │ │ (client)   │  │
│  └──────────┘ └──────────┘ └────────────┘ └────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Refine v5 (Admin Framework)              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │  │
│  │  │   Auth   │ │   Data   │ │    Resources /        │ │  │
│  │  │ Provider │ │ Provider │ │    Routes             │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (fetch)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API ROUTES (server-side)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │  │
│  │  │ Generic  │ │   Auth   │ │  Dashboard / Export  │ │  │
│  │  │ CRUD API │ │  Routes  │ │  Routes             │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           LAPISAN LAYANAN (Service Layer)             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │  │
│  │  │ Access   │ │  Audit   │ │  Excel Generator     │ │  │
│  │  │ Control  │ │   Log    │ │                      │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PRISMA ORM (Data Access)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │  │
│  │  │  Client  │ │  Schema  │ │     Migrations       │ │  │
│  │  │ Singleton│ │  Models  │ │                      │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL
                       ▼
           ┌──────────────────────┐
           │     PostgreSQL       │
           │     Database         │
           └──────────────────────┘
```

---

## 3. Tumpukan Teknologi (Technology Stack)

| Lapisan | Teknologi | Versi | Fungsi |
|---|---|---|---|
| **Framework** | Next.js | 16 | Full-stack framework (React + backend) |
| **UI Library** | React | 19 | Library UI deklaratif |
| **UI Components** | Mantine UI | 7 | Komponen antarmuka pengguna |
| **Admin Framework** | Refine | 5 | Abstraksi CRUD, auth, data fetching |
| **Spreadsheet** | Handsontable | 17 | Entri data risiko seperti spreadsheet |
| **Table** | @tanstack/react-table | - | Tabel data dengan sorting & filtering |
| **Form** | @mantine/form / react-hook-form | - | Manajemen form |
| **Icons** | @tabler/icons-react | 3.44 | Ikon antarmuka |
| **Database** | PostgreSQL | - | Database relasional |
| **ORM** | Prisma | 7.8 | Akses database type-safe |
| **Auth** | Custom (cookie-based) | - | Autentikasi sesi |
| **Authz** | Custom RBAC | - | Otorisasi berbasis peran |
| **Export** | ExcelJS | - | Generator file Excel |
| **Styling** | PostCSS + Mantine preset | - | CSS processing |
| **Container** | Docker | - | Kontainerisasi |

---

## 4. Struktur Direktori

```
src/
├── app/                           # NEXT.JS APP ROUTER
│   ├── layout.tsx                 # Root layout (Refine, Mantine, auth providers)
│   ├── not-found.tsx              # Halaman 404
│   ├── login/page.tsx             # Halaman login
│   ├── register/page.tsx          # Halaman registrasi
│   ├── forgot-password/page.tsx   # Halaman lupa kata sandi
│   ├── api/                       # API Routes (server-side)
│   │   ├── [resource]/route.ts    # GENERIC CRUD API (GET, POST)
│   │   ├── [resource]/[id]/       # Operasi single resource
│   │   ├── auth/login/route.ts    # API login
│   │   ├── audit-logs/            # API log audit
│   │   ├── dashboard-stats/       # API statistik dasbor
│   │   ├── download-daftar-risiko/ # API unduh laporan risiko
│   │   ├── upload/                # API unggah file
│   │   └── uploads/[filename]/    # Serving file
│   └── (app)/                     # Halaman terproteksi (auth required)
│       ├── layout.tsx             # Layout aplikasi (auth check + BaseLayout)
│       ├── page.tsx               # DASBOR
│       ├── manajemen-risiko/
│       │   ├── page.tsx           # Redirect ke penetapan-konteks
│       │   ├── penetapan-konteks/  # Penetapan konteks (16 tab CRUD)
│       │   ├── identifikasi/      # Identifikasi risiko (Handsontable)
│       │   ├── analisis/          # Analisis risiko
│       │   ├── evaluasi/          # Evaluasi risiko
│       │   ├── rencana/           # Rencana penanganan
│       │   ├── risk-appetite/     # Selera risiko
│       │   └── pelaporan/         # Pelaporan
│       ├── pemantauan-risiko/     # Pemantauan risiko
│       ├── pelaporan-risiko/      # Pelaporan komprehensif
│       ├── kri/                   # Key Risk Indicators
│       ├── audit-log/             # Log audit
│       ├── blog-posts/            # Blog (scaffold)
│       ├── categories/            # Kategori (scaffold)
│       ├── faq/                   # Manajemen FAQ
│       ├── users/                 # Manajemen pengguna
│       └── roles/                 # Manajemen peran
├── components/
│   ├── auth-page/index.tsx        # Form autentikasi reusable
│   ├── breadcrumb/index.tsx       # Komponen breadcrumb
│   ├── layout/index.tsx           # App shell (sidebar, header)
│   ├── menu/index.tsx             # Menu (legacy)
│   └── pagination.tsx             # Paginasi reusable
├── hooks/
│   └── useAuditLog.ts             # Hook untuk audit logging
├── lib/
│   ├── prisma.ts                  # Prisma client singleton
│   ├── access-control.ts          # Pemeriksaan izin sisi server
│   ├── audit-log.ts               # Utility log audit
│   ├── excel-generator.ts         # Generator Excel
│   └── resource-map.ts            # Map URL ke model Prisma
├── providers/
│   ├── auth-provider/
│   │   ├── auth-provider.client.ts  # Auth provider sisi klien
│   │   └── auth-provider.server.ts  # Auth check sisi server
│   ├── data-provider/index.ts    # Refine data provider
│   └── devtools/index.tsx        # Refine Devtools wrapper
├── generated/prisma/             # Prisma client auto-generated
└── styles/global.css             # Global styles + Handsontable theming
```

---

## 5. Komponen Arsitektur

### 5.1 App Router & Routing

Next.js **App Router** digunakan untuk routing. Dua kategori layout:

| Layout | File | Fungsi |
|---|---|---|
| **Root Layout** | `src/app/layout.tsx` | Mantine Provider, Refine Provider, auth provider, devtools, font loading |
| **App Layout** | `src/app/(app)/layout.tsx` | Auth check, BaseLayout (sidebar + header), konten halaman |

Routing halaman:
- `/login`, `/register`, `/forgot-password` — halaman publik
- `/(app)/` — semua halaman di bawah grup ini diproteksi auth
- Setiap resource memiliki halaman CRUD sendiri

### 5.2 Refine Framework

Refine v5 berfungsi sebagai kerangka kerja admin yang menyediakan:

| Komponen | File | Fungsi |
|---|---|---|
| **Auth Provider** | `src/providers/auth-provider/auth-provider.client.ts` | login, logout, check, getIdentity, getPermissions, register, forgotPassword |
| **Data Provider** | `src/providers/data-provider/index.ts` | CRUD operations via fetch ke API routes dengan pagination, sorting, filtering |
| **Resources** | Didefinisikan di layout | Mapping resource ke route + icon |

### 5.3 API Layer

Sistem menggunakan **API Routes** Next.js. Dua pendekatan:

#### 5.3.1 Generic CRUD API

Satu set route dinamis menangani CRUD untuk semua model:

```
/api/[resource]     → GET  (list dengan pagination, sorting, filtering)
                    → POST (create)
/api/[resource]/[id] → GET  (get by id)
                      → PUT  (update)
                      → DELETE
```

Alur request:
1. Request masuk ke `/api/[resource]`
2. `resource-map.ts` memetakan `resource` ke model dan include Prisma
3. `access-control.ts` memeriksa izin pengguna
4. Prisma menjalankan query
5. `audit-log.ts` mencatat operasi

#### 5.3.2 Specific API Routes

| Route | Fungsi |
|---|---|
| `/api/auth/login` | Validasi kredensial, set cookie, return user + permissions |
| `/api/dashboard-stats` | Statistik agregat untuk dasbor (single round-trip) |
| `/api/audit-logs` | Log audit dengan filtering & pagination |
| `/api/download-daftar-risiko` | Generate dan download Excel Daftar Risiko |
| `/api/upload` | Upload file ke `public/uploads/` |

### 5.4 Auth & Session

```
┌──────────┐     ┌──────────────┐     ┌───────────┐
│  Client  │────▶│  /api/auth/  │────▶│ Database  │
│          │◀────│   login      │◀────│  (User)   │
└──────────┘     └──────────────┘     └───────────┘
     │                  │
     │ set cookie       │ return { user,
     │ (auth)           │   permissions,
     │                  │   role }
     ▼
┌──────────┐
│  Cookie  │
│  (auth)  │──▶ Server membaca cookie → cari user → set req.user
└──────────┘
```

- Autentikasi menggunakan **custom cookie-based session**
- Cookie `auth` menyimpan data sesi (user id, role, permissions)
- Setiap request ke halaman terproteksi melewati auth check di middleware atau layout
- Server-side auth provider memvalidasi cookie dan mengembalikan user

### 5.5 Otorisasi (RBAC)

Model izin:

```
User ─── Role ─── RolePermission ─── Permission
  │                                    │
  └── UserPermission (grant/deny) ─────┘
```

- **Permission** didefinisikan sebagai kombinasi `resource + action` (misal: `"identifikasi-risiko:create"`)
- **Role** memiliki kumpulan permission melalui `RolePermission`
- **User** dapat memiliki override individual melalui `UserPermission` dengan tipe `GRANT` atau `DENY`
- `checkPermission()` di sisi server memvalidasi akses

### 5.6 Audit Log

Setiap operasi CRUD dicatat ke tabel `AuditLog`:

| Field | Deskripsi |
|---|---|
| `userId` | Pengguna yang melakukan aksi |
| `action` | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT` |
| `resource` | Nama resource (misal: `identifikasi-risiko`) |
| `resourceId` | ID record yang diubah |
| `details` | JSON: perubahan data (old/new values) |
| `ipAddress` | Alamat IP pengguna |
| `userAgent` | User-Agent browser |
| `timestamp` | Waktu kejadian |

### 5.7 Data Provider (Refine)

Data provider kustom mengimplementasikan antarmuka Refine `DataProvider`:

| Method | HTTP | Deskripsi |
|---|---|---|
| `getList` | GET `/api/[resource]?pagination=...&sort=...&filter=...` | List dengan pagination |
| `getOne` | GET `/api/[resource]/[id]` | Single record |
| `create` | POST `/api/[resource]` | Buat record baru |
| `update` | PUT `/api/[resource]/[id]` | Update record |
| `deleteOne` | DELETE `/api/[resource]/[id]` | Hapus record |
| `getMany` | GET `/api/[resource]?ids=...` | Batch get |
| `custom` | - | Custom request |

Semua request menyertakan header `Authorization` dan body (untuk POST/PUT) dalam format JSON.

### 5.8 Handsontable Integration

Halaman Identifikasi Risiko menggunakan **Handsontable** untuk entri data seperti spreadsheet:

```
┌─────────────────────────────────────────────────────┐
│ Handsontable Instance                                │
│ ┌──────┬──────────┬──────────┬──────────┬─────────┐│
│ │ ID   │ Risiko   │ Jenis    │ Sumber   │ ...     ││
│ ├──────┼──────────┼──────────┼──────────┼─────────┤│
│ │ R001 │ Risiko A │ Strategis│ Internal │ ...     ││
│ │ R002 │ Risiko B │ Operasi  │ Eksternal│ ...     ││
│ └──────┴──────────┴──────────┴──────────┴─────────┘│
│ [Dropdown validator] [Search/filter] [Save All]     │
└─────────────────────────────────────────────────────┘
```

- Dropdown columns menggunakan data dari API referensi
- Validasi sisi klien sebelum simpan
- Tombol "Save All" mengirim batch data ke API

---

## 6. Alur Data

### 6.1 Alur CRUD Umum

```
Pengguna ──▶ Refine Component ──▶ Data Provider (fetch)
                                      │
                                      ▼
                               API Route /api/[resource]
                                      │
                                      ▼
                            checkPermission(user, resource, action)
                                      │
                                      ▼
                              Prisma Query (findMany/create/update/delete)
                                      │
                                      ▼
                               Audit Log Entry
                                      │
                                      ▼
                              Response JSON ──▶ UI Update
```

### 6.2 Alur Manajemen Risiko (End-to-End)

```
Penetapan Konteks ──▶ Identifikasi Risiko ──▶ Analisis Risiko
(Data referensi &     (Spreadsheet entry)    (Skor kemungkinan
 konteks organisasi)                          × dampak)
                                                   │
                                                   ▼
                         ┌───────────┐     Evaluasi Risiko
                         │ Monitoring │◀──── (Residual risk +
                         │           │      response decision)
                         └───────────┘
                              │
                              ▼
                    Rencana Penanganan
                    (Treatment plan,
                     PIC, timeline)
                              │
                              ▼
                    Pelaporan & Dasbor
```

### 6.3 Alur Autentikasi

```
1. Pengguna buka halaman → Layout cek auth (server-side)
2. Belum login → Redirect ke /login
3. Isi form → POST /api/auth/login
4. Server validasi → set cookie → return user
5. Client auth provider update state
6. Refine render halaman sesuai permissions
```

---

## 7. Model Data (Database)

### 7.1 Entity Relationship Diagram (Konseptual)

```
┌──────────────┐     ┌──────────────────┐
│   UnitKerja  │◀────│  Identifikasi    │
└──────────────┘     │  Risiko          │
                     │                  │
┌──────────────┐     │  - id            │
│   Kegiatan   │◀────│  - kode_risiko   │
└──────────────┘     │  - uraian_risiko │
                     │  - penyebab      │
┌──────────────┐     │  - dampak        │
│   Sasaran    │◀────│  - jenis_id      │──▶ JenisRisiko
└──────────────┘     │  - sumber_id     │──▶ SumberRisiko
                     │  - kategori_id   │──▶ KategoriRisiko
┌──────────────┐     │  - area_dampak_id│──▶ AreaDampak
│ ProsesBisnis │◀────│  - unit_kerja_id │──▶ UnitKerja
└──────────────┘     │  - kegiatan_id   │──▶ Kegiatan
                     └────────┬─────────┘
                              │ 1:1
                              ▼
                     ┌──────────────────┐
                     │  AnalisisRisiko  │
                     │  - tingkat       │──▶ LevelRisiko
                     │  - kemungkinan_id│──▶ LevelKemungkinan
                     │  - dampak_id     │──▶ LevelDampak
                     └────────┬─────────┘
                              │ 1:1
                              ▼
                     ┌──────────────────┐
                     │  EvaluasiRisiko  │
                     │  - residual      │
                     │  - opsi_id       │──▶ OpsiPenanganan
                     └────────┬─────────┘
                              │ 1:1
                              ▼
                     ┌──────────────────┐
                     │ RencanaPenanganan│
                     │  - pic           │
                     │  - timeline      │
                     │  - anggaran      │
                     └────────┬─────────┘
                              │ 1:N
                              ▼
                     ┌──────────────────┐
                     │  Pemantauan      │
                     │  Risiko          │
                     │  - keterjadian   │
                     └──────────────────┘
```

---

## 8. Keamanan

| Aspek | Implementasi |
|---|---|
| **Autentikasi** | Cookie-based session, dicek di server setiap request |
| **Otorisasi** | RBAC: Role → Permissions, override UserPermission (GRANT/DENY) |
| **Server-side check** | `checkPermission()` sebelum setiap operasi di API |
| **Client-side** | Menu disembunyikan berdasarkan permissions, tapi tidak diandalkan untuk keamanan |
| **SQL Injection** | Dicegah oleh Prisma ORM (parameterized queries) |
| **Input Validation** | Validasi di sisi klien (form) + server (Prisma schema) |
| **File Upload** | Disimpan di `public/uploads/`, path aman |
| **Audit** | Semua operasi CRUD tercatat |

---

## 9. Performa & Skalabilitas

| Aspek | Pendekatan |
|---|---|
| **Database** | PostgreSQL dengan indexing (Prisma schema mencakup index di kolom yang sering difilter) |
| **Pagination** | Server-side pagination (skip/take) untuk semua list view |
| **Caching** | Belum ada caching layer (dapat ditambahkan Redis di masa depan) |
| **Bundle Size** | Next.js code splitting otomatis per halaman |
| **Handsontable** | Data dimuat dari API, disimpan dalam state lokal saat diedit |
| **Docker** | Multi-stage build untuk production optimization |

---

## 10. Keputusan Desain

| Keputusan | Alasan |
|---|---|
| **Monolitik Next.js** | Sederhana untuk di-deploy, satu codebase, shared types |
| **Custom auth provider** | Tidak perlu dependency eksternal, kontrol penuh atas session |
| **Generic CRUD API** | Mengurangi kode boilerplate, satu pattern untuk semua resource |
| **Refine sebagai admin framework** | Abstraksi CRUD yang matang, reusable components, data provider pattern |
| **Handsontable untuk identifikasi** | UX spreadsheet lebih natural untuk entri data risiko massal |
| **Prisma ORM** | Type-safe, auto-generated client, migration tooling |
| **Cookie-based session** | Sederhana, tidak perlu infrastruktur tambahan (Redis untuk session store) |
| **Resource Map pattern** | Mapping URL ke Prisma model memungkinkan CRUD generic tanpa per-model route |

---

## 11. Deployment

```dockerfile
# Docker multi-stage build
FROM node:18-alpine AS base
FROM base AS deps       # Install dependencies
FROM base AS build      # Build Next.js
FROM base AS runner     # Production image
```

Langkah deployment:
1. Build Docker image
2. Set environment variables (`DATABASE_URL`, dll.)
3. Jalankan `npx prisma migrate deploy`
4. Jalankan container

---

## 12. Pengembangan & Build

| Script | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma migrate dev` | Run migrations (dev) |
| `npx prisma migrate deploy` | Run migrations (prod) |
| `npx prisma db seed` | Seed database |

---

## 13. Diagram Deployment

```
┌─────────────────────────────────────┐
│         Docker Container            │
│  ┌───────────────────────────────┐  │
│  │    Next.js Server (Node 18)   │  │
│  │  ┌─────────┐ ┌─────────────┐ │  │
│  │  │ SSR     │ │ API Routes  │ │  │
│  │  │ Pages   │ │ (Backend)   │ │  │
│  │  └─────────┘ └─────────────┘ │  │
│  │  ┌─────────────────────────┐ │  │
│  │  │  Static Files (public/) │ │  │
│  │  └─────────────────────────┘ │  │
│  └───────────────────────────────┘  │
└────────────────┬────────────────────┘
                 │ TCP :5432
                 ▼
       ┌────────────────────┐
       │    PostgreSQL      │
       │    (local/VM)      │
       └────────────────────┘
```
