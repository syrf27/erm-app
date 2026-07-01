# Pedoman Engineering — Sistem Informasi Manajemen Risiko (ERM)

| **Dokumen** | Engineering Guidelines |
|---|---|
| **Produk** | Sistem Informasi Manajemen Risiko Enterprise (ERM) |
| **Stack** | Next.js 16, React 19, Mantine UI 7, Refine 5, Prisma 7, PostgreSQL |
| **Versi** | 1.0 |
| **Status** | Draf |

---

## 1. Prinsip Dasar

1. **Type Safety** — Strict TypeScript di seluruh codebase. Hindari `any`, `as`, dan `@ts-ignore`.
2. **Konsistensi** — Ikuti pattern yang sudah ada. Jangan buat pattern baru tanpa alasan kuat.
3. **KISS** — Sederhana, mudah dibaca. Over-engineering tidak diterima.
4. **DRY** — Abstraksi hanya jika sudah ada 3+ pengulangan identik.
5. **Security First** — Semua endpoint (kecuali publik) harus punya auth check.

---

## 2. Standar Kode

### 2.1 TypeScript

| Aturan | Detail |
|---|---|
| **strict mode** | `strict: true` di tsconfig.json |
| **No `any`** | Gunakan `unknown` jika tipe belum diketahui, lalu narrow |
| **No `as`** | Hindari type assertion. Gunakan type guard atau zod validation |
| **No `@ts-ignore`** | Tidak pernah diizinkan |
| **Utility Types** | Gunakan `Pick`, `Omit`, `Partial`, `Required` bawaan TS |
| **Import type** | Gunakan `import type { ... }` untuk type-only import |

### 2.2 Penamaan

| Entitas | Konvensi | Contoh |
|---|---|---|
| **File/Folder** | `kebab-case` | `identifikasi-risiko`, `crud-table.tsx` |
| **Komponen React** | `PascalCase` | `CrudTable`, `AuthPage`, `Breadcrumb` |
| **Fungsi/Variabel** | `camelCase` | `checkPermission`, `getAuditLogs` |
| **Model Prisma** | `PascalCase` | `IdentifikasiRisiko`, `LevelKemungkinan` |
| **Field Prisma** | `camelCase` | `unitKerjaId`, `createdAt` |
| **Endpoint URL** | `kebab-case` | `/api/kategori-risiko`, `/api/audit-logs` |
| **Enum/Action** | `UPPER_SNAKE` | `CREATE`, `LOGIN`, `Pencegahan` |
| **File route app router** | `kebab-case` | `page.tsx`, `route.ts`, `layout.tsx` |
| **CSS class** | `kebab-case` | `.risk-heatmap`, `.sidebar-collapsed` |

### 2.3 Struktur File

**Aturan per file:**
- Maksimal **200 baris** per file. Jika lebih, refactor.
- Satu file = satu ekspor utama (kecuali helper kecil).
- File route `page.tsx` hanya berisi rendering. Logika di extract ke hooks/komponen.

---

## 3. Arsitektur Next.js

### 3.1 Pembagian Server vs Client

| Jenis | Directive | Penggunaan |
|---|---|---|
| **Server Component** | (default) | Layout, halaman statis, data fetching awal |
| **Client Component** | `"use client"` | Interaktivitas, hooks, state, event handlers |
| **API Route** | (server-only) | Backend logic, database access |

**Aturan:**
- Gunakan **Server Component** sebanyak mungkin
- Pindahkan interaktivitas ke komponen yang lebih dalam (bukan di layout)
- Jangan gunakan `"use client"` di layout utama jika tidak perlu

### 3.2 Data Fetching

| Pattern | Kapan Digunakan |
|---|---|
| **Server fetch langsung** | Halaman dashboard, list awal |
| **Refine data provider** | CRUD interaktif (create, update, delete) |
| **SWR / React Query** | (tidak digunakan — pakai Refine `useMany`, `useList`) |
| **API Route** | Backend logic yang butuh auth, koneksi DB |

**Aturan:**
- Jangan fetch data di komponen yang bisa menjadi Server Component
- Error handling wajib ada di setiap data fetching
- Loading state untuk client-side fetching

---

## 4. Prisma & Database

