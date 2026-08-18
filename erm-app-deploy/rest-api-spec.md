# Spesifikasi REST API — Sistem Informasi Manajemen Risiko (ERM)

| **Dokumen** | REST API Specification |
|---|---|
| **Produk** | Sistem Informasi Manajemen Risiko Enterprise (ERM) |
| **Base URL** | `/api` |
| **Format** | JSON |
| **Versi** | 1.0 |
| **Status** | Draf |

---

## 1. Daftar Endpoint

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/{resource}` | ✅ | List resource (pagination, sorting, filter) |
| `POST` | `/api/{resource}` | ✅ | Buat resource baru |
| `GET` | `/api/{resource}/{id}` | ✅ | Ambil satu resource |
| `PATCH` | `/api/{resource}/{id}` | ✅ | Update resource |
| `DELETE` | `/api/{resource}/{id}` | ✅ | Hapus resource |
| `POST` | `/api/auth/login` | ❌ | Login pengguna |
| `GET` | `/api/dashboard-stats` | ❌ | Statistik dasbor |
| `GET` | `/api/audit-logs` | ✅ | Query log audit |
| `POST` | `/api/audit-logs/create` | ❌ | Buat entri log audit |
| `POST` | `/api/upload` | ❌ | Upload file |
| `GET` | `/api/uploads/{filename}` | ❌ | Serve file |

---

## 2. Autentikasi

### 2.1 Login

Mengautentikasi pengguna dan mengembalikan profil serta izin.

```
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "admin@erm.com",
  "password": "admin123"
}
```

**Response 200:**

```json
{
  "name": "Administrator",
  "email": "admin@erm.com",
  "role": "admin",
  "permissions": [
    "sasaran:create",
    "sasaran:read",
    "sasaran:update",
    "sasaran:delete",
    "..."
  ],
  "avatar": null
}
```

**Response 400:**

```json
{
  "error": "Invalid email or password"
}
```

**Response 400 (validasi):**

```json
{
  "error": "Email and password are required"
}
```

**Catatan:**
- Password dibandingkan **plaintext** (belum menggunakan hashing)
- Izin dibangun dari role + override user-level (`grant`/`deny`)
- Response tidak menyertakan field `password`

### 2.2 Otorisasi

Setiap endpoint CRUD (kecuali publik) memeriksa izin melalui `checkPermission()`.

**Alur:**

```
Request → baca cookie auth → parse email → fetch user dari DB →
  cek UserPermission (deny override) → cek UserPermission (grant override) →
  cek admin bypass → cek RolePermission → ✅/❌
