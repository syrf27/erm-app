import type { Prisma } from "@/generated/prisma";
import {
  assessRisk,
  resolveAssessmentFromDb,
  type AssessmentDb,
} from "@/lib/risk-assessment";
import {
  assertResidualMutable,
  lockRiskForResidual,
} from "@/lib/pemantauan-integrity";
import { DomainError } from "@/lib/domain-error";

export { DomainError };

export interface IdentifikasiInput {
  risiko: string;
  jenisRisikoId: number;
  sumberRisikoId: number;
  kategoriRisikoId: number;
  areaDampakId: number;
  penyebab?: string | null;
  dampak?: string | null;
  sasaranId?: number | null;
  kegiatanId?: number | null;
  prosesBisnisId?: number | null;
  unitKerjaId?: number | null;
  teamId?: number | null;
  tahun: number;
}

export interface AnalisisInput {
  levelKemungkinanId?: number | null;
  levelDampakId?: number | null;
  levelRisikoId?: number | null;
  pengendalianUraian?: string | null;
  pengendalianEfektivitas?: string | null;
}

export interface EvaluasiInput {
  responRisiko?: string | null;
  prioritasRisiko?: number | null;
  residualLevelKemungkinanId?: number | null;
  residualLevelDampakId?: number | null;
  residualLevelRisikoId?: number | null;
}

export interface RencanaInput {
  jenisPenanganan?: string | null;
  rencanaTidakPenanganan?: string | null;
  targetOutput?: string | null;
  targetWaktu?: string | null;
  penanggungJawab?: string | null;
  residualLevelKemungkinanId?: number | null;
  residualLevelDampakId?: number | null;
  targetResidualLevelKemungkinanId?: number | null;
  targetResidualLevelDampakId?: number | null;
  alasanPenguatan?: string | null;
  keterjadiRisiko?: string | null;
  realisasiWaktu?: string | null;
  realisasiOutput?: string | null;
  dokumenPendukung?: string | null;
  persetujuan?: string | null;
  disetujuiOleh?: string | null;
}

export interface RiskRegisterInput {
  identifikasi: IdentifikasiInput;
  analisis?: AnalisisInput | null;
  evaluasi?: EvaluasiInput | null;
  rencana?: RencanaInput | null;
}

type Db = Prisma.TransactionClient | typeof import("@/lib/prisma").prisma;

function hasPair(k?: number | null, d?: number | null): boolean {
  return (
    typeof k === "number" &&
    Number.isInteger(k) &&
    k > 0 &&
    typeof d === "number" &&
    Number.isInteger(d) &&
    d > 0
  );
}

function hasOneOfPair(k?: number | null, d?: number | null): boolean {
  return (
    (typeof k === "number" && k > 0) !== (typeof d === "number" && d > 0)
  );
}

async function assertPairAvailable(
  db: Db,
  k: number | null | undefined,
  d: number | null | undefined,
  label: string
): Promise<number | null> {
  if (hasOneOfPair(k, d)) {
    throw new DomainError(`${label} harus diisi berpasangan.`);
  }
  if (!hasPair(k, d)) return null;
  const assessment = await resolveAssessmentFromDb(
    db as unknown as AssessmentDb,
    k,
    d
  );
  if (assessment.status !== "OK" || assessment.levelRisikoId == null) {
    throw new DomainError(
      `${label} tidak ditemukan pada Matriks Risiko. Nilai belum dapat dihitung.`
    );
  }
  return assessment.levelRisikoId;
}

export function hasRencanaContent(rencana?: RencanaInput | null): boolean {
  if (!rencana) return false;
  return Boolean(
    rencana.rencanaTidakPenanganan ||
      rencana.targetOutput ||
      rencana.targetWaktu ||
      rencana.penanggungJawab ||
      rencana.residualLevelKemungkinanId ||
      rencana.residualLevelDampakId ||
      rencana.targetResidualLevelKemungkinanId ||
      rencana.targetResidualLevelDampakId
  );
}

/**
 * Membuat identifikasi + analisis + evaluasi + RTP secara atomik.
 * Nilai resmi level risiko selalu dihitung ulang dari matriks di server.
 */
