/**
 * Sumber tunggal penilaian risiko.
 *
 * Besaran, level, dan warna HANYA berasal dari pasangan matriks
 * (kemungkinan, dampak). Tidak ada fallback perkalian skala: pasangan yang
 * tidak tersedia berarti "Belum dapat dihitung", bukan nol.
 */

export const BELUM_DAPAT_DIHITUNG = "Belum dapat dihitung";
export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export type AssessmentStatus = "OK" | "INCOMPLETE";
export type ToleranceStatus =
  | "DI_BAWAH"
  | "BELUM_DI_BAWAH"
  | "TIDAK_DAPAT_DINILAI";

export interface MatrixEntry {
  levelKemungkinanId: number;
  levelDampakId: number;
  besaran: number;
  levelRisikoId: number;
  levelRisiko?: { nama?: string | null; warna?: string | null } | null;
}

export interface Assessment {
  status: AssessmentStatus;
  besaran: number | null;
  levelRisikoId: number | null;
  level: string | null;
  warna: string | null;
  label: string;
}

const INCOMPLETE: Assessment = {
  status: "INCOMPLETE",
  besaran: null,
  levelRisikoId: null,
  level: null,
  warna: null,
  label: BELUM_DAPAT_DIHITUNG,
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function matrixKey(kemungkinanId: number, dampakId: number): string {
  return `${kemungkinanId}:${dampakId}`;
}

export function findMatrixEntry(
  entries: readonly MatrixEntry[],
  kemungkinanId?: number | null,
  dampakId?: number | null
): MatrixEntry | null {
  if (!isPositiveInt(kemungkinanId) || !isPositiveInt(dampakId)) return null;
  return (
    entries.find(
      (entry) =>
        entry.levelKemungkinanId === kemungkinanId &&
        entry.levelDampakId === dampakId
    ) ?? null
  );
}

export function assessRisk(
  entries: readonly MatrixEntry[],
  kemungkinanId?: number | null,
  dampakId?: number | null
): Assessment {
  const entry = findMatrixEntry(entries, kemungkinanId, dampakId);
  if (!entry) return { ...INCOMPLETE };
  if (
    typeof entry.besaran !== "number" ||
    !Number.isFinite(entry.besaran) ||
    entry.besaran <= 0 ||
    !isPositiveInt(entry.levelRisikoId)
  ) {
    return { ...INCOMPLETE };
  }

  return {
    status: "OK",
    besaran: entry.besaran,
    levelRisikoId: entry.levelRisikoId,
    level: entry.levelRisiko?.nama ?? null,
    warna: entry.levelRisiko?.warna ?? null,
    label: String(entry.besaran),
  };
}

/**
 * Aturan batas selera:
 * residual < selera  -> sudah di bawah selera
 * residual >= selera -> belum di bawah selera
 * data tidak lengkap -> belum dapat dinilai (bukan nol)
 */
export function compareResidualToTolerance(
  residual?: number | null,
  selera?: number | null
): ToleranceStatus {
  if (
    typeof residual !== "number" ||
    !Number.isFinite(residual) ||
    typeof selera !== "number" ||
    !Number.isFinite(selera)
  ) {
    return "TIDAK_DAPAT_DINILAI";
  }
  return residual < selera ? "DI_BAWAH" : "BELUM_DI_BAWAH";
}

export function requiresFollowUp(
  responRisiko: string | null | undefined,
  residual: number | null | undefined,
  selera: number | null | undefined
): boolean {
  return (
    String(responRisiko ?? "").trim().toLowerCase() === "mengurangi" &&
    compareResidualToTolerance(residual, selera) === "BELUM_DI_BAWAH"
  );
}

/* ------------------------------------------------------------------ */
/* Periode triwulan (Asia/Jakarta)                                     */
/* ------------------------------------------------------------------ */

export interface Periode {
  tahun: number;
  triwulan: number;
}

export function triwulanFromMonth(month1Based: number): number {
  if (month1Based < 1 || month1Based > 12) {
    throw new Error("Bulan harus 1-12");
  }
  return Math.ceil(month1Based / 3);
}

export function jakartaParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(formatted.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function currentPeriode(date: Date = new Date()): Periode {
  const { year, month } = jakartaParts(date);
  return { tahun: year, triwulan: triwulanFromMonth(month) };
}

export function isValidPeriode(tahun: unknown, triwulan: unknown): boolean {
  return (
    typeof tahun === "number" &&
    Number.isInteger(tahun) &&
    tahun >= 2020 &&
    tahun <= 2100 &&
    typeof triwulan === "number" &&
    Number.isInteger(triwulan) &&
    triwulan >= 1 &&
    triwulan <= 4
  );
}

export function nextPeriode({ tahun, triwulan }: Periode): Periode {
  if (!isValidPeriode(tahun, triwulan)) {
    throw new Error("Periode tidak valid");
  }
  return triwulan === 4
    ? { tahun: tahun + 1, triwulan: 1 }
    : { tahun, triwulan: triwulan + 1 };
}

export function periodeKey(tahun: number, triwulan: number): number {
  return tahun * 10 + triwulan;
}

export function formatPeriode(tahun: number, triwulan: number): string {
  return `TW ${["I", "II", "III", "IV"][triwulan - 1] ?? triwulan} ${tahun}`;
}

/** Batas periode dalam UTC; tengah malam waktu Asia/Jakarta. */
export function quarterBounds(
  tahun: number,
  triwulan: number
): { start: Date; endExclusive: Date } {
  if (!isValidPeriode(tahun, triwulan)) {
    throw new Error("Periode tidak valid");
  }
  const startMonth = (triwulan - 1) * 3;
  const offsetMs = 7 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(tahun, startMonth, 1) - offsetMs);
  const endExclusive = new Date(Date.UTC(tahun, startMonth + 3, 1) - offsetMs);
  return { start, endExclusive };
}

/**
 * Periode mulai penerapan. Default: triwulan saat fitur diaktifkan.
 * Dapat dikunci melalui env agar rollout tidak membangkitkan kewajiban
 * historis.
 */
export function monitoringStartPeriode(date: Date = new Date()): Periode {
  const tahun = Number(process.env.PEMANTAUAN_MULAI_TAHUN);
  const triwulan = Number(process.env.PEMANTAUAN_MULAI_TRIWULAN);
  if (
    Number.isInteger(tahun) &&
    tahun >= 2020 &&
    Number.isInteger(triwulan) &&
    triwulan >= 1 &&
    triwulan <= 4
  ) {
    return { tahun, triwulan };
  }
  return currentPeriode(date);
}

export function isPeriodeBefore(
  a: Periode,
  b: Periode
): boolean {
  return periodeKey(a.tahun, a.triwulan) < periodeKey(b.tahun, b.triwulan);
}

/* ------------------------------------------------------------------ */
/* Resolver server (database adalah sumber resmi)                      */
/* ------------------------------------------------------------------ */

interface MatrixDelegate {
  findFirst(args: {
    where: { levelKemungkinanId: number; levelDampakId: number };
    include: { levelRisiko: { select: { nama: true; warna: true } } };
  }): Promise<MatrixEntry | null>;
}

interface SeleraKategoriDelegate {
  findFirst(args: {
    where: { kategoriRisikoId: number };
    orderBy: { id: "desc" };
  }): Promise<{ besaranRisikoMinimum: number } | null>;
}

interface SeleraGlobalDelegate {
  findFirst(args: {
    orderBy: { id: "desc" };
  }): Promise<{ nilai: number } | null>;
}

export interface AssessmentDb {
  matriksAnalisisRisiko: MatrixDelegate;
  seleraRisiko: SeleraKategoriDelegate;
  seleraRisikoGlobal: SeleraGlobalDelegate;
}

export async function resolveAssessmentFromDb(
  db: AssessmentDb,
  kemungkinanId?: number | null,
  dampakId?: number | null
): Promise<Assessment> {
  if (!isPositiveInt(kemungkinanId) || !isPositiveInt(dampakId)) {
    return { ...INCOMPLETE };
  }
  const entry = await db.matriksAnalisisRisiko.findFirst({
    where: {
      levelKemungkinanId: kemungkinanId,
      levelDampakId: dampakId,
    },
    include: { levelRisiko: { select: { nama: true, warna: true } } },
  });
  if (!entry) return { ...INCOMPLETE };
  return assessRisk([entry], kemungkinanId, dampakId);
}

export async function resolveSeleraFromDb(
  db: Pick<AssessmentDb, "seleraRisiko" | "seleraRisikoGlobal">,
  kategoriRisikoId?: number | null
): Promise<number | null> {
  if (isPositiveInt(kategoriRisikoId)) {
    const specific = await db.seleraRisiko.findFirst({
      where: { kategoriRisikoId },
      orderBy: { id: "desc" },
    });
    if (specific) return specific.besaranRisikoMinimum;
  }
  const global = await db.seleraRisikoGlobal.findFirst({
    orderBy: { id: "desc" },
  });
  return global?.nilai ?? null;
}