```

**Tingkatan izin:**

| Tier | Prioritas | Deskripsi |
|---|---|---|
| **1. Deny Override** | Tertinggi | Jika `UserPermission.value = "deny"` → tolak |
| **2. Grant Override** | Tinggi | Jika `UserPermission.value = "grant"` → izinkan |
| **3. Admin Bypass** | Sedang | Jika `role.name = "admin"` → izinkan |
| **4. Role Permission** | Rendah | Jika `RolePermission` ada untuk resource+action → izinkan |
| **5. Default** | - | Tolak |

---

## 3. Generic CRUD API

Satu set endpoint dinamis menangani CRUD untuk **28 resource**. Mapping URL ke model Prisma dilakukan oleh `resource-map.ts`.

### 3.1 Resource Map

| URL Resource | Model Prisma | Include |
|---|---|---|
| `sasaran` | `sasaran` | - |
| `proses-bisnis` | `prosesBisnis` | - |
| `pemangku-kepentingan` | `pemangkuKepentingan` | - |
| `peraturan-perundangan` | `peraturanPerundangan` | - |
| `jenis-risiko` | `jenisRisiko` | - |
| `sumber-risiko` | `sumberRisiko` | - |
| `kategori-risiko` | `kategoriRisiko` | - |
| `area-dampak` | `areaDampak` | - |
| `level-kemungkinan` | `levelKemungkinan` | - |
| `level-dampak` | `levelDampak` | - |
| `level-risiko` | `levelRisiko` | - |
| `opsi-penanganan` | `opsiPenanganan` | - |
| `kriteria-kemungkinan` | `kriteriaKemungkinan` | ✅ |
| `kriteria-dampak` | `kriteriaDampak` | - |
| `selera-risiko` | `seleraRisiko` | ✅ |
| `identifikasi-risiko` | `identifikasiRisiko` | ✅ |
| `unit-kerja` | `unitKerja` | - |
| `kegiatan` | `kegiatan` | - |
| `analisis-risiko` | `analisisRisiko` | ✅ |
| `evaluasi-risiko` | `evaluasiRisiko` | ✅ |
| `rencana-penanganan` | `rencanaPenanganan` | ✅ |
| `kri` | `kri` | ✅ |
| `matriks-analisis-risiko` | `matriksAnalisisRisiko` | ✅ |
| `pelaporan-risiko` | `rencanaPenanganan` | ✅ |
| `faq` | `faq` | - |
| `users` | `user` | ✅ |
| `roles` | `role` | ✅ |
| `permissions` | `permission` | - |

### 3.2 GET — List Resource

```
GET /api/{resource}
```

**Query Parameters:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `_start` | integer | `0` | Offset pagination |
| `_end` | integer | `10` | Batas pagination (`take = _end - _start`) |
| `_sort` | string | `"id"` | Field untuk sorting |
| `_order` | string | `"asc"` | Arah sorting (`asc` / `desc`) |
| `id` | integer[] | - | Filter by ID (bisa multiple: `?id=1&id=2&id=3`) |

**Contoh Request:**

```
GET /api/identifikasi-risiko?_start=0&_end=25&_sort=id&_order=desc
```

**Response 200:**

```
Header: x-total-count: 150
```

```json
[
  {
    "id": 1,
    "risiko": "Risiko Kepatuhan Pajak",
    "jenisRisikoId": 2,
    "sumberRisikoId": 1,
    "kategoriRisikoId": 4,
    "areaDampakId": 4,
    "penyebab": "Perubahan regulasi perpajakan",
    "dampak": "Sanksi administratif",
    "kegiatanId": 1,
    "unitKerjaId": 1,
    "jenisRisiko": { "id": 2, "nama": "Negatif" },
    "sumberRisiko": { "id": 1, "nama": "Internal" },
    ...relasi lainnya jika include aktif
  }
]
```

**Response 200 (batch by ID):**

```json
[
  { "id": 1, ... },
  { "id": 5, ... },
  { "id": 12, ... }
]
```

### 3.3 POST — Create Resource

```
POST /api/{resource}
```

**Request Body:**

```json
{
  "risiko": "Risiko Baru",
  "jenisRisikoId": 1,
  "sumberRisikoId": 2,
  "kategoriRisikoId": 3,
  "areaDampakId": 1,
  "kegiatanId": 1,
  "unitKerjaId": 1
}
```

**Response 201:**

```json
{
  "id": 151,
  "risiko": "Risiko Baru",
  "jenisRisikoId": 1,
  "sumberRisikoId": 2,
  "kategoriRisikoId": 3,
  "areaDampakId": 1,
  "penyebab": null,
  "dampak": null,
  "kegiatanId": 1,
  "unitKerjaId": 1,
  "createdAt": "2026-06-30T10:00:00.000Z",
  "updatedAt": "2026-06-30T10:00:00.000Z"
}
```

**Response 403:**

```json
{
  "error": "Forbidden: insufficient permissions"
}
```

**Catatan:** Setiap operasi `CREATE` dicatat ke `AuditLog` secara otomatis.

### 3.4 GET — Get Single Resource

```
GET /api/{resource}/{id}
```

**Response 200:**

```json
{
  "id": 1,
  "risiko": "Risiko Kepatuhan Pajak",
  "jenisRisikoId": 2,
  ...semua field...
}
```

**Response 404:**

```json
{
  "error": "Not found"
}
```

### 3.5 PATCH — Update Resource

```
PATCH /api/{resource}/{id}
```

**Request Body:**

```json
{
  "penyebab": "Penyebab yang diperbarui",
  "dampak": "Dampak yang diperbarui"
}
```

**Response 200:**

```json
{
  "id": 1,
  "risiko": "Risiko Kepatuhan Pajak",
  "penyebab": "Penyebab yang diperbarui",
  "dampak": "Dampak yang diperbarui",
  ...field lainnya...
}
```

**Catatan:**
- Setiap operasi `UPDATE` dicatat ke `AuditLog`
- Untuk resource `roles` dan `users`, ada logika khusus (lihat bagian 3.7 dan 3.8)

### 3.6 DELETE — Delete Resource

```
DELETE /api/{resource}/{id}
```

**Response 200:**

```json
{
  "id": 151,
  "risiko": "Risiko Baru",
  ...field lain sebelum dihapus...
}
```

**Catatan:** Setiap operasi `DELETE` dicatat ke `AuditLog`.

### 3.7 Khusus: Update Roles

`PATCH /api/roles/{id}` memiliki logika khusus untuk mengelola permission:

**Request Body:**

```json
{
  "name": "ketua tim",
  "description": "Updated description",
  "permissions": [1, 2, 3, 4, 5]
}
```

Logika:
1. Update field `name` dan `description` di model `Role`
2. `deleteMany` semua `RolePermission` untuk role ini
3. `createMany` `RolePermission` baru dari array `permissions`

### 3.8 Khusus: Update Users

`PATCH /api/users/{id}` memiliki logika khusus untuk permission override:

**Request Body:**

```json
{
  "name": "Nama Baru",
  "roleId": 2,
  "permissions": [
    { "permissionId": 10, "value": "grant" },
    { "permissionId": 15, "value": "deny" }
  ]
}
```

Logika:
1. Update field `name`, `email`, `roleId`, `password` di model `User`
2. Jika ada field `permissions` → `deleteMany` semua `UserPermission` untuk user ini, lalu `createMany` yang baru

---

## 4. Dashboard Stats

Mengembalikan statistik agregat untuk dasbor utama.

```
GET /api/dashboard-stats
```

**Header:** `Cache-Control: no-cache` (selalu fresh)

**Response 200:**

```json
{
  "kpi": {
    "totalRisiko": 150,
    "dianalisis": 120,
    "dievaluasi": 90,
    "ditangani": 75,
    "kri": 30,
    "sasaran": 25,
    "prosesBisnis": 10,
    "analysisCoverage": 80.0,
    "treatmentCoverage": 50.0
  },
  "levelKemungkinan": [
    { "id": 1, "nama": "Hampir Tidak Terjadi", "skala": 1 },
    { "id": 2, "nama": "Jarang Terjadi", "skala": 2 },
    { "id": 3, "nama": "Kadang Terjadi", "skala": 3 },
    { "id": 4, "nama": "Sering Terjadi", "skala": 4 },
    { "id": 5, "nama": "Hampir Pasti Terjadi", "skala": 5 }
  ],
  "levelDampak": [
    { "id": 1, "nama": "Tidak Signifikan", "skala": 1 },
    { "id": 2, "nama": "Minor", "skala": 2 },
    { "id": 3, "nama": "Moderat", "skala": 3 },
    { "id": 4, "nama": "Signifikan", "skala": 4 },
    { "id": 5, "nama": "Sangat Signifikan", "skala": 5 }
  ],
  "heatmap": [
    {
      "kemungkinanId": 1,
      "dampakId": 1,
      "count": 5,
      "besaran": 1,
      "levelRisikoNama": "Sangat Rendah",
      "warna": "Biru"
    }
  ],
  "byLevel": [
    { "nama": "Sangat Rendah", "warna": "Biru", "count": 10 },
    { "nama": "Rendah", "warna": "Hijau", "count": 25 },
    { "nama": "Sedang", "warna": "Kuning", "count": 40 },
    { "nama": "Tinggi", "warna": "Jingga", "count": 30 },
    { "nama": "Sangat Tinggi", "warna": "Merah", "count": 15 }
  ],
  "byCategory": [
    { "nama": "Fraud", "count": 35 },
    { "nama": "Sanksi Hukum", "count": 28 }
  ],
  "byType": [
    { "nama": "Negatif", "count": 100 },
    { "nama": "Positif", "count": 50 }
  ],
  "byResponse": [
    { "nama": "Mitigasi", "count": 45 },
    { "nama": "Diterima", "count": 20 }
  ],
  "inherentVsResidual": {
    "inherentAvg": 14.5,
    "residualAvg": 8.2,
    "residualN": 90
  },
  "kriStatus": [
    { "nama": "KRI-001", "nilai": 85, "status": "merah" }
  ],
  "kriSummary": {
    "hijau": 10,
    "kuning": 12,
    "merah": 5,
    "belum": 3
  },
  "topRisks": [
    {
      "risiko": "Risiko Kepatuhan Pajak",
      "kategori": "Sanksi Hukum",
      "besaran": 25,
      "level": "Sangat Tinggi",
      "warna": "Merah"
    }
  ],
  "funnel": [
    { "tahap": "Identifikasi", "count": 150 },
    { "tahap": "Analisis", "count": 120 },
    { "tahap": "Evaluasi", "count": 90 },
    { "tahap": "Penanganan", "count": 75 }
  ]
}
```

---

## 5. Audit Logs

### 5.1 Query Audit Logs

```
GET /api/audit-logs
```

**Query Parameters:**

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `userId` | string | - | Filter by user ID/email |
| `action` | string | - | Filter by action (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`, etc.) |
| `resource` | string | - | Filter by resource name |
| `startDate` | string (ISO) | - | Filter tanggal awal |
| `endDate` | string (ISO) | - | Filter tanggal akhir |
| `page` | integer | `1` | Halaman |
| `pageSize` | integer | `50` | Jumlah per halaman |

