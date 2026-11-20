# Pemantauan Triwulanan dan Risiko Lanjutan

## Ringkasan

Fitur ini menambahkan siklus pemantauan per triwulan, riwayat hasil, dan rantai
risiko lanjutan. Penilaian risiko (besaran, level, warna) hanya berasal dari
pasangan matriks kemungkinan–dampak. Tidak ada fallback perkalian skala.

Aturan batas selera:

- `residual < selera` → sudah di bawah selera.
- `residual >= selera` → belum di bawah selera.
- Matriks/selera belum tersedia → **Belum dapat dinilai** (bukan nol).

## Migrasi

Migration aditif: `prisma/migrations/20261120000000_add_quarterly_monitoring_follow_up`.

Lokal:

```bash
npx prisma migrate deploy
npx prisma generate
```

Supabase/produksi (jalankan setelah backup dan persetujuan):

```bash
DATABASE_URL="<connection-string-supabase>" npx prisma migrate deploy
npx prisma generate
```

Migration tidak menghapus data. Record lama otomatis `ACTIVE` tanpa parent dan
tanpa source monitoring. Migration tidak membuat risiko lanjutan dari data lama.

Setelah deploy schema, jalankan seed permission agar role non-admin memiliki izin
resource baru:

```bash
npx tsx prisma/seed.ts
```

API juga memiliki fallback kompatibilitas ke izin `rencana-penanganan` dan
`identifikasi-risiko` sampai seed dijalankan.

## Periode mulai penerapan

Default: triwulan saat fitur diaktifkan (Asia/Jakarta). Kunci eksplisit melalui:

```bash
PEMANTAUAN_MULAI_TAHUN=2026
PEMANTAUAN_MULAI_TRIWULAN=4
```

Non-admin tidak dapat membuat pemantauan sebelum periode tersebut. Kewajiban
historis tidak dibangkitkan otomatis.

## Job pengingat

Endpoint: `POST /api/kewajiban-tindak-lanjut/reminder`

- Kirim header `x-reminder-secret: <REMINDER_JOB_SECRET>` dari cron, atau login
  sebagai Admin.
- Interval 7 hari, satu notifikasi per kewajiban/per penerima/per interval.
- Penerima: anggota Tim Kerja pemilik risiko dan seluruh Admin.
- Jadwalkan harian; endpoint hanya memproses kewajiban yang sudah jatuh tempo.

Contoh cron harian (08.00 WIB):

```cron
0 8 * * * curl -s -X POST https://<host>/api/kewajiban-tindak-lanjut/reminder -H "x-reminder-secret: $REMINDER_JOB_SECRET"
```

## Alur kerja

1. Tim membuka **Pemantauan Risiko**, memilih tahun/triwulan.
2. Isi draf (boleh belum lengkap), lalu **Ajukan**.
3. Admin **Finalisasi** (atau **Kembalikan** dengan alasan).
4. Jika respons final `mengurangi` dan residual `>=` selera, sistem membuat draf
   risiko lanjutan + kewajiban.
5. Tim melengkapi wizard lanjutan dan mengajukan.
6. Admin **Sahkan**. Risiko asal menjadi `CONTINUED`, lanjutan `ACTIVE`, kewajiban
   `SELESAI` dalam satu transaksi.

## Integritas workflow (review perbaikan)

- Semua penulisan residual Evaluasi melalui guard `assertResidualMutable` di dalam
  transaksi: API generik, batch spreadsheet, impor Excel, dan wizard lanjutan.
  Setelah ada hasil FINAL/SUPERSEDED, perubahan harus melalui revisi pemantauan
  (HTTP 409 `FINAL_RESIDUAL_PROTECTED`). Field non-residual tetap dapat diedit.
- Seluruh transisi memakai conditional update `id + version + status`:
  simpan draf, ajukan/kembalikan/finalisasi, draf lanjutan, pengesahan, revisi,
  dan pembatalan kewajiban. Dua request dengan versi sama tidak dapat sama-sama
  menang.
- Finalisasi bersamaan: satu request mengklaim baris, yang lain menerima hasil
  final yang sama (`alreadyFinal`) atau 409.
