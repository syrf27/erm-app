import { z } from "zod";
import { sanitizeHtml, sanitizeRichText } from "@/lib/sanitize";
import { isSafeAppUrl } from "@/lib/safe-url";

/**
 * Zod schemas for input validation
 * All schemas include strict validation to prevent mass assignment
 */

// Common base schemas
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const optionalPositiveInt = z.number().int().positive().optional();
const optionalNonNegativeInt = z.number().int().nonnegative().optional();

const safePlainText = (max: number, requiredMessage?: string) => {
  const schema = z
    .string()
    .trim()
    .max(max)
    .transform((value) => sanitizeHtml(value).trim());

  return requiredMessage
    ? schema.refine((value) => value.length > 0, requiredMessage)
    : schema;
};

const safeRichText = (max: number, requiredMessage: string) =>
  z
    .string()
    .max(max)
    .transform((value) => sanitizeRichText(value))
    .refine((value) => sanitizeHtml(value).trim().length > 0, requiredMessage);

export const safeDocumentUrlSchema = z
  .string()
  .trim()
  .min(1, "Tautan harus diisi")
  .max(2048, "Tautan terlalu panjang")
  .refine(
    isSafeAppUrl,
    "Tautan harus menggunakan http://, https://, atau path internal aplikasi"
  );

export const documentReferenceSchema = z
  .object({
    title: safePlainText(500, "Judul dokumen harus diisi"),
    url: safeDocumentUrlSchema,
  })
  .strict();

// Risk identification schemas
export const createIdentifikasiRisikoSchema = z.object({
  risiko: safePlainText(5000, "Risiko harus diisi"),
  penyebab: safePlainText(5000).optional().nullable(),
  dampak: safePlainText(5000).optional().nullable(),
  jenisRisikoId: positiveInt,
  sumberRisikoId: positiveInt,
  kategoriRisikoId: positiveInt,
  areaDampakId: positiveInt,
  sasaranId: optionalPositiveInt,
  kegiatanId: optionalPositiveInt,
  prosesBisnisId: optionalPositiveInt,
  unitKerjaId: optionalPositiveInt,
  tahun: z.number().int().min(2020).max(2030).default(new Date().getFullYear()),
});

export const updateIdentifikasiRisikoSchema = createIdentifikasiRisikoSchema.partial();

// Risk analysis schemas
export const createAnalisisRisikoSchema = z.object({
  identifikasiRisikoId: positiveInt,
  levelKemungkinanId: optionalPositiveInt,
  levelDampakId: optionalPositiveInt,
  levelRisikoId: optionalPositiveInt,
  pengendalianUraian: safePlainText(5000).optional().nullable(),
  pengendalianEfektivitas: z.enum(["efektif", "cukup_efektif", "kurang_efektif", "tidak_efektif"]).optional().nullable(),
});

export const updateAnalisisRisikoSchema = createAnalisisRisikoSchema.partial().omit({ identifikasiRisikoId: true });

// Risk evaluation schemas
export const createEvaluasiRisikoSchema = z.object({
  identifikasiRisikoId: positiveInt,
  responRisiko: z.enum(["menerima", "menghindari", "mengurangi", "mentransfer"]).optional().nullable(),
  prioritasRisiko: z.number().int().positive().optional().nullable(),
  residualLevelKemungkinanId: optionalPositiveInt,
  residualLevelDampakId: optionalPositiveInt,
  residualLevelRisikoId: optionalPositiveInt,
});

export const updateEvaluasiRisikoSchema = createEvaluasiRisikoSchema.partial().omit({ identifikasiRisikoId: true });

// Risk treatment schemas
export const createRencanaPenangananSchema = z.object({
  identifikasiRisikoId: positiveInt,
  jenisPenanganan: z.enum(["mengurangi", "menerima", "mentransfer", "menghindari"]).optional().nullable(),
  rencanaTidakPenanganan: safePlainText(5000).optional().nullable(),
  targetOutput: safePlainText(5000).optional().nullable(),
  targetWaktu: safePlainText(500).optional().nullable(),
  penanggungJawab: safePlainText(500).optional().nullable(),
  residualLevelKemungkinanId: optionalPositiveInt,
  residualLevelDampakId: optionalPositiveInt,
  keterjadiRisiko: z.enum(["Terjadi", "Tidak Terjadi"]).optional().nullable(),
  realisasiWaktu: safePlainText(500).optional().nullable(),
  realisasiOutput: safePlainText(5000).optional().nullable(),
  dokumenPendukung: z
    .union([safeDocumentUrlSchema, z.literal("")])
    .transform((value) => value || null)
    .optional()
    .nullable(),
  persetujuan: z.enum(["Draft", "Disetujui", "Ditolak"]).default("Draft"),
  disetujuiOleh: safePlainText(500).optional().nullable(),
});