**Response 200:**

```json
{
  "data": [
    {
      "id": 1,
      "userId": "admin@erm.com",
      "userName": "Administrator",
      "action": "CREATE",
      "resource": "identifikasiRisiko",
      "resourceId": "151",
      "details": {},
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0 ...",
      "timestamp": "2026-06-30T10:00:00.000Z"
    }
  ],
  "total": 500,
  "page": 1,
  "pageSize": 50,
  "totalPages": 10
}
```

### 5.2 Create Audit Log Entry

Digunakan untuk mencatat aksi dari sisi klien (login, logout, view, dll.).

```
POST /api/audit-logs/create
```

**Request Body:**

```json
{
  "userId": "admin@erm.com",
  "userName": "Administrator",
  "action": "LOGIN",
  "resource": "auth",
  "resourceId": null,
  "details": {}
}
```

**Response 200:**

```json
{
  "success": true
}
```

**Catatan:**
- `ipAddress` dan `userAgent` diambil dari header request secara otomatis
- Endpoint ini tidak memeriksa izin

### 5.3 Actions yang Didukung

| Action | Deskripsi |
|---|---|
| `CREATE` | Membuat record baru |
| `UPDATE` | Memperbarui record |
| `DELETE` | Menghapus record |
| `VIEW` | Melihat record (dari klien) |
| `LOGIN` | Login pengguna |
| `LOGOUT` | Logout pengguna |
| `DOWNLOAD` | Mengunduh laporan |
| `UPLOAD` | Mengunggah file |
| `APPROVE` | Menyetujui rencana penanganan |
| `REJECT` | Menolak rencana penanganan |