- Pengesahan penerus memakai `approveFollowUp` atomik: klaim versi/status,
  cek penerus aktif lain, ubah asal menjadi `CONTINUED`, selesaikan kewajiban.
- Penerus kedua lintas triwulan diblokir (`OPEN_OBLIGATION`) dengan tautan ke
  kewajiban sebelumnya; pengamatan periode berikutnya tetap tersimpan.

## Rekonsiliasi koreksi

Saat revisi final disahkan (`finalizeMonitoring` dengan `previousRevisionId`):

| Kondisi penerus | Pemicu masih ada | Pemicu hilang |
|---|---|---|
| Belum ada | Buat penerus + kewajiban | Tidak ada aksi |
| `FOLLOW_UP_DRAFT` | `REVIEW_DRAFT` (isian tim tidak ditimpa) | `CANCELLED` + draf `FOLLOW_UP_CANCELLED` |
| `FOLLOW_UP_SUBMITTED` | `REOPENED_FOR_REVIEW` (kembali draf) | `CANCELLED` |
| `ACTIVE` | Wajib keputusan rekonsiliasi admin | Wajib keputusan rekonsiliasi admin |

Keputusan disimpan pada `PemantauanRisiko.reconciliationDecision/Note/By/At`
dan ditampilkan pada riwayat. Penerus aktif tidak pernah diubah/dihapus otomatis.
Pembatalan kewajiban hanya melalui `cancel-obligation` dengan
`correctionMonitoringId` yang merupakan revisi final pemicu dan tidak lagi
memenuhi aturan tindak lanjut. Status kewajiban dibedakan: `SELESAI` (disahkan)
vs `DIBATALKAN` (koreksi), dengan audit.

## Laporan dan matriks historis

- `GET /api/pemantauan-risiko/laporan` dan
  `GET /api/pemantauan-risiko/laporan/export` hanya membaca snapshot final
  (residual acuan/hasil/harapan, selera, respons, validator, rantai, kewajiban).
  Mengubah matriks/selera sekarang tidak mengubah hasil periode final.
- `GET /api/matriks-historis?tahun=&triwulan=` mengembalikan posisi hasil final
  dari snapshot. Latar matriks memakai `matriksSnapshot` yang disimpan saat
  finalisasi; jika tidak tersedia (data legacy) UI menyatakan keterbatasan dan
  tidak memakai matriks terbaru seolah-olah snapshot lama.
- Halaman Pemantauan memiliki mode **Aktif/Historis**. Mode historis menampilkan
  risiko `CONTINUED` dan arsip yang memiliki hasil final pada periode tersebut,
  tanpa menjadikannya kewajiban aktif.
- Periode mulai penerapan disimpan di `AppSetting.monitoring_start_periode`
  jika env tidak diisi, sehingga tidak bergeser pada triwulan berikutnya.

## Notifikasi

- Notifikasi in-app memakai `Notification.dedupeKey` unik per kewajiban/penerima/
  interval 7 hari, sehingga retry atau job bersamaan tidak menggandakan pesan.
- Penerima dihitung saat pengiriman dari keanggotaan tim terkini.
- Kegagalan pengiriman tidak membatalkan finalisasi; job pengingat akan mencoba
  ulang.

## Pengujian

```bash
npm run test:risk
# DB terisolasi (nama database wajib mengandung _test)
DATABASE_URL="postgresql://.../erm_db_test" npx prisma migrate deploy
DATABASE_URL="postgresql://.../erm_db_test" npm run test:integration
npm run lint
npm run build
```

Integration test mencakup trigger/non-trigger, guard residual final, konflik
versi, finalisasi & pengesahan bersamaan, barrier lintas triwulan, rekonsiliasi
draf/diajukan/aktif, pembatalan tanpa koreksi, isolasi tim, snapshot laporan,
rollback transaksi, default data legacy, dan periode aktivasi stabil.

## Rollback aplikasi

Rollback kode diperbolehkan; **jangan** menghapus tabel/riwayat baru. Schema tetap
kompatibel dengan versi lama karena semua kolom baru memiliki default atau nullable.
