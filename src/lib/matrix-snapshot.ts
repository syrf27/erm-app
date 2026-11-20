import { createHash } from "node:crypto";

export interface MatrixSnapshotConfig {
  matriks?: unknown[];
  levelKemungkinan?: unknown[];
  levelDampak?: unknown[];
  levelRisiko?: unknown[];
  seleraKategori?: unknown[];
  seleraGlobal?: unknown[];
  takenAt?: string;
}

/**
 * Hash isi konfigurasi, tanpa takenAt. Dua snapshot dengan waktu berbeda tetapi
 * isi identik dianggap konfigurasi yang sama.
 */
export function matrixConfigHash(config: MatrixSnapshotConfig): string {
  const sortById = (items?: unknown[]) =>
    [...(items ?? [])].sort((a, b) => {
      const left = (a as { id?: number })?.id ?? 0;
      const right = (b as { id?: number })?.id ?? 0;
      return left - right;
    });
  return createHash("sha256")
    .update(
      JSON.stringify({
        matriks: sortById(config.matriks),
        levelKemungkinan: sortById(config.levelKemungkinan),
        levelDampak: sortById(config.levelDampak),
        levelRisiko: sortById(config.levelRisiko),
        seleraKategori: sortById(config.seleraKategori),
        seleraGlobal: sortById(config.seleraGlobal),
      })
    )
    .digest("hex");
}