---

## 6. File Upload & Serving

### 6.1 Upload File

```
POST /api/upload
```

**Request:** `multipart/form-data`

| Field | Tipe | Deskripsi |
|---|---|---|
| `file` | File | File yang akan diunggah |

**Response 200:**

```json
{
  "url": "/api/uploads/1719734400000_dokumen_pendukung.pdf",
  "filename": "dokumen_pendukung.pdf"
}
```

**Response 400:**

```json
{
  "error": "No file provided"
}
```

**Catatan:**
- File disimpan di `public/uploads/`
- Nama file: `{timestamp}_{nama_original_sanitized}`
- Karakter khusus diganti dengan `_`

### 6.2 Serve File

```
GET /api/uploads/{filename}
```

**Response:** File stream dengan `Content-Type` yang sesuai:

| Ekstensi | Content-Type |
|---|---|
| `.pdf` | `application/pdf` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| Lainnya | `application/octet-stream` |

**Response 404:** File tidak ditemukan

---

## 7. Error Codes

| Status Code | Deskripsi | Contoh |
|---|---|---|
| `200` | Sukses | GET, PATCH, DELETE |
| `201` | Created | POST berhasil |
| `400` | Bad Request | Validasi gagal, parameter hilang |
| `403` | Forbidden | Izin tidak mencukupi |
| `404` | Not Found | Resource tidak ditemukan |
| `500` | Internal Server Error | Error tidak terduga |

**Format error response:**

```json
{
  "error": "Deskripsi error"
}
```

---

## 8. Pagination

Semua endpoint list menggunakan **pagination sisi server** dengan parameter `_start` / `_end` (konvensi Refine Simple REST):

| Parameter | Contoh | Arti |
|---|---|---|
| `_start=0&_end=25` | Halaman 1, 25 item | `skip: 0, take: 25` |
| `_start=25&_end=50` | Halaman 2, 25 item | `skip: 25, take: 25` |