export async function createRiskRegister(
  db: Db,
  input: RiskRegisterInput,
  options?: { identifikasiOverride?: Record<string, unknown> }
) {
  const { identifikasi, analisis, evaluasi, rencana } = input;

  const levelRisikoId = analisis
    ? await assertPairAvailable(
        db,
        analisis.levelKemungkinanId,
        analisis.levelDampakId,
        "Level kemungkinan dan dampak aktual"
      )
    : null;
  const residualLevelRisikoId = evaluasi
    ? await assertPairAvailable(
        db,
        evaluasi.residualLevelKemungkinanId,
        evaluasi.residualLevelDampakId,
        "Residual evaluasi"
      )
    : null;
  if (rencana) {
    await assertPairAvailable(
      db,
      rencana.residualLevelKemungkinanId,
      rencana.residualLevelDampakId,
      "Residual RTP"
    );
    await assertPairAvailable(
      db,
      rencana.targetResidualLevelKemungkinanId,
      rencana.targetResidualLevelDampakId,
      "Residual harapan RTP"
    );
  }

  const createdIdent = await db.identifikasiRisiko.create({
    data: {
      ...identifikasi,
      ...(options?.identifikasiOverride ?? {}),
    },
  });
  const identId = createdIdent.id;

  let createdAnalisis = null;
  let createdEvaluasi = null;
  let createdRencana = null;

  if (analisis) {
    createdAnalisis = await db.analisisRisiko.create({
      data: {
        ...analisis,
        ...(levelRisikoId != null ? { levelRisikoId } : {}),
        identifikasiRisikoId: identId,
      },
    });
  }
  if (evaluasi) {
    createdEvaluasi = await db.evaluasiRisiko.create({
      data: {
        ...evaluasi,
        ...(residualLevelRisikoId != null
          ? { residualLevelRisikoId }
          : { residualLevelRisikoId: null }),
        identifikasiRisikoId: identId,
      },
    });
  }
  if (hasRencanaContent(rencana)) {
    createdRencana = await db.rencanaPenanganan.create({
      data: { ...rencana, identifikasiRisikoId: identId },
    });
  }

  return {
    identifikasi: createdIdent,
    analisis: createdAnalisis,
    evaluasi: createdEvaluasi,
    rencana: createdRencana,
  };
}

/**
 * Menyimpan (upsert) tahap-tahap risiko lanjutan. Dipakai wizard lanjutan.
 * Status siklus tidak dapat diubah dari payload klien.
 */
export async function upsertRiskStages(
  db: Db,
  riskId: number,
  input: RiskRegisterInput
) {
  const { identifikasi, analisis, evaluasi, rencana } = input;

  const levelRisikoId = analisis
    ? await assertPairAvailable(
        db,
        analisis.levelKemungkinanId,
        analisis.levelDampakId,
        "Level kemungkinan dan dampak aktual"
      )
    : null;
  const residualLevelRisikoId = evaluasi
    ? await assertPairAvailable(
        db,
        evaluasi.residualLevelKemungkinanId,
        evaluasi.residualLevelDampakId,
        "Residual evaluasi"
      )
    : null;
  if (rencana) {
    await assertPairAvailable(
      db,
      rencana.residualLevelKemungkinanId,
      rencana.residualLevelDampakId,
      "Residual RTP"
    );
    await assertPairAvailable(
      db,
      rencana.targetResidualLevelKemungkinanId,
      rencana.targetResidualLevelDampakId,
      "Residual harapan RTP"
    );
  }

  await db.identifikasiRisiko.update({
    where: { id: riskId },
    data: {
      risiko: identifikasi.risiko,
      jenisRisikoId: identifikasi.jenisRisikoId,
      sumberRisikoId: identifikasi.sumberRisikoId,
      kategoriRisikoId: identifikasi.kategoriRisikoId,
      areaDampakId: identifikasi.areaDampakId,
      penyebab: identifikasi.penyebab ?? null,
      dampak: identifikasi.dampak ?? null,
      sasaranId: identifikasi.sasaranId ?? null,
      kegiatanId: identifikasi.kegiatanId ?? null,
      prosesBisnisId: identifikasi.prosesBisnisId ?? null,
      unitKerjaId: identifikasi.unitKerjaId ?? null,
      ...(identifikasi.teamId !== undefined
        ? { teamId: identifikasi.teamId }
        : {}),
      tahun: identifikasi.tahun,
    },
  });

  let savedAnalisis = null;
  let savedEvaluasi = null;
  let savedRencana = null;

  if (analisis) {
    savedAnalisis = await db.analisisRisiko.upsert({
      where: { identifikasiRisikoId: riskId },
      create: {
        ...analisis,
        levelRisikoId: levelRisikoId,
        identifikasiRisikoId: riskId,
      },
      update: {
        ...analisis,
        levelRisikoId: levelRisikoId,
      },
    });
  }
  if (evaluasi) {
    await lockRiskForResidual(db as never, riskId);
    await assertResidualMutable(db as never, riskId);
    savedEvaluasi = await db.evaluasiRisiko.upsert({
      where: { identifikasiRisikoId: riskId },
      create: {
        ...evaluasi,
        residualLevelRisikoId,
        identifikasiRisikoId: riskId,
      },
      update: {
        ...evaluasi,
        residualLevelRisikoId,
      },
    });
  }
  if (rencana) {
    savedRencana = await db.rencanaPenanganan.upsert({
      where: { identifikasiRisikoId: riskId },
      create: { ...rencana, identifikasiRisikoId: riskId },
      update: { ...rencana },
    });
  }

  return {
    analisis: savedAnalisis,
    evaluasi: savedEvaluasi,
    rencana: savedRencana,
  };
}

