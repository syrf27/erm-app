import { prisma } from "@/lib/prisma";
import {
  currentPeriode,
  isValidPeriode,
  monitoringStartPeriode,
  type Periode,
} from "@/lib/risk-assessment";
import { DomainError } from "@/lib/domain-error";
import { PEMANTAUAN_STATUS } from "@/lib/risk-cycle";

type AnyDb = {
  pemantauanRisiko: {
    findFirst(args: unknown): Promise<unknown>;
  };
  appSetting: {
    findUnique(args: unknown): Promise<{ value: string } | null>;
    upsert(args: unknown): Promise<{ value: string }>;
  };
  matriksAnalisisRisiko: {
    findMany(args: unknown): Promise<unknown[]>;
  };
  levelKemungkinan: { findMany(args: unknown): Promise<unknown[]> };
  levelDampak: { findMany(args: unknown): Promise<unknown[]> };
  levelRisiko: { findMany(args: unknown): Promise<unknown[]> };
  seleraRisiko: { findMany(args: unknown): Promise<unknown[]> };
  seleraRisikoGlobal: { findMany(args: unknown): Promise<unknown[]> };
};

export const FINAL_RESIDUAL_PROTECTED = "FINAL_RESIDUAL_PROTECTED";

const RESIDUAL_FIELDS = [
  "residualLevelKemungkinanId",
  "residualLevelDampakId",
  "residualLevelRisikoId",
] as const;

export function touchesResidual(data: Record<string, unknown>): boolean {
  return RESIDUAL_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(data, field)
  );
}

interface BlockingMonitoring {
  id: number;
  tahun: number;
  triwulan: number;
  status: string;
}

/**
 * Satu-satunya pintu untuk mengubah residual Evaluasi. Setelah ada hasil
 * pemantauan final (atau revisi yang menggantikannya), perubahan harus melalui
 * revisi pemantauan, bukan endpoint generik/batch/import.
 *
 * Wajib dipanggil di dalam transaksi yang sama dengan penulisan.
 */
export async function assertResidualMutable(
  db: AnyDb,
  riskId: number
): Promise<void> {
  if (!Number.isInteger(riskId) || riskId <= 0) return;
  const blocking = (await db.pemantauanRisiko.findFirst({
    where: {
      riskId,
      status: {
        in: [PEMANTAUAN_STATUS.FINAL, PEMANTAUAN_STATUS.SUPERSEDED],
      },
    },
    orderBy: [{ tahun: "desc" }, { triwulan: "desc" }, { revision: "desc" }],
    select: { id: true, tahun: true, triwulan: true, status: true },
  })) as BlockingMonitoring | null;

  if (!blocking) return;

  throw new DomainError(
    "Residual risiko ini sudah difinalisasi melalui Pemantauan. Perubahan residual harus melalui revisi pemantauan.",
    409,
    {
      code: FINAL_RESIDUAL_PROTECTED,
      monitoringId: blocking.id,
      tahun: blocking.tahun,
      triwulan: blocking.triwulan,
      status: blocking.status,
    }
  );
}

const MONITORING_START_KEY = "monitoring_start_periode";

function parsePeriode(value: string): Periode | null {
  try {
    const parsed = JSON.parse(value) as { tahun?: number; triwulan?: number };
    if (isValidPeriode(parsed.tahun, parsed.triwulan)) {
      return { tahun: parsed.tahun as number, triwulan: parsed.triwulan as number };
    }
  } catch {
    // ignore invalid stored value
  }
  return null;
}

/**
 * Periode aktivasi harus stabil. Env menjadi sumber utama; jika tidak diisi,
 * periode pertama disimpan ke database sehingga tidak bergeser pada triwulan
 * berikutnya.
 */
export async function getMonitoringStartPeriode(
  db: AnyDb = prisma as unknown as AnyDb
): Promise<Periode> {
  const envTahun = Number(process.env.PEMANTAUAN_MULAI_TAHUN);
  const envTriwulan = Number(process.env.PEMANTAUAN_MULAI_TRIWULAN);
  if (isValidPeriode(envTahun, envTriwulan)) {
    return { tahun: envTahun, triwulan: envTriwulan };
  }

  const existing = await db.appSetting.findUnique({
    where: { key: MONITORING_START_KEY },
  });
  if (existing) {
    const parsed = parsePeriode(existing.value);
    if (parsed) return parsed;
  }

  const fallback = monitoringStartPeriode(new Date()) ?? currentPeriode();
  await db.appSetting.upsert({
    where: { key: MONITORING_START_KEY },
    create: { key: MONITORING_START_KEY, value: JSON.stringify(fallback) },
    update: {},
  });
  const stored = await db.appSetting.findUnique({
    where: { key: MONITORING_START_KEY },
  });
  return (stored ? parsePeriode(stored.value) : null) ?? fallback;
}

/** Snapshot konfigurasi matriks saat finalisasi, untuk tampilan historis. */
export async function buildMatrixSnapshot(
  db: AnyDb = prisma as unknown as AnyDb
) {
  const [
    matriks,
    levelKemungkinan,
    levelDampak,
    levelRisiko,
    seleraKategori,
    seleraGlobal,
  ] = await Promise.all([
    db.matriksAnalisisRisiko.findMany({
      orderBy: [{ levelKemungkinanId: "asc" }, { levelDampakId: "asc" }],
    }),
    db.levelKemungkinan.findMany({ orderBy: { skala: "asc" } }),
    db.levelDampak.findMany({ orderBy: { skala: "asc" } }),
    db.levelRisiko.findMany({ orderBy: { id: "asc" } }),
    db.seleraRisiko.findMany({}),
    db.seleraRisikoGlobal.findMany({ orderBy: { id: "desc" } }),
  ]);

  return {
    takenAt: new Date().toISOString(),
    matriks,
    levelKemungkinan,
    levelDampak,
    levelRisiko,
    seleraKategori,
    seleraGlobal,
  };
}