Response menyertakan header:

```
x-total-count: 150
```

Khusus endpoint `/api/audit-logs` menggunakan parameter `page` / `pageSize`.

---

## 9. Sorting & Filtering

### 9.1 Sorting

```
GET /api/{resource}?_sort=nama&_order=asc
```

| Parameter | Contoh | Default |
|---|---|---|
| `_sort` | `id`, `nama`, `createdAt` | `"id"` |
| `_order` | `asc`, `desc` | `"asc"` |

### 9.2 Filter by ID

```
GET /api/{resource}?id=1&id=5&id=12
```

Mengembalikan array record dengan ID yang cocok (tanpa pagination).

### 9.3 Audit Log Filtering

```
GET /api/audit-logs?userId=admin@erm.com&action=CREATE&resource=identifikasiRisiko&startDate=2026-01-01&endDate=2026-06-30&page=1&pageSize=50
```

---

## 10. Contoh Alur Lengkap

### 10.1 Alur: Manajemen Risiko Lengkap

```bash
# 1. Login
POST /api/auth/login
Body: { "email": "admin@erm.com", "password": "admin123" }
Response: { name, email, role, permissions, avatar }
# → Simpan response di cookie/auth state

# 2. List data referensi
GET /api/jenis-risiko
GET /api/kategori-risiko
GET /api/unit-kerja?_start=0&_end=100

# 3. Identifikasi risiko baru
POST /api/identifikasi-risiko
Body: {
  "risiko": "Risiko Baru",
  "jenisRisikoId": 1,
  "sumberRisikoId": 2,
  "kategoriRisikoId": 3,
  "areaDampakId": 1,
  "penyebab": "Penyebab X",
  "dampak": "Dampak Y",
  "kegiatanId": 1,
  "unitKerjaId": 1
}
Response 201: { id: 151, ... }

# 4. Analisis risiko
POST /api/analisis-risiko
Body: {
  "identifikasiRisikoId": 151,
  "levelKemungkinanId": 3,
  "levelDampakId": 4
}

# 5. Evaluasi risiko
POST /api/evaluasi-risiko
Body: {
  "identifikasiRisikoId": 151,
  "responRisiko": "mitigasi",
  "residualLevelKemungkinanId": 2,
  "residualLevelDampakId": 2
}

# 6. Rencana penanganan
POST /api/rencana-penanganan
Body: {
  "identifikasiRisikoId": 151,
  "jenisPenanganan": "Pencegahan",
  "targetOutput": "SOP baru",
  "targetWaktu": "2026-12-31",
  "penanggungJawab": "Ketua Tim"
}

# 7. Cek dasbor
GET /api/dashboard-stats

# 8. Lihat log audit
GET /api/audit-logs?resource=identifikasiRisiko&action=CREATE&page=1&pageSize=10
```

### 10.2 Alur: Manajemen Pengguna & Role

```bash
# 1. List role
GET /api/roles?_start=0&_end=50

# 2. Update role dengan permission
PATCH /api/roles/1
Body: {
  "name": "supervisor",
  "permissions": [1, 2, 3, 5, 10, 15]
}

# 3. Buat user baru
POST /api/users
Body: {
  "email": "user@erm.com",
  "name": "User Baru",
  "password": "password123",
  "roleId": 2
}
Response 201: { id: 5, email: "user@erm.com", ... }

# 4. Update permission override user
PATCH /api/users/5
Body: {
  "permissions": [
    { "permissionId": 10, "value": "grant" },
    { "permissionId": 15, "value": "deny" }
  ]
}
```

---

## 11. Catatan Implementasi

| Aspek | Detail |
|---|---|
| **Password** | Disimpan dan dibandingkan sebagai **plaintext** (belum di-hash) |
| **Auth State** | **Stateless** — server hanya validasi credential; klien mengelola session via cookie |
| **Audit Log** | Best-effort — error audit tidak memutus operasi utama |
| **Relasi** | Eager loading via `include` untuk resource tertentu (lihat resource map) |
| **Batch Fetch** | Multiple ID via `?id=1&id=2&id=3` — tidak menggunakan pagination |
| **Delete** | Cascade delete untuk junction table (`RolePermission`, `UserPermission`) |
| **Timestamp** | Semua field `createdAt`/`updatedAt` diisi otomatis oleh Prisma |