export const updateRencanaPenangananSchema = createRencanaPenangananSchema.partial().omit({ identifikasiRisikoId: true });

// Sasaran schemas
export const createSasaranSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  deskripsi: safePlainText(5000).optional().nullable(),
  unitKerjaId: optionalPositiveInt,
});

export const updateSasaranSchema = createSasaranSchema.partial();

// Kegiatan schemas
export const createKegiatanSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  deskripsi: safePlainText(5000).optional().nullable(),
  unitKerjaId: optionalPositiveInt,
  sasaranId: optionalPositiveInt,
});

export const updateKegiatanSchema = createKegiatanSchema.partial();

// ProsesBisnis schemas
export const createProsesBisnisSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  deskripsi: safePlainText(5000).optional().nullable(),
  kegiatanId: optionalPositiveInt,
});

export const updateProsesBisnisSchema = createProsesBisnisSchema.partial();

// UnitKerja schemas
export const createUnitKerjaSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  kode: safePlainText(50, "Kode harus diisi"),
});

export const updateUnitKerjaSchema = createUnitKerjaSchema.partial();

// Reference data schemas (jenis-risiko, sumber-risiko, kategori-risiko, area-dampak, etc.)
export const createReferenceSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  deskripsi: safePlainText(5000).optional().nullable(),
});

export const updateReferenceSchema = createReferenceSchema.partial();

export const createAreaDampakSchema = z.object({
  kode: z.string().trim().toUpperCase().regex(/^D\d{2}$/, "Kode harus berformat D01-D99"),
  nama: safePlainText(500, "Nama harus diisi"),
});

export const updateAreaDampakSchema = createAreaDampakSchema.partial();

export const createFaqSchema = z.object({
  question: safeRichText(5000, "Pertanyaan harus diisi"),
  answer: safeRichText(10000, "Jawaban harus diisi"),
  order: z.number().int().nonnegative().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

export const createRepositoriSchema = z
  .object({
    title: safePlainText(500, "Judul dokumen harus diisi"),
    url: safeDocumentUrlSchema,
    category: z.enum(["pedoman", "bukti_dukung", "laporan"]),
    tahun: z.number().int().min(2020).max(2035),
    uploader: safePlainText(500, "Uploader harus diisi"),
  })
  .strict();

export const updateRepositoriSchema = createRepositoriSchema
  .omit({ uploader: true })
  .partial()
  .strict();

export const createDokumenPendukungSchema = documentReferenceSchema.extend({
  rencanaPenangananId: positiveInt,
});

export const updateDokumenPendukungSchema = documentReferenceSchema.partial().strict();

// Level schemas
export const createLevelKemungkinanSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  skala: z.number().int().min(1).max(5),
});

export const createLevelDampakSchema = z.object({
  nama: z.string().min(1).max(500),
  skala: z.number().int().min(1).max(5),
  deskripsi: safePlainText(5000).optional().nullable(),
});

export const createLevelRisikoSchema = z.object({
  nama: safePlainText(500, "Nama harus diisi"),
  deskripsi: safePlainText(5000).optional().nullable(),
  rentang: safePlainText(50).optional().nullable(),
  tindakan: safePlainText(5000).optional().nullable(),
  warna: safePlainText(50).optional().nullable(),
});

// Matrix schemas
export const createMatriksAnalisisRisikoSchema = z.object({
  levelKemungkinanId: positiveInt,
  levelDampakId: positiveInt,
  besaran: z.number().int().min(1).max(25),
  levelRisikoId: positiveInt,
});

export const createSeleraRisikoSchema = z.object({
  kategoriRisikoId: positiveInt,
  besaranRisikoMinimum: z.number().int().min(0).max(25),
  deskripsi: safePlainText(5000).optional().nullable(),
});

export const updateSeleraRisikoSchema = createSeleraRisikoSchema.partial();

export const createSeleraRisikoGlobalSchema = z.object({
  nilai: z.number().int().min(0, "Nilai selera risiko tidak boleh negatif").max(25, "Nilai selera risiko maksimal 25"),
});

export const updateSeleraRisikoGlobalSchema = createSeleraRisikoGlobalSchema.partial();