export interface StageCompletenessInput {
  analisis?: {
    levelKemungkinanId?: number | null;
    levelDampakId?: number | null;
    pengendalianUraian?: string | null;
  } | null;
  evaluasi?: {
    responRisiko?: string | null;
    residualLevelKemungkinanId?: number | null;
    residualLevelDampakId?: number | null;
  } | null;
  rencana?: {
    rencanaTidakPenanganan?: string | null;
    jenisPenanganan?: string | null;
    targetOutput?: string | null;
    targetWaktu?: string | null;
    penanggungJawab?: string | null;
    targetResidualLevelKemungkinanId?: number | null;
    targetResidualLevelDampakId?: number | null;
    alasanPenguatan?: string | null;
  } | null;
}

export function validateFollowUpCompleteness(
  input: StageCompletenessInput
): string[] {
  const errors: string[] = [];
  const { analisis, evaluasi, rencana } = input;

  if (!analisis) {
    errors.push("Analisis risiko lanjutan wajib ditinjau.");
  } else {
    if (!analisis.pengendalianUraian?.trim()) {
      errors.push("Uraian pengendalian yang telah tersedia wajib ditinjau.");
    }
    if (
      !hasPair(analisis.levelKemungkinanId, analisis.levelDampakId)
    ) {
      errors.push("Risiko aktual (kemungkinan dan dampak) wajib diisi.");
    }
  }

  if (!evaluasi) {
    errors.push("Evaluasi risiko lanjutan wajib diisi.");
  } else {
    if (!evaluasi.responRisiko) {
      errors.push("Respons risiko wajib diisi.");
    }
    if (
      !hasPair(
        evaluasi.residualLevelKemungkinanId,
        evaluasi.residualLevelDampakId
      )
    ) {
      errors.push("Residual evaluasi baru wajib diisi berpasangan.");
    }
  }

  if (!rencana) {
    errors.push("RTP baru wajib diisi.");
  } else {
    if (!rencana.rencanaTidakPenanganan?.trim()) {
      errors.push("Uraian RTP baru wajib diisi.");
    }
    if (!rencana.jenisPenanganan) {
      errors.push("Jenis penanganan wajib diisi.");
    }
    if (!rencana.targetOutput?.trim()) {
      errors.push("Target output wajib diisi.");
    }
    if (!rencana.targetWaktu?.trim()) {
      errors.push("Target waktu wajib diisi.");
    }
    if (!rencana.penanggungJawab?.trim()) {
      errors.push("Penanggung jawab wajib diisi.");
    }
    if (
      !hasPair(
        rencana.targetResidualLevelKemungkinanId,
        rencana.targetResidualLevelDampakId
      )
    ) {
      errors.push("Residual harapan wajib diisi berpasangan.");
    }
    if (!rencana.alasanPenguatan?.trim()) {
      errors.push("Alasan perubahan atau penguatan RTP wajib diisi.");
    }
  }

  return errors;
}

export async function resolvePairOrNull(
  db: Db,
  k?: number | null,
  d?: number | null
): Promise<{ besaran: number | null; levelRisikoId: number | null; level: string | null; warna: string | null }> {
  if (!hasPair(k, d)) {
    return { besaran: null, levelRisikoId: null, level: null, warna: null };
  }
  const assessment = await resolveAssessmentFromDb(
    db as unknown as AssessmentDb,
    k,
    d
  );
  return {
    besaran: assessment.besaran,
    levelRisikoId: assessment.levelRisikoId,
    level: assessment.level,
    warna: assessment.warna,
  };
}

export function assessPair(
  entries: Parameters<typeof assessRisk>[0],
  k?: number | null,
  d?: number | null
) {
  return assessRisk(entries, k, d);
}
