export const resourceMap: Record<string, string> = {
  "sasaran": "sasaran",
  "proses-bisnis": "prosesBisnis",
  "pemangku-kepentingan": "pemangkuKepentingan",
  "peraturan-perundangan": "peraturanPerundangan",
  "jenis-risiko": "jenisRisiko",
  "sumber-risiko": "sumberRisiko",
  "kategori-risiko": "kategoriRisiko",
  "area-dampak": "areaDampak",
  "level-kemungkinan": "levelKemungkinan",
  "level-dampak": "levelDampak",
  "level-risiko": "levelRisiko",
  "opsi-penanganan": "opsiPenanganan",
  "kriteria-kemungkinan": "kriteriaKemungkinan",
  "kriteria-dampak": "kriteriaDampak",
  "selera-risiko": "seleraRisiko",
  "identifikasi-risiko": "identifikasiRisiko",
  "analisis-risiko": "analisisRisiko",
  "evaluasi-risiko": "evaluasiRisiko",
  "rencana-penanganan": "rencanaPenanganan",
  "kri": "kri",
  "matriks-analisis-risiko": "matriksAnalisisRisiko",
  "pelaporan-risiko": "rencanaPenanganan",
};

export const includeMap: Record<string, any> = {
  "matriks-analisis-risiko": {
    levelKemungkinan: { select: { id: true, skala: true } },
    levelDampak: { select: { id: true, skala: true } },
    levelRisiko: { select: { id: true, nama: true, warna: true } },
  },
  "kriteria-kemungkinan": {
    kategoriRisiko: { select: { id: true, nama: true } },
    levelKemungkinan: { select: { id: true, nama: true } },
  },
  "selera-risiko": {
    kategoriRisiko: { select: { id: true, nama: true } },
  },
  "identifikasi-risiko": {
    jenisRisiko: { select: { id: true, nama: true } },
    sumberRisiko: { select: { id: true, nama: true } },
    kategoriRisiko: { select: { id: true, nama: true } },
    areaDampak: { select: { id: true, nama: true } },
  },
  "analisis-risiko": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    levelKemungkinan: { select: { id: true, nama: true, skala: true } },
    levelDampak: { select: { id: true, nama: true } },
    levelRisiko: { select: { id: true, nama: true } },
  },
  "rencana-penanganan": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    residualLevelKemungkinan: { select: { id: true, nama: true, skala: true } },
    residualLevelDampak: { select: { id: true, nama: true, skala: true } },
  },
  "pelaporan-risiko": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    residualLevelKemungkinan: { select: { id: true, nama: true, skala: true } },
    residualLevelDampak: { select: { id: true, nama: true, skala: true } },
  },
  kri: {
    identifikasiRisiko: { select: { id: true, risiko: true } },
  },
};