// KRI schemas
export const createKRISchema = z.object({
  namaIndikator: safePlainText(500, "Nama indikator harus diisi"),
  deskripsi: safePlainText(5000).optional().nullable(),
  batasHijau: z.number().optional().nullable(),
  batasKuning: z.number().optional().nullable(),
  batasMerah: z.number().optional().nullable(),
  nilaiAktual: z.number().optional().nullable(),
  frekuensiPemantauan: safePlainText(100).optional().nullable(),
  identifikasiRisikoId: optionalPositiveInt,
  penanggungJawab: safePlainText(500).optional().nullable(),
  targetNilaiHarapan: z.number().optional().nullable(),
});

export const updateKRISchema = createKRISchema.partial();

// User schemas
export const createUserSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  name: z.string().min(1).max(500),
  password: z.string().min(8, "Password minimal 8 karakter").max(100),
  roleId: positiveInt,
  teamIds: z.array(z.number()).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(500).optional(),
  roleId: optionalPositiveInt,
  password: z.string().min(8, "Password minimal 8 karakter").max(100).optional(),
  teamIds: z.array(z.number()).optional(),
  permissions: z.array(z.object({
    permissionId: z.number(),
    value: z.string(),
  })).optional(),
});

// Role schemas
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateRoleSchema = createRoleSchema.partial();

// Permission schemas
export const createPermissionSchema = z.object({
  resource: z.string().min(1).max(100),
  action: z.enum(["create", "read", "update", "delete"]),
});

export const updatePermissionSchema = createPermissionSchema.partial();

// Permission assignment schemas
export const assignRolePermissionSchema = z.object({
  permissionIds: z.array(positiveInt),
});

export const assignUserPermissionSchema = z.object({
  permissions: z.array(z.object({
    permissionId: positiveInt,
    value: z.enum(["grant", "deny"]),
  })),
});

// Audit log schemas
export const createAuditLogSchema = z.object({
  userId: z.union([z.string(), z.number()]),
  userName: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.union([z.string(), z.number()]).optional().nullable(),
  details: z.any().optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(20),
  tahun: z.number().int().min(2020).max(2030).optional(),
});

// Type exports for use in API routes
export type CreateIdentifikasiRisiko = z.infer<typeof createIdentifikasiRisikoSchema>;
export type UpdateIdentifikasiRisiko = z.infer<typeof updateIdentifikasiRisikoSchema>;
export type CreateAnalisisRisiko = z.infer<typeof createAnalisisRisikoSchema>;
export type UpdateAnalisisRisiko = z.infer<typeof updateAnalisisRisikoSchema>;
export type CreateEvaluasiRisiko = z.infer<typeof createEvaluasiRisikoSchema>;
export type UpdateEvaluasiRisiko = z.infer<typeof updateEvaluasiRisikoSchema>;
export type CreateRencanaPenanganan = z.infer<typeof createRencanaPenangananSchema>;
export type UpdateRencanaPenanganan = z.infer<typeof updateRencanaPenangananSchema>;
export type CreateSasaran = z.infer<typeof createSasaranSchema>;
export type UpdateSasaran = z.infer<typeof updateSasaranSchema>;
export type CreateKegiatan = z.infer<typeof createKegiatanSchema>;
export type UpdateKegiatan = z.infer<typeof updateKegiatanSchema>;
export type CreateProsesBisnis = z.infer<typeof createProsesBisnisSchema>;
export type UpdateProsesBisnis = z.infer<typeof updateProsesBisnisSchema>;
export type CreateUnitKerja = z.infer<typeof createUnitKerjaSchema>;
export type UpdateUnitKerja = z.infer<typeof updateUnitKerjaSchema>;
export type CreateReference = z.infer<typeof createReferenceSchema>;
export type UpdateReference = z.infer<typeof updateReferenceSchema>;
export type CreateFaq = z.infer<typeof createFaqSchema>;
export type UpdateFaq = z.infer<typeof updateFaqSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
export type CreatePermission = z.infer<typeof createPermissionSchema>;
export type CreateKRI = z.infer<typeof createKRISchema>;
export type UpdateKRI = z.infer<typeof updateKRISchema>;
export type CreateSeleraRisiko = z.infer<typeof createSeleraRisikoSchema>;
export type UpdateSeleraRisiko = z.infer<typeof updateSeleraRisikoSchema>;
export type CreateSeleraRisikoGlobal = z.infer<typeof createSeleraRisikoGlobalSchema>;
export type UpdateSeleraRisikoGlobal = z.infer<typeof updateSeleraRisikoGlobalSchema>;
export type CreateAuditLog = z.infer<typeof createAuditLogSchema>;
export type SearchParams = z.infer<typeof searchSchema>;
