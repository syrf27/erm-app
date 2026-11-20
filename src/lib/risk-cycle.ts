/** Status siklus dan label tampilan untuk pemantauan triwulanan. */

export const PEMANTAUAN_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  RETURNED: "RETURNED",
  FINAL: "FINAL",
  SUPERSEDED: "SUPERSEDED",
} as const;

export type PemantauanStatus =
  (typeof PEMANTAUAN_STATUS)[keyof typeof PEMANTAUAN_STATUS];

export const PEMANTAUAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  RETURNED: "Dikembalikan",
  FINAL: "Final",
  SUPERSEDED: "Digantikan",
  BELUM_DIISI: "Belum Diisi",
};

export const RISK_CYCLE = {
  ACTIVE: "ACTIVE",
  FOLLOW_UP_DRAFT: "FOLLOW_UP_DRAFT",
  FOLLOW_UP_SUBMITTED: "FOLLOW_UP_SUBMITTED",
  FOLLOW_UP_CANCELLED: "FOLLOW_UP_CANCELLED",
  CONTINUED: "CONTINUED",
} as const;

export type RiskCycle = (typeof RISK_CYCLE)[keyof typeof RISK_CYCLE];

export const RISK_CYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  FOLLOW_UP_DRAFT: "Draf Lanjutan",
  FOLLOW_UP_SUBMITTED: "Lanjutan Diajukan",
  FOLLOW_UP_CANCELLED: "Dibatalkan",
  CONTINUED: "Dilanjutkan",
};

export const KEWAJIBAN_STATUS = {
  WAJIB: "WAJIB",
  MENUNGGU_VALIDASI: "MENUNGGU_VALIDASI",
  SELESAI: "SELESAI",
  DIBATALKAN: "DIBATALKAN",
} as const;

export type KewajibanStatus =
  (typeof KEWAJIBAN_STATUS)[keyof typeof KEWAJIBAN_STATUS];

export const KEWAJIBAN_STATUS_LABEL: Record<string, string> = {
  WAJIB: "Wajib dilengkapi",
  MENUNGGU_VALIDASI: "Menunggu validasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const OPEN_OBLIGATION_STATUSES = [
  KEWAJIBAN_STATUS.WAJIB,
  KEWAJIBAN_STATUS.MENUNGGU_VALIDASI,
];

export const CLOSED_OBLIGATION_STATUSES = [
  KEWAJIBAN_STATUS.SELESAI,
  KEWAJIBAN_STATUS.DIBATALKAN,
];

export const PELAKSANAAN = {
  BELUM: "belum",
  SEBAGIAN: "sebagian",
  SELESAI: "selesai",
} as const;

export const PELAKSANAAN_LABEL: Record<string, string> = {
  belum: "Belum dilaksanakan",
  sebagian: "Sebagian dilaksanakan",
  selesai: "Selesai",
};

export const FOLLOW_UP_ACTIVE_STATUSES = new Set<string>([
  RISK_CYCLE.FOLLOW_UP_DRAFT,
  RISK_CYCLE.FOLLOW_UP_SUBMITTED,
]);

export const DEFAULT_MONITORING_ROLES = ["admin"];

export function isAdminRoleName(roleName?: string | null): boolean {
  return String(roleName ?? "").trim().toLowerCase() === "admin";
}