### 4.1 Schema Changes

| Langkah | Command |
|---|---|
| 1 | Edit `prisma/schema.prisma` |
| 2 | `npx prisma format` |
| 3 | `npx prisma migrate dev --name deskripsi_perubahan` |
| 4 | Review SQL migration yang di-generate |
| 5 | `npx prisma generate` |
| 6 | Commit migration + schema |

**Aturan:**
- Satu migration = satu perubahan logis
- Jangan edit migration file yang sudah di-commit
- Migration harus bisa di-revert jika gagal
- Nama migration deskriptif: `add_rencana_penanganan`, `make_fk_optional`

### 4.2 Query Pattern

```typescript
// ✅ BAIK: Include hanya field yang diperlukan
const user = await prisma.user.findUnique({
  where: { email },
  include: {
    role: { include: { permissions: { include: { permission: true } } } },
    permissions: { include: { permission: true } },
  },
})

// ❌ JANGAN: Select all tanpa filter
const all = await prisma.user.findMany()

// ✅ BAIK: Pagination wajib untuk list
const data = await prisma.identifikasiRisiko.findMany({
  skip,
  take,
  include: { jenisRisiko: true, sumberRisiko: true },
  orderBy: { id: "desc" },
})
```

**Aturan:**
- Wajib pagination di semua list endpoint (kecuali referensi kecil)
- Include relasi hanya yang ditampilkan di UI
- `@unique` dan `@@index` untuk kolom yang sering difilter

### 4.3 Transaksi

Gunakan `$transaction` untuk operasi yang membutuhkan atomicity:

```typescript
await prisma.$transaction([
  prisma.rolePermission.deleteMany({ where: { roleId } }),
  prisma.rolePermission.createMany({ data: newPermissions }),
])
```

---

## 5. Component Patterns

### 5.1 Struktur Komponen

```typescript
"use client"

// 1. Import (eksternal dulu, lalu internal)
import { Group, Text } from "@mantine/core"
import type { ReactNode } from "react"

// 2. Props type
interface PageHeaderProps {
  title: string
  children?: ReactNode
}

// 3. Komponen
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <Group justify="space-between" mb="md">
      <Text fw={700} size="xl">{title}</Text>
      {children}
    </Group>
  )
}
```

**Aturan:**
- Props type di atas komponen (bisa di-export)
- Satu komponen per file untuk komponen reusable
- Named export (default export hanya untuk page)

### 5.2 Custom Hooks

```typescript
// hooks/useAuditLog.ts
export function useAuditLog() {
  const log = async (params: AuditLogParams) => {
    await fetch("/api/audit-logs/create", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  return { log }
}
```

**Aturan:**
- Nama hook diawali `use`
- Satu hook per file (kecuali helper kecil)
- Return object, bukan array (kecuali mirip useState)

### 5.3 Refine Components

```typescript
// ✅ BAIK: Menggunakan Refine hooks
import { useTable } from "@refinedev/react-table"
import { useNavigation } from "@refinedev/core"

// ❌ JANGAN: Fetch manual untuk CRUD standar
// useEffect(() => { fetch("/api/...") }, [])
```

**Aturan:**
- Gunakan Refine hooks (`useTable`, `useForm`, `useList`, `useMany`) untuk CRUD standar
- Custom fetch hanya untuk endpoint non-CRUD (dashboard-stats, audit-logs)

---

## 6. API Routes

### 6.1 Pattern Endpoint

```typescript
// app/api/[resource]/route.ts
export async function GET(request: NextRequest) {
  const model = resourceMap[resource]
  if (!model) return NextResponse.json({ error: "Resource not found" }, { status: 404 })

  const canRead = await checkPermission(resource, "read")
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // ...logic
}
```

**Aturan:**
- Setiap endpoint non-publik harus panggil `checkPermission()`
- Response konsisten: JSON, status code sesuai
- Error message dalam bahasa Indonesia untuk user-facing, English untuk developer

### 6.2 HTTP Methods & Status

| Method | Status Sukses | Penggunaan |
|---|---|---|
| `GET` | `200` | List, single, export |
| `POST` | `201` | Create |
| `PATCH` | `200` | Update |
| `DELETE` | `200` | Delete |
| `400` | - | Bad request, validasi gagal |
| `403` | - | Forbidden |
| `404` | - | Not found |
| `500` | - | Internal error |

