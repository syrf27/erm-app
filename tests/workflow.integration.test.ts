import assert from "node:assert/strict";
import test, { after, before } from "node:test";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl.includes("_test")) {
  throw new Error(
    "Integration test hanya boleh dijalankan pada database test (nama mengandung _test)."
  );
}

let prisma: any;
let finalizeMonitoring: any;
let approveFollowUp: any;
let cancelObligationThroughCorrection: any;
let getMonitoringStartPeriode: any;
let buildHistoricalReport: any;
let assertResidualMutable: any;
let touchesResidual: any;
let DomainError: any;
let requiresFollowUp: any;
let PEMANTAUAN_STATUS: any;
let KEWAJIBAN_STATUS: any;
let RISK_CYCLE: any;

const ref: any = {};

before(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ finalizeMonitoring, approveFollowUp, cancelObligationThroughCorrection } =
    await import("@/lib/pemantauan-service"));
  ({ buildHistoricalReport } = await import("@/lib/pemantauan-report"));
  ({ assertResidualMutable, touchesResidual, getMonitoringStartPeriode } =
    await import("@/lib/pemantauan-integrity"));
  ({ DomainError } = await import("@/lib/domain-error"));
  ({ requiresFollowUp } = await import("@/lib/risk-assessment"));
  ({
    PEMANTAUAN_STATUS,
    KEWAJIBAN_STATUS,
    RISK_CYCLE,
  } = await import("@/lib/risk-cycle"));

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "IdentifikasiRisiko", "PemantauanRisiko", "PemantauanDokumen",
      "KewajibanTindakLanjut", "AnalisisRisiko", "EvaluasiRisiko",
      "RencanaPenanganan", "DokumenPendukung", "ReminderLog",
      "Notification", "FcmToken", "user_teams", "User", "Role",
      "RolePermission", "UserPermission", "Permission", "Team",
      "MatriksAnalisisRisiko", "LevelKemungkinan", "LevelDampak",
      "LevelRisiko", "SeleraRisiko", "SeleraRisikoGlobal",
      "KategoriRisiko", "JenisRisiko", "SumberRisiko", "AreaDampak",
      "Kegiatan", "Sasaran", "UnitKerja", "ProsesBisnis", "AppSetting",
      "Faq", "Repositori"
    RESTART IDENTITY CASCADE
  `);

  const levelRisikoNames = [
    ["Sangat Rendah", "Biru"],
    ["Rendah", "Hijau"],
    ["Sedang", "Kuning"],
    ["Tinggi", "Jingga"],
    ["Sangat Tinggi", "Merah"],
  ];
  ref.levelRisiko = [];
  for (const [nama, warna] of levelRisikoNames) {
    ref.levelRisiko.push(
      await prisma.levelRisiko.create({ data: { nama, warna } })
    );
  }

  ref.levelK = [];
  for (const [nama, skala] of [
    ["Hampir Tidak Terjadi", 1],
    ["Jarang Terjadi", 2],
    ["Kadang Terjadi", 3],
    ["Sering Terjadi", 4],
    ["Hampir Pasti Terjadi", 5],
  ] as const) {
    ref.levelK.push(
      await prisma.levelKemungkinan.create({ data: { nama, skala } })
    );
  }
  ref.levelD = [];
  for (const [nama, skala] of [
    ["Tidak Signifikan", 1],
    ["Minor", 2],
    ["Moderat", 3],
    ["Signifikan", 4],
    ["Sangat Signifikan", 5],
  ] as const) {
    ref.levelD.push(await prisma.levelDampak.create({ data: { nama, skala } }));
  }

  const overrides: Record<string, number> = {
    "1:1": 1,
    "2:2": 4,
    "2:3": 11,
    "3:2": 8,
    "3:3": 14,
    "3:4": 17,
    "2:4": 13,
    "4:4": 19,
  };
  ref.matrix = [];
  for (const lk of ref.levelK) {
    for (const ld of ref.levelD) {
      const besaran = overrides[`${lk.skala}:${ld.skala}`] ?? lk.skala + ld.skala;
      const level =
        besaran <= 5
          ? ref.levelRisiko[0]
          : besaran <= 11
          ? ref.levelRisiko[1]
          : besaran <= 15
          ? ref.levelRisiko[2]
          : besaran <= 19
          ? ref.levelRisiko[3]
          : ref.levelRisiko[4];
      ref.matrix.push(
        await prisma.matriksAnalisisRisiko.create({
          data: {
            levelKemungkinanId: lk.id,
            levelDampakId: ld.id,
            besaran,
            levelRisikoId: level.id,
          },
        })
      );
    }
  }
  ref.matrixBySkala = new Map(
    ref.matrix.map((item: any) => [
      `${ref.levelK.find((l: any) => l.id === item.levelKemungkinanId)?.skala}:${ref.levelD.find((l: any) => l.id === item.levelDampakId)?.skala}`,
      item,
    ])
  );

  await prisma.seleraRisikoGlobal.create({ data: { nilai: 11 } });
  ref.jenis = await prisma.jenisRisiko.create({ data: { nama: "Strategis" } });
  ref.sumber = await prisma.sumberRisiko.create({ data: { nama: "Internal" } });
  ref.kategori = await prisma.kategoriRisiko.create({
    data: { nama: "Operasional" },
  });
  ref.area = await prisma.areaDampak.create({
    data: { kode: "D01", nama: "Layanan" },
  });
  ref.teamA = await prisma.team.create({
    data: { nama: "Tim A Test", kode: "TEAM_A_TEST", tahun: 2026 },
  });
  ref.teamB = await prisma.team.create({
    data: { nama: "Tim B Test", kode: "TEAM_B_TEST", tahun: 2026 },
  });
  const adminRole = await prisma.role.create({ data: { name: "admin" } });
  ref.ketuaRole = await prisma.role.create({ data: { name: "ketua_tim" } });
  ref.admin = await prisma.user.create({
    data: {
      email: "admin-test@example.com",
      name: "Admin Test",
      roleId: adminRole.id,
    },
  });
  ref.userA = await prisma.user.create({
    data: {
      email: "tim-a-test@example.com",
      name: "Tim A",
      roleId: ref.ketuaRole.id,
    },
  });
  ref.userB = await prisma.user.create({
    data: {
      email: "tim-b-test@example.com",
      name: "Tim B",
      roleId: ref.ketuaRole.id,
    },
  });
  await prisma.userTeam.create({
    data: { userId: ref.userA.id, teamId: ref.teamA.id },
  });
  await prisma.userTeam.create({
    data: { userId: ref.userB.id, teamId: ref.teamB.id },
  });
});

after(async () => {
  await prisma?.$disconnect();
});

function pairBySkala(k: number, d: number) {
  return ref.matrixBySkala.get(`${k}:${d}`);
}

async function createRisk(
  label: string,
  options: {
    teamId?: number;
    kSkala?: number;
    dSkala?: number;
    respon?: string;
  } = {}
) {
  const kSkala = options.kSkala ?? 3;
  const dSkala = options.dSkala ?? 3;
  const matrix = pairBySkala(kSkala, dSkala);
  const lk = ref.levelK.find((item: any) => item.skala === kSkala);
  const ld = ref.levelD.find((item: any) => item.skala === dSkala);
  const target = pairBySkala(1, 1);
  return prisma.identifikasiRisiko.create({
    data: {
      risiko: `__TEST__ ${label}`,
      jenisRisikoId: ref.jenis.id,
      sumberRisikoId: ref.sumber.id,
      kategoriRisikoId: ref.kategori.id,
      areaDampakId: ref.area.id,
      teamId: options.teamId ?? ref.teamA.id,
      tahun: 2026,
      analisisRisiko: {
        create: {
          levelKemungkinanId: lk.id,
          levelDampakId: ld.id,
          levelRisikoId: matrix.levelRisikoId,
        },
      },
      evaluasiRisiko: {
        create: {
          responRisiko: options.respon ?? "mengurangi",
          residualLevelKemungkinanId: lk.id,
          residualLevelDampakId: ld.id,
          residualLevelRisikoId: matrix.levelRisikoId,
        },
      },
      rencanaPenanganan: {
        create: {
          rencanaTidakPenanganan: "RTP TERKINI (tidak boleh dipakai)",
          targetOutput: "Output target",
          targetWaktu: "31/12/2026",
          penanggungJawab: "Tim A",
          targetResidualLevelKemungkinanId: ref.levelK[0].id,
          targetResidualLevelDampakId: ref.levelD[0].id,
        },
      },
    },
    include: {
      analisisRisiko: true,
      evaluasiRisiko: true,
      rencanaPenanganan: true,
    },
  });
}

async function createSubmittedMonitoring(
  risk: any,
  options: {
    tahun?: number;
    triwulan?: number;
    kSkala?: number;
    dSkala?: number;
    statusPelaksanaan?: string;
    respon?: string;
    rtpSnapshot?: Record<string, unknown> | null;
    realisasiOutput?: string;
  } = {}
) {
  const kSkala = options.kSkala ?? 3;
  const dSkala = options.dSkala ?? 3;
  const lk = ref.levelK.find((item: any) => item.skala === kSkala);
  const ld = ref.levelD.find((item: any) => item.skala === dSkala);
  return prisma.pemantauanRisiko.create({
    data: {
      riskId: risk.id,
      tahun: options.tahun ?? 2026,
      triwulan: options.triwulan ?? 4,
      status: PEMANTAUAN_STATUS.SUBMITTED,
      statusPelaksanaan: options.statusPelaksanaan ?? "selesai",
      uraianPelaksanaan: "Uraian pelaksanaan final",
      realisasiOutput: options.realisasiOutput ?? "Realisasi final periode",
      catatanEfektivitas: "Belum mencapai selera",
      efektivitas: "cukup_efektif",
      levelKemungkinanId: lk.id,
      levelDampakId: ld.id,
      responRisiko: options.respon ?? "mengurangi",
      rtpSnapshot: (options.rtpSnapshot ?? {
        uraian: "RTP SNAPSHOT yang dipantau",
        targetOutput: "Output target",
        targetWaktu: "31/12/2026",
        penanggungJawab: "Tim A",
      }) as any,
      submittedBy: "test",
      submittedAt: new Date(),
      dokumens: {
        create: [{ title: "Bukti final", url: "https://example.com/bukti.pdf" }],
      },
    },
  });
}

const actor = { email: "admin-test@example.com", name: "Admin Test" };

test("1. finalisasi Mengurangi >= selera membuat tepat satu draf + kewajiban", async () => {
  const risk = await createRisk("trigger");
  const monitoring = await createSubmittedMonitoring(risk, { triwulan: 4 });
  const result = await finalizeMonitoring({
    monitoringId: monitoring.id,
    expectedVersion: monitoring.version,
    actor,
  });
  assert.equal(result.alreadyFinal, false);
  assert.ok(result.followUpRiskId);
  assert.ok(result.obligationId);

  const followUp = await prisma.identifikasiRisiko.findUnique({
    where: { id: result.followUpRiskId },
    include: { analisisRisiko: true },
  });
  const origin = await prisma.identifikasiRisiko.findUnique({
    where: { id: risk.id },
  });
  const obligation = await prisma.kewajibanTindakLanjut.findUnique({
    where: { id: result.obligationId },
  });
  const finalMonitoring = await prisma.pemantauanRisiko.findUnique({
    where: { id: monitoring.id },
  });

  assert.equal(origin.statusSiklus, RISK_CYCLE.ACTIVE);
  assert.equal(followUp.statusSiklus, RISK_CYCLE.FOLLOW_UP_DRAFT);
  assert.equal(followUp.followUpTahun, 2027);
  assert.equal(followUp.followUpTriwulan, 1);
  assert.equal(obligation.status, KEWAJIBAN_STATUS.WAJIB);
  assert.equal(finalMonitoring.status, PEMANTAUAN_STATUS.FINAL);
  assert.ok(finalMonitoring.matriksSnapshot);
  assert.match(followUp.analisisRisiko.pengendalianUraian, /RTP SNAPSHOT/);
  assert.match(followUp.analisisRisiko.pengendalianUraian, /Realisasi final periode/);
  assert.doesNotMatch(
    followUp.analisisRisiko.pengendalianUraian,
    /RTP TERKINI/
  );

  const retry = await finalizeMonitoring({
    monitoringId: monitoring.id,
    expectedVersion: monitoring.version,
    actor,
  });
  assert.equal(retry.alreadyFinal, true);
  assert.equal(
    await prisma.identifikasiRisiko.count({ where: { parentRiskId: risk.id } }),
    1
  );
});

test("2. di bawah selera atau respons lain tidak membuat kewajiban", async () => {
  const below = await createRisk("below", { kSkala: 2, dSkala: 2 });
  const belowMonitoring = await createSubmittedMonitoring(below, {
    kSkala: 2,
    dSkala: 2,
  });
  const belowResult = await finalizeMonitoring({
    monitoringId: belowMonitoring.id,
    expectedVersion: belowMonitoring.version,
    actor,
  });
  assert.equal(belowResult.followUpRiskId, null);

  const accept = await createRisk("accept", { respon: "menerima" });
  const acceptMonitoring = await createSubmittedMonitoring(accept, {
    respon: "menerima",
  });
  const acceptResult = await finalizeMonitoring({
    monitoringId: acceptMonitoring.id,
    expectedVersion: acceptMonitoring.version,
    actor,
  });
  assert.equal(acceptResult.followUpRiskId, null);
});

test("3. guard residual final menolak batch/import dan field non-residual tetap boleh", async () => {
  const risk = await createRisk("guard");
  const monitoring = await createSubmittedMonitoring(risk);
  await finalizeMonitoring({
    monitoringId: monitoring.id,
    expectedVersion: monitoring.version,
    actor,
  });

  await assert.rejects(
    () =>
      prisma.$transaction(async (tx: any) => {
        await assertResidualMutable(tx, risk.id);
        await tx.evaluasiRisiko.update({
          where: { identifikasiRisikoId: risk.id },
          data: { residualLevelKemungkinanId: ref.levelK[0].id },
        });
      }),
    (error: any) =>
      error instanceof DomainError &&
      error.status === 409 &&
      error.details?.code === "FINAL_RESIDUAL_PROTECTED"
  );

  assert.equal(touchesResidual({ responRisiko: "menerima" }), false);
  assert.equal(touchesResidual({ residualLevelDampakId: 1 }), true);
});

test("4. dua penyimpanan versi sama hanya satu yang berhasil", async () => {
  const risk = await createRisk("version");
  const monitoring = await prisma.pemantauanRisiko.create({
    data: {
      riskId: risk.id,
      tahun: 2026,
      triwulan: 2,
      status: PEMANTAUAN_STATUS.DRAFT,
    },
  });
  const results = await Promise.all([
    prisma.pemantauanRisiko.updateMany({
      where: {
        id: monitoring.id,
        version: monitoring.version,
        status: PEMANTAUAN_STATUS.DRAFT,
      },
      data: { version: { increment: 1 }, catatanEfektivitas: "A" },
    }),
    prisma.pemantauanRisiko.updateMany({
      where: {
        id: monitoring.id,
        version: monitoring.version,
        status: PEMANTAUAN_STATUS.DRAFT,
      },
      data: { version: { increment: 1 }, catatanEfektivitas: "B" },
    }),
  ]);
  assert.deepEqual(results.map((item: any) => item.count).sort(), [0, 1]);
});

test("5. finalisasi bersamaan dan retry tidak menduplikasi penerus", async () => {
  const risk = await createRisk("concurrent-final");
  const monitoring = await createSubmittedMonitoring(risk);
  const settled = await Promise.allSettled([
    finalizeMonitoring({
      monitoringId: monitoring.id,
      expectedVersion: monitoring.version,
      actor,
    }),
    finalizeMonitoring({
      monitoringId: monitoring.id,
      expectedVersion: monitoring.version,
      actor,
    }),
  ]);
  const fulfilled = settled.filter(
    (item: any) => item.status === "fulfilled"
  ) as any[];
  assert.ok(fulfilled.length >= 1);
  assert.equal(
    await prisma.identifikasiRisiko.count({ where: { parentRiskId: risk.id } }),
    1
  );
  assert.equal(
    await prisma.kewajibanTindakLanjut.count({ where: { riskId: risk.id } }),
    1
  );
});

test("6. pengesahan bersamaan tidak menghasilkan dua penerus aktif", async () => {
  const risk = await createRisk("concurrent-approve");
  const monitoring = await createSubmittedMonitoring(risk);
  const finalized = await finalizeMonitoring({
    monitoringId: monitoring.id,
    expectedVersion: monitoring.version,
    actor,
  });
  const followUpId = finalized.followUpRiskId as number;

  // Lengkapi tahap minimum lalu ajukan.
  const lk = ref.levelK[2];
  const ld = ref.levelD[2];
  const matrix = pairBySkala(3, 3);
  await prisma.analisisRisiko.update({
    where: { identifikasiRisikoId: followUpId },
    data: { pengendalianUraian: "Pengendalian ditinjau" },
  });
  await prisma.evaluasiRisiko.create({
    data: {
      identifikasiRisikoId: followUpId,
      responRisiko: "mengurangi",
      residualLevelKemungkinanId: lk.id,
      residualLevelDampakId: ld.id,
      residualLevelRisikoId: matrix.levelRisikoId,
    },
  });
  await prisma.rencanaPenanganan.create({
    data: {
      identifikasiRisikoId: followUpId,
      rencanaTidakPenanganan: "RTP baru",
      jenisPenanganan: "perbaikan",
      targetOutput: "Output",
      targetWaktu: "30/06/2027",
      penanggungJawab: "Tim A",
      targetResidualLevelKemungkinanId: ref.levelK[0].id,
      targetResidualLevelDampakId: ref.levelD[0].id,
      alasanPenguatan: "RTP lama belum cukup",
    },
  });
  await prisma.identifikasiRisiko.update({
    where: { id: followUpId },
    data: { statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED },
  });
  await prisma.kewajibanTindakLanjut.updateMany({
    where: { followUpRiskId: followUpId },
    data: { status: KEWAJIBAN_STATUS.MENUNGGU_VALIDASI },
  });

  const current = await prisma.identifikasiRisiko.findUnique({
    where: { id: followUpId },
  });
  const settled = await Promise.allSettled([
    approveFollowUp({
      riskId: followUpId,
      expectedVersion: current.version,
      actor,
    }),
    approveFollowUp({
      riskId: followUpId,
      expectedVersion: current.version,
      actor,
    }),
  ]);
  assert.equal(
    settled.filter((item: any) => item.status === "fulfilled").length,
    1
  );
  const origin = await prisma.identifikasiRisiko.findUnique({
    where: { id: risk.id },
  });
  const children = await prisma.identifikasiRisiko.findMany({
    where: { parentRiskId: risk.id, statusSiklus: RISK_CYCLE.ACTIVE },
  });
  assert.equal(origin.statusSiklus, RISK_CYCLE.CONTINUED);
  assert.equal(children.length, 1);
  const obligation = await prisma.kewajibanTindakLanjut.findFirst({
    where: { riskId: risk.id },
  });
  assert.equal(obligation.status, KEWAJIBAN_STATUS.SELESAI);
});

test("7. kewajiban lama yang terbuka mencegah penerus kedua lintas triwulan", async () => {
  const risk = await createRisk("cross-quarter");
  const first = await createSubmittedMonitoring(risk, { triwulan: 1 });
  await finalizeMonitoring({
    monitoringId: first.id,
    expectedVersion: first.version,
    actor,
  });
  const second = await createSubmittedMonitoring(risk, { triwulan: 2 });
  await assert.rejects(
    () =>
      finalizeMonitoring({
        monitoringId: second.id,
        expectedVersion: second.version,
        actor,
      }),
    (error: any) =>
      error instanceof DomainError &&
      error.status === 409 &&
      error.details?.code === "OPEN_OBLIGATION"
  );
  const secondAfter = await prisma.pemantauanRisiko.findUnique({
    where: { id: second.id },
  });
  assert.equal(secondAfter.status, PEMANTAUAN_STATUS.SUBMITTED);
  assert.equal(
    await prisma.identifikasiRisiko.count({ where: { parentRiskId: risk.id } }),
    1
  );
});

test("8a. koreksi tanpa pemicu membatalkan kewajiban dan draf penerus", async () => {
  const risk = await createRisk("reconcile-cancel");
  const first = await createSubmittedMonitoring(risk, { triwulan: 3 });
  const finalized = await finalizeMonitoring({
    monitoringId: first.id,
    expectedVersion: first.version,
    actor,
  });
  const correction = await prisma.pemantauanRisiko.create({
    data: {
      riskId: risk.id,
      tahun: first.tahun,
      triwulan: first.triwulan,
      status: PEMANTAUAN_STATUS.SUBMITTED,
      revision: 2,
      previousRevisionId: first.id,
      statusPelaksanaan: "selesai",
      uraianPelaksanaan: "Koreksi",
      realisasiOutput: "Koreksi output",
      catatanEfektivitas: "Pemicu tidak berlaku",
      levelKemungkinanId: ref.levelK[0].id,
      levelDampakId: ref.levelD[0].id,
      responRisiko: "mengurangi",
      submittedAt: new Date(),
      dokumens: {
        create: [{ title: "Bukti koreksi", url: "https://example.com/k.pdf" }],
      },
    },
  });
  await finalizeMonitoring({
    monitoringId: correction.id,
    expectedVersion: correction.version,
    actor,
  });
  const successor = await prisma.identifikasiRisiko.findUnique({
    where: { id: finalized.followUpRiskId },
  });
  const obligation = await prisma.kewajibanTindakLanjut.findUnique({
    where: { id: finalized.obligationId },
  });
  const previous = await prisma.pemantauanRisiko.findUnique({
    where: { id: first.id },
  });
  assert.equal(successor.statusSiklus, RISK_CYCLE.FOLLOW_UP_CANCELLED);
  assert.equal(obligation.status, KEWAJIBAN_STATUS.DIBATALKAN);
  assert.equal(previous.status, PEMANTAUAN_STATUS.SUPERSEDED);
});

test("8b. koreksi dengan pemicu mengembalikan penerus diajukan ke draf", async () => {
  const risk = await createRisk("reconcile-reopen");
  const first = await createSubmittedMonitoring(risk, { triwulan: 3 });
  const finalized = await finalizeMonitoring({
    monitoringId: first.id,
    expectedVersion: first.version,
    actor,
  });
  const followUpId = finalized.followUpRiskId as number;
  await prisma.identifikasiRisiko.update({
    where: { id: followUpId },
    data: { statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED },
  });
  await prisma.kewajibanTindakLanjut.updateMany({
    where: { followUpRiskId: followUpId },
    data: { status: KEWAJIBAN_STATUS.MENUNGGU_VALIDASI },
  });
  const correction = await prisma.pemantauanRisiko.create({
    data: {
      riskId: risk.id,
      tahun: first.tahun,
      triwulan: first.triwulan,
      status: PEMANTAUAN_STATUS.SUBMITTED,
      revision: 2,
      previousRevisionId: first.id,
      statusPelaksanaan: "selesai",
      uraianPelaksanaan: "Koreksi",
      realisasiOutput: "Koreksi output",
      catatanEfektivitas: "Masih di atas selera",
      levelKemungkinanId: ref.levelK[2].id,
      levelDampakId: ref.levelD[2].id,
      responRisiko: "mengurangi",
      submittedAt: new Date(),
      dokumens: {
        create: [{ title: "Bukti koreksi", url: "https://example.com/k.pdf" }],
      },
    },
  });
  await finalizeMonitoring({
    monitoringId: correction.id,
    expectedVersion: correction.version,
    actor,
  });
  const successor = await prisma.identifikasiRisiko.findUnique({
    where: { id: followUpId },
  });
  assert.equal(successor.statusSiklus, RISK_CYCLE.FOLLOW_UP_DRAFT);
});

test("8c. koreksi dengan penerus aktif memerlukan rekonsiliasi eksplisit", async () => {
  const risk = await createRisk("reconcile-active");
  const first = await createSubmittedMonitoring(risk, { triwulan: 3 });
  const finalized = await finalizeMonitoring({
    monitoringId: first.id,
    expectedVersion: first.version,
    actor,
  });
  const followUpId = finalized.followUpRiskId as number;
  await prisma.identifikasiRisiko.update({
    where: { id: followUpId },
    data: { statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED },
  });
  const current = await prisma.identifikasiRisiko.findUnique({
    where: { id: followUpId },
  });
  await approveFollowUp({
    riskId: followUpId,
    expectedVersion: current.version,
    actor,
  });

  const correction = await prisma.pemantauanRisiko.create({
    data: {
      riskId: risk.id,
      tahun: first.tahun,
      triwulan: first.triwulan,
      status: PEMANTAUAN_STATUS.SUBMITTED,
      revision: 2,
      previousRevisionId: first.id,
      statusPelaksanaan: "selesai",
      uraianPelaksanaan: "Koreksi",
      realisasiOutput: "Koreksi output",
      catatanEfektivitas: "Koreksi",
      levelKemungkinanId: ref.levelK[0].id,
      levelDampakId: ref.levelD[0].id,
      responRisiko: "mengurangi",
      submittedAt: new Date(),
      dokumens: {
        create: [{ title: "Bukti koreksi", url: "https://example.com/k.pdf" }],
      },
    },
  });

  await assert.rejects(
    () =>
      finalizeMonitoring({
        monitoringId: correction.id,
        expectedVersion: correction.version,
        actor,
      }),
    (error: any) =>
      error instanceof DomainError &&
      error.status === 409 &&
      error.details?.code === "RECONCILIATION_REQUIRED"
  );

  const reconciled = await finalizeMonitoring({
    monitoringId: correction.id,
    expectedVersion: correction.version,
    actor,
    reconciliation: {
      decision: "MARK_FOR_REVIEW",
      note: "Penerus aktif dipertahankan; perlu tinjauan lanjutan.",
    },
  });
  assert.equal(reconciled.alreadyFinal, false);
  const activeSuccessor = await prisma.identifikasiRisiko.findUnique({
    where: { id: followUpId },
  });
  assert.equal(activeSuccessor.statusSiklus, RISK_CYCLE.ACTIVE);
});

test("H. periode mulai penerapan stabil dan tersimpan", async () => {
  const first = await getMonitoringStartPeriode(prisma);
  const second = await getMonitoringStartPeriode(prisma);
  assert.deepEqual(first, second);
  const stored = await prisma.appSetting.findUnique({
    where: { key: "monitoring_start_periode" },
  });
  assert.ok(stored);
  assert.deepEqual(JSON.parse(stored.value), first);
});

test("9. pembatalan tanpa koreksi sah ditolak; koreksi sah membatalkan atomik", async () => {
  const risk = await createRisk("cancel-obligation");
  const first = await createSubmittedMonitoring(risk, { triwulan: 4 });
  const finalized = await finalizeMonitoring({
    monitoringId: first.id,
    expectedVersion: first.version,
    actor,
  });
  const followUpId = finalized.followUpRiskId as number;

  await assert.rejects(
    () =>
      cancelObligationThroughCorrection({
        monitoringId: first.id,
        correctionMonitoringId: first.id,
        reason: "Coba batalkan tanpa koreksi",
        actor,
      }),
    (error: any) => error instanceof DomainError && error.status === 409
  );

  const correction = await prisma.pemantauanRisiko.create({
    data: {
      riskId: risk.id,
      tahun: first.tahun,
      triwulan: first.triwulan,
      status: PEMANTAUAN_STATUS.FINAL,
      revision: 2,
      previousRevisionId: first.id,
      statusPelaksanaan: "selesai",
      uraianPelaksanaan: "Koreksi",
      realisasiOutput: "Koreksi",
      catatanEfektivitas: "Pemicu hilang",
      levelKemungkinanId: ref.levelK[0].id,
      levelDampakId: ref.levelD[0].id,
      responRisiko: "mengurangi",
      besaran: 1,
      seleraSnapshot: 11,
      finalizedAt: new Date(),
      finalizedBy: "Admin Test",
      submittedAt: new Date(),
      dokumens: {
        create: [{ title: "Bukti koreksi", url: "https://example.com/k.pdf" }],
      },
    },
  });

  const cancelled = await cancelObligationThroughCorrection({
    monitoringId: first.id,
    correctionMonitoringId: correction.id,
    reason: "Koreksi final membuktikan pemicu tidak berlaku.",
    actor,
  });
  assert.equal(cancelled.status, KEWAJIBAN_STATUS.DIBATALKAN);
  assert.equal(cancelled.resolution, "CANCELLED");
  const successor = await prisma.identifikasiRisiko.findUnique({
    where: { id: followUpId },
  });
  assert.equal(successor.statusSiklus, RISK_CYCLE.FOLLOW_UP_CANCELLED);
});

test("10. risiko Continued tetap muncul pada laporan historis", async () => {
  const rows = await buildHistoricalReport({
    tahun: 2026,
    teamIds: [ref.teamA.id],
    isAdmin: false,
  });
  assert.ok(rows.some((row: any) => row.risiko.includes("concurrent-approve")));
});

test("12/13. laporan memakai snapshot dan menghormati isolasi tim", async () => {
  const rowsBefore = await buildHistoricalReport({
    tahun: 2026,
    triwulan: 4,
    teamIds: [ref.teamA.id],
    isAdmin: false,
  });
  const row = rowsBefore.find(
    (item: any) => item.risiko.includes("__TEST__ trigger")
  );
  assert.ok(row);
  assert.equal(row.residualHasil, 14);
  assert.equal(row.selera, 11);

  await prisma.matriksAnalisisRisiko.updateMany({
    where: {
      levelKemungkinanId: ref.levelK[2].id,
      levelDampakId: ref.levelD[2].id,
    },
    data: { besaran: 99 },
  });
  await prisma.seleraRisikoGlobal.updateMany({ data: { nilai: 5 } });

  const rowsAfter = await buildHistoricalReport({
    tahun: 2026,
    triwulan: 4,
    teamIds: [ref.teamA.id],
    isAdmin: false,
  });
  const rowAfter = rowsAfter.find(
    (item: any) => item.risiko.includes("__TEST__ trigger")
  );
  assert.equal(rowAfter.residualHasil, 14);
  assert.equal(rowAfter.selera, 11);

  const teamBRows = await buildHistoricalReport({
    tahun: 2026,
    teamIds: [ref.teamB.id],
    isAdmin: false,
  });
  assert.equal(
    teamBRows.some((item: any) => item.risiko.includes("__TEST__ trigger")),
    false
  );
  const adminRows = await buildHistoricalReport({
    tahun: 2026,
    teamIds: [],
    isAdmin: true,
  });
  assert.ok(
    adminRows.some((item: any) => item.risiko.includes("__TEST__ trigger"))
  );
});

test("15. kegagalan pembuatan kewajiban merollback finalisasi", async () => {
  const risk = await createRisk("rollback");
  const monitoring = await createSubmittedMonitoring(risk);
  const beforeEvaluasi = await prisma.evaluasiRisiko.findUnique({
    where: { identifikasiRisikoId: risk.id },
  });
  // Konflik unik monitoringId dibuat sebelum finalisasi.
  await prisma.kewajibanTindakLanjut.create({
    data: {
      monitoringId: monitoring.id,
      riskId: risk.id,
      teamId: risk.teamId,
      status: KEWAJIBAN_STATUS.WAJIB,
    },
  });

  await assert.rejects(() =>
    finalizeMonitoring({
      monitoringId: monitoring.id,
      expectedVersion: monitoring.version,
      actor,
    })
  );
  const monitoringAfter = await prisma.pemantauanRisiko.findUnique({
    where: { id: monitoring.id },
  });
  const evaluasiAfter = await prisma.evaluasiRisiko.findUnique({
    where: { identifikasiRisikoId: risk.id },
  });
  assert.equal(monitoringAfter.status, PEMANTAUAN_STATUS.SUBMITTED);
  assert.deepEqual(
    {
      k: evaluasiAfter.residualLevelKemungkinanId,
      d: evaluasiAfter.residualLevelDampakId,
    },
    {
      k: beforeEvaluasi.residualLevelKemungkinanId,
      d: beforeEvaluasi.residualLevelDampakId,
    }
  );
});

test("16. data legacy mendapat default siklus tanpa kehilangan dokumen", async () => {
  const legacy = await prisma.identifikasiRisiko.create({
    data: {
      risiko: "__TEST__ legacy",
      jenisRisikoId: ref.jenis.id,
      sumberRisikoId: ref.sumber.id,
      kategoriRisikoId: ref.kategori.id,
      areaDampakId: ref.area.id,
    },
  });
  assert.equal(legacy.statusSiklus, RISK_CYCLE.ACTIVE);
  assert.equal(legacy.version, 1);
  assert.equal(legacy.parentRiskId, null);
  assert.equal(legacy.sourceMonitoringId, null);
});

test("regresi matriks dan aturan selera tetap konsisten", () => {
  assert.equal(requiresFollowUp("mengurangi", 11, 11), true);
  assert.equal(requiresFollowUp("mengurangi", 10, 11), false);
  assert.equal(requiresFollowUp("menerima", 99, 11), false);
});
