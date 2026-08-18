"use client";

import { useEffect, useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { useList, useCreate, useUpdate } from "@refinedev/core";
import {
  Title,
  Button,
  Group,
  Loader,
  Center,
  Stack,
  Text,
  Card,
  Modal,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Select,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPencil,
  IconCheck,
  IconX,
  IconFileText,
  IconExternalLink,
  IconDownload,
} from "@tabler/icons-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { Pagination } from "@/components/pagination";
import { useYear } from "@/lib/year-context";

interface ReportRow {
  identId: number;
  rencanaId: number | null;
  no: number;

  // Identifikasi
  sasaran: string;
  kegiatan: string;
  prosesBisnis: string;
  risiko: string;
  penyebab: string;
  dampak: string;

  // Analisis Aktual
  kemungkinanAktual: string;
  dampakAktual: string;
  besaranAktual: number;
  levelAktual: string;
  warnaAktual: string;
  pengendalian: string;
  efektivitas: string;

  // Evaluasi & RTP
  respon: string;
  rencanaPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  penanggungJawab: string;

  // Residual
  kemungkinanResidual: string;
  dampakResidual: string;
  besaranResidual: number;
  levelResidual: string;
  warnaResidual: string;

  // Pemantauan (Realisasi)
  keterjadiRisiko: string;
  realisasiWaktu: string;
  realisasiOutput: string;
  dokumenPendukung: string;

  // Pelaporan (Persetujuan)
  persetujuan: string;
  disetujuiOleh: string;

  // Additional fields for Excel
  satuan?: string;
  tim?: string;
  kategori?: string;
  areaDampak?: string;
  sumberRisiko?: string;
  prioritas?: number;
}

export default function PelaporanRisikoPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const { tahunDari, tahunSampai } = useYear();

  // Form State
  const [modalPersetujuan, setModalPersetujuan] = useState("");
  const [modalDisetujuiOleh, setModalDisetujuiOleh] = useState("");

  const identResult = useList({
    resource: "identifikasi-risiko",
    pagination: { pageSize: 1000 },
    filters: [
      {
        field: "tahun",
        operator: "gte",
        value: tahunDari,
      },
      {
        field: "tahun",
        operator: "lte",
        value: tahunSampai,
      },
    ],
  });
  const analisisResult = useList({
    resource: "analisis-risiko",
    pagination: { pageSize: 1000 },
  });
  const evaluasiResult = useList({
    resource: "evaluasi-risiko",
    pagination: { pageSize: 1000 },
  });
  const rencanaResult = useList({
    resource: "rencana-penanganan",
    pagination: { pageSize: 1000 },
  });
  const lkResult = useList({
    resource: "level-kemungkinan",
    pagination: { mode: "off" },
  });
  const ldResult = useList({
    resource: "level-dampak",
    pagination: { mode: "off" },
  });
  const matriksResult = useList({
    resource: "matriks-analisis-risiko",
    pagination: { mode: "off" },
  });
  const { mutate: createMutate } = useCreate();
  const { mutate: updateMutate } = useUpdate();

  const loading =
    identResult.query.isPending ||
    analisisResult.query.isPending ||
    evaluasiResult.query.isPending ||
    rencanaResult.query.isPending ||
    lkResult.query.isPending ||
    ldResult.query.isPending ||
    matriksResult.query.isPending;

  const identifikasiData = useMemo(
    () => identResult.result?.data ?? [],
    [identResult.result?.data]
  );

  const currentYear = new Date().getFullYear();
  const filteredIdentifikasiData = useMemo(() => {
    return identifikasiData;
  }, [identifikasiData]);

  const analisisData = useMemo(
    () => analisisResult.result?.data ?? [],
    [analisisResult.result?.data]
  );
  const evaluasiData = useMemo(
    () => evaluasiResult.result?.data ?? [],
    [evaluasiResult.result?.data]
  );
  const rencanaData = useMemo(
    () => rencanaResult.result?.data ?? [],
    [rencanaResult.result?.data]
  );
  const lkData = useMemo(
    () => lkResult.result?.data ?? [],
    [lkResult.result?.data]
  );
  const ldData = useMemo(
    () => ldResult.result?.data ?? [],
    [ldResult.result?.data]
  );
  const matriksData = useMemo(
    () => matriksResult.result?.data ?? [],
    [matriksResult.result?.data]
  );
  const refetchQuery = rencanaResult.query?.refetch;

  // Compile all data rows
  const allRows = useMemo((): ReportRow[] => {
    if (loading) return [];

    const lkById = new Map(lkData.map((lk: any) => [lk.id, lk]));
    const ldById = new Map(ldData.map((ld: any) => [ld.id, ld]));
    const analisisById = new Map(
      analisisData.map((a: any) => [a.identifikasiRisikoId, a])
    );
    const evaluasiById = new Map(
      evaluasiData.map((e: any) => [e.identifikasiRisikoId, e])
    );
    const rencanaById = new Map(
      rencanaData.map((r: any) => [r.identifikasiRisikoId, r])
    );

    return filteredIdentifikasiData.map((r: Record<string, any>, index): ReportRow => {
      const an = analisisById.get(r.id);
      const ev = evaluasiById.get(r.id);
      const rp = rencanaById.get(r.id);

      // Find likelihood & impact scales for aktual
      const lkAktual = an ? lkById.get(an.levelKemungkinanId) : null;
      const ldAktual = an ? ldById.get(an.levelDampakId) : null;

      // Find likelihood & impact scales for residual
      const lkResidual = rp ? lkById.get(rp.residualLevelKemungkinanId) : null;
      const ldResidual = rp ? ldById.get(rp.residualLevelDampakId) : null;

      let bAktual = 0;
      let levAktual = "-";
      let wAktual = "gray";

      if (lkAktual && ldAktual) {
        const matchMatriks = matriksData.find(
          (m: any) =>
            m.levelKemungkinanId === lkAktual.id &&
            m.levelDampakId === ldAktual.id
        );
        bAktual = matchMatriks?.besaran ?? lkAktual.skala * ldAktual.skala;
        levAktual = matchMatriks?.levelRisiko?.nama ?? "Sedang";
        wAktual = matchMatriks?.levelRisiko?.warna ?? "Kuning";
      }

      let bResidual = 0;
      let levResidual = "-";
      let wResidual = "gray";

      if (lkResidual && ldResidual) {
        const matchMatriks = matriksData.find(
          (m: any) =>
            m.levelKemungkinanId === lkResidual.id &&
            m.levelDampakId === ldResidual.id
        );
        bResidual =
          matchMatriks?.besaran ?? lkResidual.skala * ldResidual.skala;
        levResidual = matchMatriks?.levelRisiko?.nama ?? "Rendah";
        wResidual = matchMatriks?.levelRisiko?.warna ?? "Hijau";
      }

      return {
        identId: r.id,
        rencanaId: rp?.id ?? null,
        no: index + 1,
        sasaran: r.sasaran?.nama ?? "",
        kegiatan: r.kegiatan?.nama ?? "",
        prosesBisnis: r.prosesBisnis?.nama ?? "",
        risiko: r.risiko,
        penyebab: r.penyebab ?? "",
        dampak: r.dampak ?? "",
        kemungkinanAktual: lkAktual?.nama ?? "-",
        dampakAktual: ldAktual?.nama ?? "-",
        besaranAktual: bAktual,
        levelAktual: levAktual,
        warnaAktual: wAktual,
        pengendalian: an?.pengendalianUraian ?? "",
        efektivitas: an?.pengendalianEfektivitas ?? "",
        respon: ev?.responRisiko === "mengurangi" ? "Mengurangi Risiko" :
                ev?.responRisiko === "mentransfer" ? "Mengalihkan Risiko" :
                ev?.responRisiko === "menghindari" ? "Menghindari Risiko" :
                ev?.responRisiko === "menerima" ? "Menerima Risiko" :
                (ev?.responRisiko ?? "Menerima Risiko"),
        rencanaPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        penanggungJawab: rp?.penanggungJawab ?? "",
        kemungkinanResidual: lkResidual?.nama ?? "-",
        dampakResidual: ldResidual?.nama ?? "-",
        besaranResidual: bResidual,
        levelResidual: levResidual,
        warnaResidual: wResidual,
        keterjadiRisiko: rp?.keterjadiRisiko ?? "",
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        dokumenPendukung: rp?.dokumenPendukung ?? "",
        persetujuan: rp?.persetujuan ?? "Draft",
        disetujuiOleh: rp?.disetujuiOleh ?? "",
        satuan: r.sasaran?.nama ?? "",
        tim: r.tim ?? "",
        kategori: r.kategoriRisiko?.nama ?? "",
        areaDampak: r.areaDampak?.nama ?? "",
        sumberRisiko: r.sumberRisiko?.nama ?? "",
        prioritas: bAktual,
      };
    });
  }, [
    loading,
    filteredIdentifikasiData,
    analisisData,
    evaluasiData,
    rencanaData,
    lkData,
    ldData,
    matriksData,
  ]);

  // Paginate rows
  const totalRows = allRows.length;
  const tableRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allRows
      .slice(start, end)
      .map((row, idx) => ({ ...row, no: start + idx + 1 }));
  }, [allRows, currentPage, pageSize]);

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Open approval modal
  const openApprovalModal = (row: ReportRow) => {
    setSelectedRow(row);
    setModalPersetujuan(row.persetujuan);
    setModalDisetujuiOleh(row.disetujuiOleh);
    setModalOpened(true);
  };

  const handleSaveModal = () => {
    if (!selectedRow) return;

    const payload = {
      persetujuan: modalPersetujuan || null,
      disetujuiOleh: modalDisetujuiOleh || null,
    };

    if (selectedRow.rencanaId === null) {
      createMutate(
        {
          resource: "rencana-penanganan",
          values: {
            ...payload,
            identifikasiRisikoId: selectedRow.identId,
          },
          successNotification: {
            message: "Persetujuan berhasil disimpan",
            type: "success" as const,
          },
          errorNotification: {
            message: "Gagal menyimpan persetujuan",
            type: "error" as const,
          },
        },
        {
          onSuccess: () => {
            setModalOpened(false);
            if (refetchQuery) refetchQuery();
          },
          onError: (error: any) => {
            console.error("Create failed:", error);
          },
        }
      );
    } else {
      const origPersetujuan = selectedRow.persetujuan;
      const origDisetujuiOleh = selectedRow.disetujuiOleh;

      setModalOpened(false);

      updateMutate(
        {
          resource: "rencana-penanganan",
          id: selectedRow.rencanaId,
          values: payload,
          mutationMode: "undoable",
          successNotification: {
            message: "Persetujuan berhasil diperbarui",
            type: "success" as const,
          },
          errorNotification: {
            message: "Gagal memperbarui persetujuan",
            type: "error" as const,
          },
        },
        {
          onSuccess: () => {
            if (refetchQuery) refetchQuery();
          },
          onError: (error: any) => {
            if (error?.message === "mutationCancelled") {
              setModalPersetujuan(origPersetujuan);
              setModalDisetujuiOleh(origDisetujuiOleh);
              setModalOpened(true);
              if (refetchQuery) refetchQuery();
            } else {
              console.error("Update failed:", error);
            }
          },
        }
      );
    }
  };

  const getBadgeColor = (warna: string) => {
    switch (warna?.toLowerCase()) {
      case "biru":
      case "blue":
        return "blue";
      case "hijau":
      case "green":
        return "green";
      case "kuning":
      case "yellow":
        return "yellow";
      case "jingga":
      case "oranye":
      case "orange":
        return "orange";
      case "merah":
      case "red":
        return "red";
      default:
        return "gray";
    }
  };

  const getExcelBadgeColor = (warna: string) => {
    switch (warna?.toLowerCase()) {
      case "biru":
      case "blue":
        return { bg: "E1EFFE", text: "1E429F" };
      case "hijau":
      case "green":
        return { bg: "DEF7EC", text: "03543F" };
      case "kuning":
      case "yellow":
        return { bg: "FEF9C3", text: "713F12" };
      case "jingga":
      case "oranye":
      case "orange":
        return { bg: "FDF2E9", text: "B45309" };
      case "merah":
      case "red":
        return { bg: "FDE8E8", text: "9B1C1C" };
      default:
        return { bg: "F3F4F6", text: "374151" };
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Pelaporan Risiko");

      // Title
      worksheet.mergeCells("A1:AI1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "LAPORAN PELAPORAN RISIKO";
      titleCell.font = {
        name: "Arial",
        size: 16,
        bold: true,
        color: { argb: "1F2937" },
      };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      worksheet.getRow(1).height = 35;

      // Subtitle/Meta Info
      worksheet.mergeCells("A2:AI2");
      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = `Tanggal Unduh: ${new Date().toLocaleDateString(
        "id-ID",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;
      subtitleCell.font = {
        name: "Arial",
        size: 10,
        italic: true,
        color: { argb: "4B5563" },
      };
      subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
      worksheet.getRow(2).height = 20;

      // Setup columns array (just to map width keys and default sizes)
      worksheet.columns = [
        { header: "", key: "no", width: 8 },
        { header: "", key: "sasaran", width: 24 },
        { header: "", key: "kegiatan", width: 24 },
        { header: "", key: "prosesBisnis", width: 24 },
        { header: "", key: "risiko", width: 30 },
        { header: "", key: "penyebab", width: 25 },
        { header: "", key: "dampak", width: 25 },
        { header: "", key: "kategori", width: 20 },
        { header: "", key: "areaDampak", width: 20 },
        { header: "", key: "sumberRisiko", width: 20 },
        { header: "", key: "kemungkinanAktual", width: 18 },
        { header: "", key: "dampakAktual", width: 18 },
        { header: "", key: "besaranAktual", width: 20 },
        { header: "", key: "levelAktual", width: 18 },
        { header: "", key: "pengendalian", width: 30 },
        { header: "", key: "efektivitas", width: 18 },
        { header: "", key: "kemungkinanResidual", width: 18 },
        { header: "", key: "dampakResidual", width: 18 },
        { header: "", key: "levelResidual", width: 18 },
        { header: "", key: "besaranResidual", width: 20 },
        { header: "", key: "respon", width: 20 },
        { header: "", key: "rencanaPenanganan", width: 30 },
        { header: "", key: "targetWaktu", width: 15 },
        { header: "", key: "targetOutput", width: 25 },
        { header: "", key: "penanggungJawab", width: 20 },
        { header: "", key: "keterjadiRisiko", width: 20 },
        { header: "", key: "realisasiWaktu", width: 15 },
        { header: "", key: "realisasiOutput", width: 25 },
        { header: "", key: "dokumenPendukung", width: 25 },
        { header: "", key: "kemungkinanResidualHarapan", width: 18 },
        { header: "", key: "dampakResidualHarapan", width: 18 },
        { header: "", key: "levelResidualHarapan", width: 18 },
        { header: "", key: "besaranResidualHarapan", width: 20 },
        { header: "", key: "persetujuan", width: 18 },
        { header: "", key: "disetujuiOleh", width: 20 },
      ];

      // Define header structure
      const headerRow1 = [
        "No", // A
        "Sasaran", // B
        "Kegiatan", // C
        "Proses Bisnis", // D
        "Risiko", // E
        "Identifikasi",
        "",
        "",
        "",
        "", // F, G, H, I, J
        "Analisis Risiko Aktual",
        "",
        "",
        "", // K, L, M, N
        "Pengendalian yang Telah Dilaksanakan",
        "", // O, P
        "Risiko Residual",
        "",
        "",
        "", // Q, R, S, T
        "Respons Risiko", // U
        "Rencana Penanganan Risiko",
        "",
        "",
        "", // V, W, X, Y
        "Pemantauan Tindak Lanjut Penanganan Risiko",
        "",
        "",
        "", // Z, AA, AB, AC
        "Risiko Residual Harapan",
        "",
        "",
        "", // AD, AE, AF, AG
        "Persetujuan (Reporting)",
        "", // AH, AI
      ];

      const headerRow2 = [
        "", // A
        "", // B
        "", // C
        "", // D
        "", // E
        "Penyebab", // F
        "Dampak", // G
        "Kategori Risiko", // H
        "Area Dampak", // I
        "Sumber Risiko", // J
        "Lvl Kemungkinan", // K
        "Lvl Dampak", // L
        "Besaran Risiko", // M
        "Level Risiko", // N
        "Pengendalian", // O
        "Efektivitas", // P
        "Level Kemungkinan", // Q
        "Level Dampak", // R
        "Level Risiko", // S
        "Besaran Risiko", // T
        "", // U
        "Rencana Penanganan", // V
        "Target Waktu", // W
        "Target Output", // X
        "P. Jawab", // Y
        "Keterjadian Risiko", // Z
        "Waktu Realisasi", // AA
        "Output Realisasi", // AB
        "Dokumen Pendukung", // AC
        "Kemungkinan", // AD
        "Dampak", // AE
        "Level Risiko", // AF
        "Besaran Residual", // AG
        "Persetujuan", // AH
        "Disetujui Oleh", // AI
      ];

      // Add headers
      worksheet.getRow(4).values = headerRow1;
      worksheet.getRow(5).values = headerRow2;

      // Merge header cells
      worksheet.mergeCells("A4:A5"); // No
      worksheet.mergeCells("B4:B5"); // Sasaran
      worksheet.mergeCells("C4:C5"); // Kegiatan
      worksheet.mergeCells("D4:D5"); // Proses Bisnis
      worksheet.mergeCells("E4:E5"); // Risiko
      worksheet.mergeCells("F4:J4"); // Identifikasi
      worksheet.mergeCells("K4:N4"); // Analisis Risiko Aktual
      worksheet.mergeCells("O4:P4"); // Pengendalian yang Telah Dilaksanakan
      worksheet.mergeCells("Q4:T4"); // Risiko Residual
      worksheet.mergeCells("U4:U5"); // Respons Risiko
      worksheet.mergeCells("V4:Y4"); // Rencana Penanganan Risiko
      worksheet.mergeCells("Z4:AC4"); // Pemantauan Tindak Lanjut Penanganan Risiko
      worksheet.mergeCells("AD4:AG4"); // Risiko Residual Harapan
      worksheet.mergeCells("AH4:AI4"); // Persetujuan (Reporting)

      // Format headers
      const headerFont = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "FFFFFF" },
      };
      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "374151" }, // gray-700
      };
      const headerBorder = {
        top: { style: "thin", color: { argb: "4B5563" } },
        left: { style: "thin", color: { argb: "4B5563" } },
        bottom: { style: "thin", color: { argb: "4B5563" } },
        right: { style: "thin", color: { argb: "4B5563" } },
      };

      for (let r = 4; r <= 5; r++) {
        const row = worksheet.getRow(r);
        row.height = 25;
        row.eachCell((cell: any) => {
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.border = headerBorder;
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
        });
      }

      // Add data rows
      allRows.forEach((row, index) => {
        const dataRow = worksheet.addRow({
          no: index + 1,
          sasaran: row.sasaran || "-",
          kegiatan: row.kegiatan || "-",
          prosesBisnis: row.prosesBisnis || "-",
          risiko: row.risiko,
          penyebab: row.penyebab || "-",
          dampak: row.dampak || "-",
          kategori: row.kategori || "-",
          areaDampak: row.areaDampak || "-",
          sumberRisiko: row.sumberRisiko || "-",
          kemungkinanAktual: row.kemungkinanAktual,
          dampakAktual: row.dampakAktual,
          besaranAktual: row.besaranAktual > 0 ? row.besaranAktual : "-",
          levelAktual: row.besaranAktual > 0 ? row.levelAktual : "-",
          pengendalian: row.pengendalian || "-",
          efektivitas: row.efektivitas || "-",
          kemungkinanResidual: row.kemungkinanResidual,
          dampakResidual: row.dampakResidual,
          levelResidual: row.levelResidual,
          besaranResidual: row.besaranResidual > 0 ? row.besaranResidual : "-",
          respon: row.respon,
          rencanaPenanganan: row.rencanaPenanganan || "-",
          targetWaktu: row.targetWaktu || "-",
          targetOutput: row.targetOutput || "-",
          penanggungJawab: row.penanggungJawab || "-",
          keterjadiRisiko: row.keterjadiRisiko || "-",
          realisasiWaktu: row.realisasiWaktu || "-",
          realisasiOutput: row.realisasiOutput || "-",
          dokumenPendukung: row.dokumenPendukung ? "Ada Dokumen" : "-",
          kemungkinanResidualHarapan: row.kemungkinanResidual,
          dampakResidualHarapan: row.dampakResidual,
          levelResidualHarapan: row.levelResidual,
          besaranResidualHarapan:
            row.besaranResidual > 0 ? row.besaranResidual : "-",
          persetujuan: row.persetujuan,
          disetujuiOleh: row.disetujuiOleh || "-",
        });

        dataRow.height = 22;

        // Cell borders and alignments
        dataRow.eachCell(
          { includeEmpty: true },
          (cell: any, colNumber: number) => {
            cell.border = {
              top: { style: "thin", color: { argb: "E5E7EB" } },
              left: { style: "thin", color: { argb: "E5E7EB" } },
              bottom: { style: "thin", color: { argb: "E5E7EB" } },
              right: { style: "thin", color: { argb: "E5E7EB" } },
            };
            cell.font = { name: "Arial", size: 10 };

            // Alignment adjustments
            if (
              [
                1, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 26, 27, 30, 31,
                32, 33, 34,
              ].includes(colNumber)
            ) {
              cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
              };
            } else {
              cell.alignment = {
                vertical: "middle",
                horizontal: "left",
                wrapText: true,
              };
            }
          }
        );

        // Color coding for Besaran Aktual (Col 13 / M)
        if (row.besaranAktual > 0) {
          const cellM = dataRow.getCell(13);
          const colorObj = getExcelBadgeColor(row.warnaAktual);
          cellM.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorObj.bg },
          };
          cellM.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: { argb: colorObj.text },
          };
        }

        // Color coding for Risiko Residual - Besaran Risiko (Col 20 / T)
        if (row.besaranResidual > 0) {
          const cellT = dataRow.getCell(20);
          const colorObj = getExcelBadgeColor(row.warnaResidual);
          cellT.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorObj.bg },
          };
          cellT.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: { argb: colorObj.text },
          };
        }

        // Color coding for Besaran Residual Harapan (Col 33 / AG)
        if (row.besaranResidual > 0) {
          const cellAG = dataRow.getCell(33);
          const colorObj = getExcelBadgeColor(row.warnaResidual);
          cellAG.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorObj.bg },
          };
          cellAG.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: { argb: colorObj.text },
          };
        }

        // Color coding for Evaluasi (Respon) (Col 21 / U)
        const cellU = dataRow.getCell(21);
        if (row.respon === "Mengurangi Risiko") {
          cellU.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FEF3C7" },
          }; // light yellow
          cellU.font = { name: "Arial", size: 10, color: { argb: "D97706" } };
        } else {
          cellU.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "ECFDF5" },
          }; // light green/teal
          cellU.font = { name: "Arial", size: 10, color: { argb: "059669" } };
        }

        // Color coding for Persetujuan (Col 34 / AH)
        const cellAH = dataRow.getCell(34);
        if (row.persetujuan === "Disetujui") {
          cellAH.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "DEF7EC" },
          };
          cellAH.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: { argb: "03543F" },
          };
        } else if (row.persetujuan === "Ditolak") {
          cellAH.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FDE8E8" },
          };
          cellAH.font = {
            name: "Arial",
            size: 10,
            bold: true,
            color: { argb: "9B1C1C" },
          };
        } else {
          cellAH.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F3F4F6" },
          };
          cellAH.font = { name: "Arial", size: 10, color: { argb: "4B5563" } };
        }
      });

      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Pelaporan_Risiko_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: "Berhasil",
        message: "Laporan berhasil diunduh sebagai file Excel",
        color: "green",
      });
    } catch (error: any) {
      console.error("Export Excel error:", error);
      notifications.show({
        title: "Gagal",
        message: `Gagal mengunduh Excel: ${error?.message || error}`,
        color: "red",
      });
    }
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Pelaporan Risiko</Title>
          <Text size="xs" c="dimmed" mt={4}>
            Laporan terpadu dari proses identifikasi hingga realisasi pemantauan
            risiko untuk proses persetujuan (approval).
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            color="green"
            onClick={handleExportExcel}
          >
            Unduh Excel
          </Button>
        </Group>
      </Group>

      <Card withBorder padding="0" radius="md" style={{ overflowX: "auto" }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          style={{ fontSize: 12, minWidth: 4480, borderCollapse: "collapse" }}
        >
          <Table.Thead>
            {/* Row 1 Headers */}
            <Table.Tr>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 50 }}>
                No
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 180 }}>
                Sasaran
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 180 }}>
                Kegiatan
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 180 }}>
                Proses Bisnis
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 220 }}>
                Risiko
              </Table.Th>
              <Table.Th colSpan={5} style={{ textAlign: "center" }}>
                Identifikasi
              </Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>
                Analisis Risiko Aktual
              </Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center" }}>
                Pengendalian yang Telah Dilaksanakan
              </Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>
                Risiko Residual
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 160 }}>
                Respons Risiko
              </Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>
                Rencana Penanganan Risiko
              </Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>
                Pemantauan Tindak Lanjut Penanganan Risiko
              </Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>
                Risiko Residual Harapan
              </Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center", width: 280 }}>
                Persetujuan (Reporting)
              </Table.Th>
              <Table.Th
                rowSpan={2}
                style={{
                  textAlign: "center",
                  width: 80,
                  minWidth: 80,
                  position: "sticky",
                  right: 0,
                  zIndex: 3,
                  background: "var(--mantine-color-body)",
                  boxShadow: "-3px 0 4px rgba(0,0,0,0.06)",
                }}
              >
                Aksi
              </Table.Th>
            </Table.Tr>
            {/* Row 2 Headers */}
            <Table.Tr>
              <Table.Th style={{ width: 180 }}>Penyebab</Table.Th>
              <Table.Th style={{ width: 180 }}>Dampak</Table.Th>
              <Table.Th style={{ width: 160 }}>Kategori Risiko</Table.Th>
              <Table.Th style={{ width: 160 }}>Area Dampak</Table.Th>
              <Table.Th style={{ width: 160 }}>Sumber Risiko</Table.Th>
              <Table.Th style={{ width: 180 }}>Lvl Kemungkinan</Table.Th>
              <Table.Th style={{ width: 180 }}>Lvl Dampak</Table.Th>
              <Table.Th style={{ width: 120, textAlign: "center" }}>
                Besaran Risiko
              </Table.Th>
              <Table.Th style={{ width: 160, textAlign: "center" }}>
                Level Risiko
              </Table.Th>
              <Table.Th style={{ width: 180 }}>Pengendalian</Table.Th>
              <Table.Th style={{ width: 120 }}>Efektivitas</Table.Th>
              <Table.Th style={{ width: 140 }}>Level Kemungkinan</Table.Th>
              <Table.Th style={{ width: 140 }}>Level Dampak</Table.Th>
              <Table.Th style={{ width: 140 }}>Level Risiko</Table.Th>
              <Table.Th style={{ width: 150, textAlign: "center" }}>
                Besaran Risiko
              </Table.Th>
              <Table.Th style={{ width: 240 }}>Rencana Penanganan</Table.Th>
              <Table.Th style={{ width: 120 }}>Target Waktu</Table.Th>
              <Table.Th style={{ width: 160 }}>Target Output</Table.Th>
              <Table.Th style={{ width: 140 }}>P. Jawab</Table.Th>
              <Table.Th style={{ width: 150 }}>Keterjadian Risiko</Table.Th>
              <Table.Th style={{ width: 130 }}>Waktu Realisasi</Table.Th>
              <Table.Th style={{ width: 180 }}>Output Realisasi</Table.Th>
              <Table.Th style={{ width: 180 }}>Dokumen Pendukung</Table.Th>
              <Table.Th style={{ width: 120 }}>Kemungkinan</Table.Th>
              <Table.Th style={{ width: 120 }}>Dampak</Table.Th>
              <Table.Th style={{ width: 140 }}>Level Risiko</Table.Th>
              <Table.Th style={{ width: 160, textAlign: "center" }}>
                Besaran Residual
              </Table.Th>
              <Table.Th style={{ width: 130, textAlign: "center" }}>
                Persetujuan
              </Table.Th>
              <Table.Th style={{ width: 150 }}>Disetujui Oleh</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {tableRows.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={36}
                  align="center"
                  style={{
                    color: "var(--mantine-color-gray-5)",
                    padding: "20px 0",
                  }}
                >
                  {totalRows === 0
                    ? "Belum ada data risiko teridentifikasi."
                    : "Tidak ada data pada halaman ini."}
                </Table.Td>
              </Table.Tr>
            ) : (
              tableRows.map((row) => (
                <Table.Tr key={row.identId}>
                  <Table.Td align="center">{row.no}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.sasaran || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.kegiatan || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.prosesBisnis || "-")}</Table.Td>
                  <Table.Td style={{ fontWeight: 600 }}>{sanitizeHtml(row.risiko)}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.penyebab || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.dampak || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.kategori || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.areaDampak || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.sumberRisiko || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.kemungkinanAktual)}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.dampakAktual)}</Table.Td>
                  <Table.Td align="center">
                    {row.besaranAktual > 0 ? (
                      <Badge
                        color={getBadgeColor(row.warnaAktual)}
                        variant="filled"
                      >
                        {row.besaranAktual}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    {row.besaranAktual > 0 ? (
                      <Badge
                        color={getBadgeColor(row.warnaAktual)}
                        variant="filled"
                      >
                        ({row.levelAktual})
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>{row.pengendalian || "-"}</Table.Td>
                  <Table.Td>{row.efektivitas || "-"}</Table.Td>
                  <Table.Td>{row.kemungkinanResidual}</Table.Td>
                  <Table.Td>{row.dampakResidual}</Table.Td>
                  <Table.Td>{row.levelResidual || "-"}</Table.Td>
                  <Table.Td align="center">
                    {row.besaranResidual > 0 ? (
                      <Badge
                        color={getBadgeColor(row.warnaResidual)}
                        variant="filled"
                      >
                        {row.besaranResidual}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    <Badge
                      color={
                        row.respon === "Mengurangi Risiko" ? "orange" : "teal"
                      }
                      variant="light"
                      styles={{
                        root: {
                          maxWidth: "100%",
                          height: "auto",
                          paddingTop: 3,
                          paddingBottom: 3,
                        },
                        label: {
                          whiteSpace: "normal",
                          overflow: "visible",
                          textOverflow: "clip",
                          lineHeight: 1.3,
                        },
                      }}
                    >
                      {row.respon}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.rencanaPenanganan || "-"}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.targetWaktu || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.targetOutput || "-")}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.penanggungJawab || "-")}</Table.Td>
                  <Table.Td align="center">
                    {row.keterjadiRisiko ? (
                      <Badge
                        color={
                          row.keterjadiRisiko === "Terjadi" ? "red" : "green"
                        }
                        variant="light"
                      >
                        {sanitizeHtml(row.keterjadiRisiko)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    {sanitizeHtml(row.realisasiWaktu || "-")}
                  </Table.Td>
                  <Table.Td>{sanitizeHtml(row.realisasiOutput || "-")}</Table.Td>
                  <Table.Td>
                    {row.dokumenPendukung ? (
                      <Group gap="xs">
                        <IconFileText size={14} />
                        <Text
                          component="a"
                          href={
                            row.dokumenPendukung.startsWith("/uploads/")
                              ? row.dokumenPendukung.replace(
                                  "/uploads/",
                                  "/api/uploads/"
                                )
                              : row.dokumenPendukung
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                          c="blue"
                          style={{
                            textDecoration: "underline",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          Dokumen
                          <IconExternalLink size={10} />
                        </Text>
                      </Group>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>{sanitizeHtml(row.kemungkinanResidual)}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.dampakResidual)}</Table.Td>
                  <Table.Td>{sanitizeHtml(row.levelResidual || "-")}</Table.Td>
                  <Table.Td align="center">
                    {row.besaranResidual > 0 ? (
                      <Badge
                        color={getBadgeColor(row.warnaResidual)}
                        variant="filled"
                      >
                        {row.besaranResidual}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    <Badge
                      color={
                        row.persetujuan === "Disetujui"
                          ? "green"
                          : row.persetujuan === "Ditolak"
                          ? "red"
                          : "gray"
                      }
                      variant="filled"
                    >
                      {row.persetujuan}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.disetujuiOleh || "-"}</Table.Td>
                  <Table.Td
                    align="center"
                    style={{
                      position: "sticky",
                      right: 0,
                      zIndex: 2,
                      background: "var(--mantine-color-body)",
                      boxShadow: "-3px 0 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => openApprovalModal(row)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {totalRows > 0 && (
        <Pagination
          current={currentPage}
          total={totalRows}
          pageSize={pageSize}
          onChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          showSizeChanger
          showTotal
        />
      )}

      {/* Approval Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Persetujuan & Pelaporan Risiko"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          {selectedRow && (
            <Card withBorder padding="xs" bg="var(--mantine-color-gray-0)">
              <Text size="xs" fw={700} c="dimmed">
                RISIKO:
              </Text>
              <Text size="xs" fw={600} mt={2}>
                {selectedRow.risiko}
              </Text>
            </Card>
          )}

          <Select
            label="Persetujuan"
            value={modalPersetujuan}
            onChange={(val) => setModalPersetujuan(val ?? "Draft")}
            data={[
              { value: "Draft", label: "Draft" },
              { value: "Disetujui", label: "Disetujui" },
              { value: "Ditolak", label: "Ditolak" },
            ]}
          />

          <TextInput
            label="Disetujui Oleh"
            placeholder="Nama Pejabat / Approver"
            value={modalDisetujuiOleh}
            onChange={(e) => setModalDisetujuiOleh(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveModal}>Simpan Pelaporan</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