---

## 7. State Management

| Kebutuhan | Solusi |
|---|---|
| **Form state** | `@mantine/form` atau `@refinedev/react-hook-form` |
| **Server state (CRUD)** | Refine data provider (otomatis cache & invalidate) |
| **UI state** | React `useState` / `useReducer` lokal |
| **Global state** | Minimalis. Context untuk theme, auth. Jangan Redux/Zustand tanpa kebutuhan jelas |

**Aturan:**
- Jangan duplikasi server state ke client state
- Refine handles caching & revalidation secara otomatis
- Auth state via context provider

---

## 8. Styling

### 8.1 Mantine UI

```typescript
// ✅ BAIK: Mantine components + props
<Button color="blue" size="sm" onClick={handleSave}>
  Simpan
</Button>

// ❌ JANGAN: Custom CSS untuk komponen standar
```

**Aturan:**
- Gunakan Mantine components sebanyak mungkin
- Custom styling via Mantine `style` prop atau `className` dengan CSS Modules
- Jangan inline style kecuali dynamic values
- Dark/light mode via Mantine `useMantineColorScheme()`

### 8.2 Global Styles

File: `src/styles/global.css`

```css
/* ✅ Hanya untuk global reset, Handsontable theming, font */
```

**Aturan:**
- CSS Modules untuk component-specific styling
- Jangan import CSS global di banyak tempat
- Variables CSS untuk warna, spacing, font

---

## 9. Testing

| Level | Tools | Coverage Target |
|---|---|---|
| **Unit Test** | Vitest + Testing Library | 80% utility functions |
| **Component Test** | Vitest + Testing Library | 60% komponen kritis |
| **Integration Test** | Playwright | Flow utama (login → CRUD → export) |
| **E2E** | Playwright | Critical paths |

**Aturan:**
- Test file di samping file yang di-test: `component.tsx` + `component.test.tsx`
- Naming: `describe('ComponentName')`, `it('should ...')`
- Jangan test implementasi detail — test behavior

---

## 10. Git Workflow

### 10.1 Branch Strategy

```
main          → production-ready
├── develop   → integration branch
│   ├── feat/xxx  → fitur baru
│   ├── fix/xxx   → bug fix
│   ├── refactor/xxx → refactoring
│   └── chore/xxx → tooling, dependencies
```

### 10.2 Commit Convention

Format: `<type>: <deskripsi dalam bahasa Indonesia>`

| Type | Penggunaan |
|---|---|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Refactoring (tanpa perubahan fungsional) |
| `style` | Perubahan formatting, whitespace |
| `docs` | Dokumentasi |
| `chore` | Build tool, dependencies |
| `migration` | Database migration |

**Contoh:**
```
feat: tambah halaman identifikasi risiko dengan Handsontable
fix: perbaiki pagination di tabel audit log
refactor: extract crud-table ke komponen reusable
migration: add model rencana penanganan
```

### 10.3 Code Review

| Aspek | Checklist |
|---|---|
| **Fungsional** | Apakah sesuai spesifikasi? |
| **Type Safety** | Ada `any` atau `as`? |
| **Error Handling** | Semua error ter-handle? |
| **Security** | Ada auth check? |
| **Performance** | N+1 query? Pagination? |
| **Konsistensi** | Sesuai pattern yang ada? |
| **Kompleksitas** | Bisa disederhanakan? |

---

## 11. Error Handling

### 11.1 API Error

```typescript
// ✅ BAIK: try-catch + response konsisten
try {
  const result = await prisma.user.findUnique({ where: { id } })
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(result)
} catch (error) {
  console.error("Error fetching user:", error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
```

### 11.2 Client Error

```typescript
// ✅ BAIK: Notifications untuk user feedback
import { notifications } from "@mantine/notifications"

notifications.show({
  title: "Berhasil",
  message: "Data risiko berhasil disimpan",
  color: "green",
})
```

### 11.3 Error Boundaries

- Setiap modul utama harus punya error boundary
- Jangan biarkan error merembet ke seluruh aplikasi

---

## 12. Security Checklist

