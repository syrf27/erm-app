import { z } from "zod";

/**
 * Zod schemas for input validation
 * All schemas include strict validation to prevent mass assignment
 */

// Common base schemas
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const optionalPositiveInt = z.number().int().positive().optional();
const optionalNonNegativeInt = z.number().int().nonnegative().optional();

// Risk identification schemas
export const createIdentifikasiRisikoSchema = z.object({
  risiko: z.string().min(1, "Risiko harus diisi").max(5000, "Risiko terlalu panjang"),
  penyebab: z.string().max(5000, "Penyebab terlalu panjang").optional().nullable(),
  dampak: z.string().max(5000, "Dampak terlalu panjang").optional().nullable(),
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
  pengendalianUraian: z.string().max(5000).optional().nullable(),
  pengendalianEfektivitas: z.enum(["efektif", "cukup_efektif", "kurang_efektif", "tidak_efektif"]).optional().nullable(),
});

export const updateAnalisisRisikoSchema = createAnalisisRisikoSchema.partial().omit({ identifikasiRisikoId: true });

// Risk evaluation schemas
export const createEvaluasiRisikoSchema = z.object({
  identifikasiRisikoId: positiveInt,
  responRisiko: z.enum(["menerima", "menghindari", "mengurangi", "mentransfer"]).optional().nullable(),
  residualLevelKemungkinanId: optionalPositiveInt,
  residualLevelDampakId: optionalPositiveInt,
  residualLevelRisikoId: optionalPositiveInt,
});

export const updateEvaluasiRisikoSchema = createEvaluasiRisikoSchema.partial().omit({ identifikasiRisikoId: true });

// Risk treatment schemas
export const createRencanaPenangananSchema = z.object({
  identifikasiRisikoId: positiveInt,
  jenisPenanganan: z.enum(["mengurangi", "menerima", "mentransfer", "menghindari"]).optional().nullable(),
  rencanaTidakPenanganan: z.string().max(5000).optional().nullable(),
  targetOutput: z.string().max(5000).optional().nullable(),
  targetWaktu: z.string().max(500).optional().nullable(),
  penanggungJawab: z.string().max(500).optional().nullable(),
  residualLevelKemungkinanId: optionalPositiveInt,
  residualLevelDampakId: optionalPositiveInt,
  keterjadiRisiko: z.enum(["Terjadi", "Tidak Terjadi"]).optional().nullable(),
  realisasiWaktu: z.string().max(500).optional().nullable(),
  realisasiOutput: z.string().max(5000).optional().nullable(),
  dokumenPendukung: z.string().max(500).optional().nullable(),
  persetujuan: z.enum(["Draft", "Disetujui", "Ditolak"]).default("Draft"),
  disetujuiOleh: z.string().max(500).optional().nullable(),
});

export const updateRencanaPenangananSchema = createRencanaPenangananSchema.partial().omit({ identifikasiRisikoId: true });

// Sasaran schemas
export const createSasaranSchema = z.object({
  nama: z.string().min(1).max(500),
  deskripsi: z.string().max(5000).optional().nullable(),
  unitKerjaId: optionalPositiveInt,
});

export const updateSasaranSchema = createSasaranSchema.partial();

// Kegiatan schemas
export const createKegiatanSchema = z.object({
  nama: z.string().min(1).max(500),
  deskripsi: z.string().max(5000).optional().nullable(),
  unitKerjaId: optionalPositiveInt,
  sasaranId: optionalPositiveInt,
});

export const updateKegiatanSchema = createKegiatanSchema.partial();

// ProsesBisnis schemas
export const createProsesBisnisSchema = z.object({
  nama: z.string().min(1).max(500),
  deskripsi: z.string().max(5000).optional().nullable(),
  kegiatanId: optionalPositiveInt,
});

export const updateProsesBisnisSchema = createProsesBisnisSchema.partial();

// UnitKerja schemas
export const createUnitKerjaSchema = z.object({
  nama: z.string().min(1).max(500),
  kode: z.string().min(1).max(50),
});

export const updateUnitKerjaSchema = createUnitKerjaSchema.partial();

// Reference data schemas (jenis-risiko, sumber-risiko, kategori-risiko, area-dampak, etc.)
export const createReferenceSchema = z.object({
  nama: z.string().min(1).max(500),
  deskripsi: z.string().max(5000).optional().nullable(),
});

export const updateReferenceSchema = createReferenceSchema.partial();

// Level schemas
export const createLevelKemungkinanSchema = z.object({
  nama: z.string().min(1).max(500),
  skala: z.number().int().min(1).max(5),
});

export const createLevelDampakSchema = z.object({
  nama: z.string().min(1).max(500),
  skala: z.number().int().min(1).max(5),
  deskripsi: z.string().max(5000).optional().nullable(),
});

export const createLevelRisikoSchema = z.object({
  nama: z.string().min(1).max(500),
  deskripsi: z.string().max(5000).optional().nullable(),
  rentang: z.string().max(50).optional().nullable(),
  tindakan: z.string().max(5000).optional().nullable(),
  warna: z.string().max(50).optional().nullable(),
});

// Matrix schemas
export const createMatriksAnalisisRisikoSchema = z.object({
  levelKemungkinanId: positiveInt,
  levelDampakId: positiveInt,
  besaran: z.number().int().min(1).max(25),
  levelRisikoId: positiveInt,
});

// KRI schemas
export const createKRISchema = z.object({
  namaIndikator: z.string().min(1).max(500),
  deskripsi: z.string().max(5000).optional().nullable(),
  batasHijau: z.number().optional().nullable(),
  batasKuning: z.number().optional().nullable(),
  batasMerah: z.number().optional().nullable(),
  nilaiAktual: z.number().optional().nullable(),
  frekuensiPemantauan: z.string().max(100).optional().nullable(),
  identifikasiRisikoId: optionalPositiveInt,
  penanggungJawab: z.string().max(500).optional().nullable(),
  targetNilaiHarapan: z.number().optional().nullable(),
});

export const updateKRISchema = createKRISchema.partial();

// User schemas
export const createUserSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  name: z.string().min(1).max(500),
  password: z.string().min(8, "Password minimal 8 karakter").max(100),
  roleId: positiveInt,
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(500).optional(),
  roleId: optionalPositiveInt,
  // Password handled separately for security
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
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
export type CreatePermission = z.infer<typeof createPermissionSchema>;
export type CreateKRI = z.infer<typeof createKRISchema>;
export type UpdateKRI = z.infer<typeof updateKRISchema>;
export type CreateAuditLog = z.infer<typeof createAuditLogSchema>;
export type SearchParams = z.infer<typeof searchSchema>;