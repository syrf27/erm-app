/**
 * Matriks Analisis Risiko 5x5 BPS.
 * Sumber: SE Sestama BPS Nomor 2 Tahun 2026, Bagian 5.2.6, hlm. 51–52.
 * Nilai adalah lookup matriks; jangan menggantinya dengan perkalian.
 */
export const BPS_RISK_MATRIX = [
  [1, 3, 5, 8, 20],
  [2, 7, 11, 13, 21],
  [4, 10, 14, 17, 22],
  [6, 12, 16, 19, 24],
  [9, 15, 18, 23, 25],
] as const;

export type RiskLevel = "Sangat Rendah" | "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";

export function bpsRiskScore(likelihood: number, impact: number) {
  if (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) return 0;
  return BPS_RISK_MATRIX[likelihood - 1][impact - 1];
}

export function bpsRiskLevel(score: number): RiskLevel | "Belum dinilai" {
  if (!score) return "Belum dinilai";
  if (score <= 5) return "Sangat Rendah";
  if (score <= 11) return "Rendah";
  if (score <= 15) return "Sedang";
  if (score <= 19) return "Tinggi";
  return "Sangat Tinggi";
}

export function bpsRiskColor(score: number) {
  if (score <= 5) return "blue";
  if (score <= 11) return "green";
  if (score <= 15) return "yellow";
  if (score <= 19) return "orange";
  return "red";
}

export const BPS_MAX_RISK_TOLERANCE = 11;
