export const resourceMap: Record<string, string> = {
  sasaran: "sasaran",
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
  "matriks-risiko": "seleraRisiko",
  "selera-risiko": "seleraRisikoGlobal",
  "identifikasi-risiko": "identifikasiRisiko",
  "unit-kerja": "unitKerja",
  kegiatan: "kegiatan",
  "analisis-risiko": "analisisRisiko",
  "evaluasi-risiko": "evaluasiRisiko",
  "rencana-penanganan": "rencanaPenanganan",
  kri: "kri",
  "matriks-analisis-risiko": "matriksAnalisisRisiko",
  "pelaporan-risiko": "rencanaPenanganan",
  faq: "faq",
  users: "user",
  roles: "role",
  permissions: "permission",
  teams: "team",
  "dokumen-pendukung": "dokumenPendukung",
  repositori: "repositori",
};

export const includeMap: Record<string, any> = {
  users: {
    role: {
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    },
    permissions: {
      include: {
        permission: true,
      },
    },
    teams: {
      include: {
        team: true,
      },
    },
  },
  roles: {
    permissions: {
      include: {
        permission: true,
      },
    },
  },
  "matriks-analisis-risiko": {
    levelKemungkinan: { select: { id: true, skala: true } },
    levelDampak: { select: { id: true, skala: true } },
    levelRisiko: { select: { id: true, nama: true, warna: true } },
  },
  "kriteria-kemungkinan": {
    kategoriRisiko: { select: { id: true, nama: true } },
    levelKemungkinan: { select: { id: true, nama: true } },
  },
  "matriks-risiko": {
    kategoriRisiko: { select: { id: true, nama: true } },
  },
  "identifikasi-risiko": {
    sasaran: { select: { id: true, nama: true } },
    kegiatan: {
      select: { id: true, nama: true, sasaranId: true, unitKerjaId: true },
    },
    prosesBisnis: { select: { id: true, nama: true, kegiatanId: true } },
    jenisRisiko: { select: { id: true, nama: true } },
    sumberRisiko: { select: { id: true, nama: true } },
    kategoriRisiko: { select: { id: true, nama: true } },
    areaDampak: { select: { id: true, nama: true } },
    team: { select: { id: true, nama: true } },
  },
  "analisis-risiko": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    levelKemungkinan: { select: { id: true, nama: true, skala: true } },
    levelDampak: { select: { id: true, nama: true, skala: true } },
    levelRisiko: { select: { id: true, nama: true } },
  },
  "rencana-penanganan": {
    identifikasiRisiko: {
      select: {
        id: true,
        risiko: true,
        teamId: true,
        team: { select: { id: true, nama: true } },
      },
    },
    residualLevelKemungkinan: { select: { id: true, nama: true, skala: true } },
    residualLevelDampak: { select: { id: true, nama: true, skala: true } },
    dokumenPendukungs: true,
  },
  "pelaporan-risiko": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    residualLevelKemungkinan: { select: { id: true, nama: true, skala: true } },
    residualLevelDampak: { select: { id: true, nama: true, skala: true } },
  },
  "evaluasi-risiko": {
    identifikasiRisiko: { select: { id: true, risiko: true } },
    residualLevelKemungkinan: { select: { id: true, nama: true, skala: true } },
    residualLevelDampak: { select: { id: true, nama: true, skala: true } },
    residualLevelRisiko: { select: { id: true, nama: true } },
  },
  kri: {
    identifikasiRisiko: { select: { id: true, risiko: true } },
  },
};