| Aturan | Wajib |
|---|---|
| Auth check di setiap API route (kecuali publik) | ✅ |
| `checkPermission()` sebelum operasi data | ✅ |
| Tidak ada plaintext password di response | ✅ |
| SQL injection dicegah via Prisma | ✅ |
| File upload divalidasi tipe & ukuran | ✅ |
| XSS dicegah via React otomatis | ✅ |
| Jangan log password atau token | ✅ |
| Cookie httpOnly untuk session | ✅ |

---

## 13. Performance Guidelines

| Aturan | Detail |
|---|---|
| **Pagination** | Semua list endpoint pakai `skip`/`take` |
| **Eager loading** | `include` hanya relasi yang diperlukan |
| **Code splitting** | Next.js otomatis — jangan import besar di layout |
| **Bundle size** | Monitor dengan `@next/bundle-analyzer` |
| **Image optimization** | Next.js `Image` component |
| **Debounce** | Input pencarian pakai debounce 300ms |

**Hal yang Dihindari:**
- `useEffect` tanpa dependency array
- Fetch data di loop (N+1 di klien)
- Import library besar untuk satu fungsi kecil
- Render ulang tidak perlu (memoization)

---

## 14. Dependency Management

| Aturan | Detail |
|---|---|
| **Package manager** | npm (sesuai lockfile) |
| **Penambahan dep** | Diskusi tim, cek bundle size, cek lisensi |
| **Update** | `npm outdated` berkala. Jangan update mayor tanpa testing |
| **Dev dep** | Pisahkan di `devDependencies` (eslint, types, testing) |
| **Avoid** | Library besar untuk satu fungsi. Tulis sendiri jika sederhana |

---

## 15. Deployment

### 15.1 Build

```bash
npm run build        # Pastikan tidak ada error
npx prisma generate  # Generate Prisma client
npx prisma migrate deploy  # Apply migration
```

### 15.2 Docker

```dockerfile
# Multi-stage build
FROM node:18-alpine AS base
FROM base AS deps       # npm ci --only=production
FROM base AS build      # npm run build
FROM base AS runner     # node server.js
```

### 15.3 Environment Variables

| Variable | Required | Default |
|---|---|---|
| `DATABASE_URL` | ✅ | - |
| `NODE_ENV` | ❌ | `production` |
| `PORT` | ❌ | `3000` |

---

## 16. Code Review Process

### 16.1 Sebelum PR

- [ ] `npm run lint` — tidak ada error
- [ ] `npm run build` — tidak ada error  
- [ ] Test sudah jalan
- [ ] Migration sudah di-generate
- [ ] Branch sudah di-rebase dari develop

### 16.2 Review Checklist

- [ ] Apakah kode mengikuti pattern yang ada?
- [ ] Apakah ada error handling?
- [ ] Apakah ada security issue?
- [ ] Apakah ada performance issue (N+1, no pagination)?
- [ ] Apakah penamaan konsisten?
- [ ] Apakah ada kode mati / comment tidak perlu?
- [ ] Apakah tipe sudah benar (tidak ada `any`)?

---

## 17. Tooling

| Tool | Kegunaan |
|---|---|
| **ESLint** | `next/core-web-vitals` — linting JS/TS |
| **Prettier** | Formatting otomatis (optional — ikuti ESLint) |
| **Prisma Studio** | `npx prisma studio` — visual database editor |
| **Refine Devtools** | Debugging Refine queries |
| **VS Code** | Editor utama. Ekstensi: Prisma, ESLint, Tailwind CSS (jika ada) |

### VS Code Settings (recommended)

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"
  },
  "typescript.strictMode": true,
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

## 18. Dokumentasi

| Dokumen | Isi |
|---|---|
| `PRD.md` | Product Requirements Document |
| `software-architecture.md` | Arsitektur sistem |
| `database-architecture.md` | Arsitektur database |
| `rest-api-spec.md` | Spesifikasi REST API |
| `functional-spec.md` | Spesifikasi fungsional |
| `README.MD` | Cara setup & run project |

**Aturan:**
- Dokumentasi dalam **bahasa Indonesia**
- Update dokumentasi jika ada perubahan signifikan
- Jangan dokumentasikan hal yang sudah jelas dari kode
