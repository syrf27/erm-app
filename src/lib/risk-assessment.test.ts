import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRisk,
  compareResidualToTolerance,
  currentPeriode,
  formatPeriode,
  nextPeriode,
  quarterBounds,
  requiresFollowUp,
  type MatrixEntry,
} from "./risk-assessment";
import { matrixConfigHash } from "./matrix-snapshot";

// Fixture mengikuti matriks aplikasi (diverifikasi dari database Supabase).
const matrix: MatrixEntry[] = [
  {
    levelKemungkinanId: 2, // Kadang Terjadi
    levelDampakId: 12, // Moderat
    besaran: 14,
    levelRisikoId: 3,
    levelRisiko: { nama: "Sedang", warna: "Kuning" },
  },
  {
    levelKemungkinanId: 2,
    levelDampakId: 13, // Signifikan
    besaran: 17,
    levelRisikoId: 4,
    levelRisiko: { nama: "Tinggi", warna: "Jingga" },
  },
  {
    levelKemungkinanId: 1, // Jarang Terjadi
    levelDampakId: 12,
    besaran: 11,
    levelRisikoId: 2,
    levelRisiko: { nama: "Rendah", warna: "Hijau" },
  },
];

test("lookup matriks menggantikan perkalian skala", () => {
  assert.equal(assessRisk(matrix, 2, 12).besaran, 14); // bukan 6
  assert.equal(assessRisk(matrix, 2, 13).besaran, 17); // bukan 8
  assert.equal(assessRisk(matrix, 1, 12).besaran, 11); // bukan 5
});

test("level dan warna berasal dari relasi matriks", () => {
  const result = assessRisk(matrix, 2, 13);
  assert.equal(result.status, "OK");
  assert.equal(result.level, "Tinggi");
  assert.equal(result.warna, "Jingga");
  assert.equal(result.levelRisikoId, 4);

  const greenEleven = assessRisk(matrix, 1, 12);
  assert.equal(greenEleven.besaran, 11);
  assert.equal(greenEleven.level, "Rendah");
  assert.equal(greenEleven.warna, "Hijau");
});

test("pasangan tidak ditemukan berarti belum dapat dihitung, bukan nol", () => {
  const missing = assessRisk(matrix, 5, 15);
  assert.equal(missing.status, "INCOMPLETE");
  assert.equal(missing.besaran, null);
  assert.equal(missing.label, "Belum dapat dihitung");
  assert.notEqual(missing.besaran, 0);

  const incomplete = assessRisk(matrix, 2, null);
  assert.equal(incomplete.status, "INCOMPLETE");
  assert.equal(incomplete.besaran, null);
});

test("batas selera: residual < selera di bawah, >= belum di bawah", () => {
  assert.equal(compareResidualToTolerance(10, 11), "DI_BAWAH");
  assert.equal(compareResidualToTolerance(11, 11), "BELUM_DI_BAWAH");
  assert.equal(compareResidualToTolerance(12, 11), "BELUM_DI_BAWAH");
  assert.equal(compareResidualToTolerance(null, 11), "TIDAK_DAPAT_DINILAI");
  assert.equal(compareResidualToTolerance(11, null), "TIDAK_DAPAT_DINILAI");
});

test("kewajiban hanya untuk respons mengurangi dan residual >= selera", () => {
  assert.equal(requiresFollowUp("mengurangi", 11, 11), true);
  assert.equal(requiresFollowUp("mengurangi", 14, 11), true);
  assert.equal(requiresFollowUp("mengurangi", 10, 11), false);
  assert.equal(requiresFollowUp("menerima", 20, 11), false);
  assert.equal(requiresFollowUp("mengurangi", null, 11), false);
});

test("batas triwulan memakai waktu Asia/Jakarta", () => {
  const q1 = quarterBounds(2026, 1);
  assert.equal(q1.start.toISOString(), "2025-12-31T17:00:00.000Z");
  assert.equal(q1.endExclusive.toISOString(), "2026-03-31T17:00:00.000Z");
});

test("pergantian triwulan dan tahun", () => {
  assert.deepEqual(nextPeriode({ tahun: 2026, triwulan: 4 }), {
    tahun: 2027,
    triwulan: 1,
  });
  assert.deepEqual(nextPeriode({ tahun: 2026, triwulan: 1 }), {
    tahun: 2026,
    triwulan: 2,
  });
  assert.equal(formatPeriode(2026, 4), "TW IV 2026");
});

test("hash konfigurasi mengabaikan takenAt tetapi mendeteksi isi berbeda", () => {
  const base = {
    matriks: [{ id: 1, besaran: 14 }],
    levelKemungkinan: [{ id: 1, nama: "Kadang" }],
    levelDampak: [{ id: 2, nama: "Moderat" }],
    levelRisiko: [{ id: 3, nama: "Sedang" }],
    seleraGlobal: [{ id: 1, nilai: 11 }],
  };
  const first = matrixConfigHash({ ...base, takenAt: "2026-01-01T00:00:00Z" });
  const same = matrixConfigHash({ ...base, takenAt: "2026-06-01T00:00:00Z" });
  const changed = matrixConfigHash({
    ...base,
    matriks: [{ id: 1, besaran: 15 }],
  });
  assert.equal(first, same);
  assert.notEqual(first, changed);
});

test("periode saat ini mengikuti zona Asia/Jakarta", () => {
  // 1 April 2026 00:00 WIB
  const periode = currentPeriode(new Date("2026-03-31T17:00:00.000Z"));
  assert.deepEqual(periode, { tahun: 2026, triwulan: 2 });
});
