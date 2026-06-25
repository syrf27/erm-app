"use client";

import { useEffect, useState, useMemo } from "react";
import ExcelJS from "exceljs";
import { useList } from "@refinedev/core";
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
import { IconPencil, IconCheck, IconX, IconFileText, IconExternalLink, IconDownload } from "@tabler/icons-react";
import { Pagination } from "@/components/pagination";

interface ReportRow {
  identId: number;
  rencanaId: number | null;
  no: number;
  
  // Identifikasi
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
  realisasiWaktu: string;
  realisasiOutput: string;
  dokumenPendukung: string;

  // Pelaporan (Persetujuan)
  persetujuan: string;
  disetujuiOleh: string;
  
  // Additional fields for Excel
  satuan?: string;
  tim?: string;
  prosesBisnis?: string;
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

  // Form State
  const [modalPersetujuan, setModalPersetujuan] = useState("");
  const [modalDisetujuiOleh, setModalDisetujuiOleh] = useState("");

  const identResult = useList({ resource: "identifikasi-risiko", pagination: { mode: "off" } });
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { mode: "off" } });
  const evaluasiResult = useList({ resource: "evaluasi-risiko", pagination: { mode: "off" } });
  const rencanaResult = useList({ resource: "rencana-penanganan", pagination: { mode: "off" } });
  const lkResult = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const ldResult = useList({ resource: "level-dampak", pagination: { mode: "off" } });
  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { mode: "off" } });

  const loading =
    identResult.query.isPending ||
    analisisResult.query.isPending ||
    evaluasiResult.query.isPending ||
    rencanaResult.query.isPending ||
    lkResult.query.isPending ||
    ldResult.query.isPending ||
    matriksResult.query.isPending;

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const evaluasiData = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const rencanaData = useMemo(() => rencanaResult.result?.data ?? [], [rencanaResult.result?.data]);
  const lkData = useMemo(() => lkResult.result?.data ?? [], [lkResult.result?.data]);
  const ldData = useMemo(() => ldResult.result?.data ?? [], [ldResult.result?.data]);
  const matriksData = useMemo(() => matriksResult.result?.data ?? [], [matriksResult.result?.data]);
  const refetchQuery = rencanaResult.query?.refetch;

  // Compile all data rows
  const allRows = useMemo((): ReportRow[] => {
    if (loading) return [];

    const lkById = new Map(lkData.map((lk: any) => [lk.id, lk]));
    const ldById = new Map(ldData.map((ld: any) => [ld.id, ld]));
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    const evaluasiById = new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e]));
    const rencanaById = new Map(rencanaData.map((r: any) => [r.identifikasiRisikoId, r]));

    return identifikasiData.map((r: Record<string, any>, index): ReportRow => {
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
          (m: any) => m.levelKemungkinanId === lkAktual.id && m.levelDampakId === ldAktual.id
        );
        bAktual = matchMatriks?.besaran ?? (lkAktual.skala * ldAktual.skala);
        levAktual = matchMatriks?.levelRisiko?.nama ?? "Sedang";
        wAktual = matchMatriks?.levelRisiko?.warna ?? "Kuning";
      }

      let bResidual = 0;
      let levResidual = "-";
      let wResidual = "gray";

      if (lkResidual && ldResidual) {
        const matchMatriks = matriksData.find(
          (m: any) => m.levelKemungkinanId === lkResidual.id && m.levelDampakId === ldResidual.id
        );
        bResidual = matchMatriks?.besaran ?? (lkResidual.skala * ldResidual.skala);
        levResidual = matchMatriks?.levelRisiko?.nama ?? "Rendah";
        wResidual = matchMatriks?.levelRisiko?.warna ?? "Hijau";
      }

      return {
        identId: r.id,
        rencanaId: rp?.id ?? null,
        no: index + 1,
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
        respon: ev?.responRisiko ?? "Menerima Risiko",
        rencanaPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        penanggungJawab: rp?.penanggungJawab ?? "",
        kemungkinanResidual: lkResidual?.nama ?? "-",
        dampakResidual: ldResidual?.nama ?? "-",
        besaranResidual: bResidual,
        levelResidual: levResidual,
        warnaResidual: wResidual,
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        dokumenPendukung: rp?.dokumenPendukung ?? "",
        persetujuan: rp?.persetujuan ?? "Draft",
        disetujuiOleh: rp?.disetujuiOleh ?? "",
        satuan: r.sasaran?.nama ?? "",
        tim: r.tim ?? "",
        prosesBisnis: r.prosesBisnis?.nama ?? "",
        kategori: r.kategoriRisiko?.nama ?? "",
        areaDampak: r.areaDampak?.nama ?? "",
        sumberRisiko: r.sumberRisiko?.nama ?? "",
        prioritas: bAktual,
      };
    });
  }, [loading, identifikasiData, analisisData, evaluasiData, rencanaData, lkData, ldData, matriksData]);

  // Paginate rows
  const totalRows = allRows.length;
  const tableRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allRows.slice(start, end).map((row, idx) => ({ ...row, no: start + idx + 1 }));
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

  const handleSaveModal = async () => {
    if (!selectedRow) return;

    const payload = {
      persetujuan: modalPersetujuan || null,
      disetujuiOleh: modalDisetujuiOleh || null,
    };

    try {
      if (selectedRow.rencanaId === null) {
        // Create new penanganan record to store approval
        const res = await fetch("/api/rencana-penanganan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, identifikasiRisikoId: selectedRow.identId }),
        });
        if (!res.ok) throw new Error("Gagal menyimpan persetujuan");
      } else {
        // Update existing penanganan record
        const res = await fetch(`/api/rencana-penanganan/${selectedRow.rencanaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal memperbarui persetujuan");
      }

      notifications.show({ title: "Tersimpan", message: "Persetujuan berhasil disimpan", color: "green" });
      setModalOpened(false);
      if (refetchQuery) refetchQuery();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal menyimpan persetujuan", color: "red" });
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
      worksheet.mergeCells("A1:V1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "LAPORAN PELAPORAN RISIKO";
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "1F2937" } };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      worksheet.getRow(1).height = 35;

      // Subtitle/Meta Info
      worksheet.mergeCells("A2:V2");
      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = `Tanggal Unduh: ${new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })}`;
      subtitleCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "4B5563" } };
      subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
      worksheet.getRow(2).height = 20;

      // Setup columns array (just to map width keys and default sizes)
      worksheet.columns = [
        { header: "", key: "no", width: 8 },
        { header: "", key: "risiko", width: 30 },
        { header: "", key: "penyebab", width: 25 },
        { header: "", key: "dampak", width: 25 },
        { header: "", key: "kemungkinanAktual", width: 18 },
        { header: "", key: "dampakAktual", width: 18 },
        { header: "", key: "besaranAktual", width: 20 },
        { header: "", key: "pengendalian", width: 30 },
        { header: "", key: "efektivitas", width: 18 },
        { header: "", key: "respon", width: 20 },
        { header: "", key: "rencanaPenanganan", width: 30 },
        { header: "", key: "targetWaktu", width: 15 },
        { header: "", key: "targetOutput", width: 25 },
        { header: "", key: "penanggungJawab", width: 20 },
        { header: "", key: "kemungkinanResidual", width: 18 },
        { header: "", key: "dampakResidual", width: 18 },
        { header: "", key: "besaranResidual", width: 20 },
        { header: "", key: "realisasiWaktu", width: 15 },
        { header: "", key: "realisasiOutput", width: 25 },
        { header: "", key: "dokumenPendukung", width: 25 },
        { header: "", key: "persetujuan", width: 18 },
        { header: "", key: "disetujuiOleh", width: 20 },
      ];

      // Define header structure
      const headerRow1 = [
        "No", // A
        "Risiko", // B
        "Identifikasi", "", // C, D
        "Analisis Risiko Aktual", "", "", "", "", // E, F, G, H, I
        "Evaluasi (Respon)", // J
        "Rencana Tindak Penanganan (RTP)", "", "", "", // K, L, M, N
        "Risiko Residual Harapan", "", "", // O, P, Q
        "Realisasi Pemantauan", "", "", // R, S, T
        "Persetujuan (Reporting)", "" // U, V
      ];

      const headerRow2 = [
        "", // A
        "", // B
        "Penyebab", // C
        "Dampak", // D
        "Kemungkinan", // E
        "Dampak", // F
        "Besaran Aktual", // G
        "Pengendalian", // H
        "Efektivitas", // I
        "", // J
        "Rencana Penanganan", // K
        "Target Waktu", // L
        "Target Output", // M
        "P. Jawab", // N
        "Kemungkinan", // O
        "Dampak", // P
        "Besaran Residual", // Q
        "Waktu Realisasi", // R
        "Output Realisasi", // S
        "Dokumen Pendukung", // T
        "Persetujuan", // U
        "Disetujui Oleh" // V
      ];

      // Add headers
      worksheet.getRow(4).values = headerRow1;
      worksheet.getRow(5).values = headerRow2;

      // Merge header cells
      worksheet.mergeCells("A4:A5"); // No
      worksheet.mergeCells("B4:B5"); // Risiko
      worksheet.mergeCells("C4:D4"); // Identifikasi
      worksheet.mergeCells("E4:I4"); // Analisis Risiko Aktual
      worksheet.mergeCells("J4:J5"); // Evaluasi (Respon)
      worksheet.mergeCells("K4:N4"); // Rencana Tindak Penanganan (RTP)
      worksheet.mergeCells("O4:Q4"); // Risiko Residual Harapan
      worksheet.mergeCells("R4:T4"); // Realisasi Pemantauan
      worksheet.mergeCells("U4:V4"); // Persetujuan (Reporting)

      // Format headers
      const headerFont = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "374151" } // gray-700
      };
      const headerBorder = {
        top: { style: "thin", color: { argb: "4B5563" } },
        left: { style: "thin", color: { argb: "4B5563" } },
        bottom: { style: "thin", color: { argb: "4B5563" } },
        right: { style: "thin", color: { argb: "4B5563" } }
      };

      for (let r = 4; r <= 5; r++) {
        const row = worksheet.getRow(r);
        row.height = 25;
        row.eachCell((cell: any) => {
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.border = headerBorder;
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        });
      }

      // Add data rows
      allRows.forEach((row, index) => {
        const dataRow = worksheet.addRow({
          no: index + 1,
          risiko: row.risiko,
          penyebab: row.penyebab || "-",
          dampak: row.dampak || "-",
          kemungkinanAktual: row.kemungkinanAktual,
          dampakAktual: row.dampakAktual,
          besaranAktual: row.besaranAktual > 0 ? `${row.besaranAktual} (${row.levelAktual})` : "-",
          pengendalian: row.pengendalian || "-",
          efektivitas: row.efektivitas || "-",
          respon: row.respon,
          rencanaPenanganan: row.rencanaPenanganan || "-",
          targetWaktu: row.targetWaktu || "-",
          targetOutput: row.targetOutput || "-",
          penanggungJawab: row.penanggungJawab || "-",
          kemungkinanResidual: row.kemungkinanResidual,
          dampakResidual: row.dampakResidual,
          besaranResidual: row.besaranResidual > 0 ? `${row.besaranResidual} (${row.levelResidual})` : "-",
          realisasiWaktu: row.realisasiWaktu || "-",
          realisasiOutput: row.realisasiOutput || "-",
          dokumenPendukung: row.dokumenPendukung ? "Ada Dokumen" : "-",
          persetujuan: row.persetujuan,
          disetujuiOleh: row.disetujuiOleh || "-"
        });

        dataRow.height = 22;

        // Cell borders and alignments
        dataRow.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
          cell.border = {
            top: { style: "thin", color: { argb: "E5E7EB" } },
            left: { style: "thin", color: { argb: "E5E7EB" } },
            bottom: { style: "thin", color: { argb: "E5E7EB" } },
            right: { style: "thin", color: { argb: "E5E7EB" } }
          };
          cell.font = { name: "Arial", size: 10 };

          // Alignment adjustments
          if ([1, 5, 6, 7, 9, 10, 12, 15, 16, 17, 18, 20, 21].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }
        });

        // Color coding for Besaran Aktual (Col 7 / G)
        if (row.besaranAktual > 0) {
          const cellG = dataRow.getCell(7);
          const colorObj = getExcelBadgeColor(row.warnaAktual);
          cellG.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorObj.bg }
          };
          cellG.font = { name: "Arial", size: 10, bold: true, color: { argb: colorObj.text } };
        }

        // Color coding for Besaran Residual (Col 17 / Q)
        if (row.besaranResidual > 0) {
          const cellQ = dataRow.getCell(17);
          const colorObj = getExcelBadgeColor(row.warnaResidual);
          cellQ.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: colorObj.bg }
          };
          cellQ.font = { name: "Arial", size: 10, bold: true, color: { argb: colorObj.text } };
        }

        // Color coding for Evaluasi (Respon) (Col 10 / J)
        const cellJ = dataRow.getCell(10);
        if (row.respon === "Mengurangi Risiko") {
          cellJ.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } }; // light yellow
          cellJ.font = { name: "Arial", size: 10, color: { argb: "D97706" } };
        } else {
          cellJ.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "ECFDF5" } }; // light green/teal
          cellJ.font = { name: "Arial", size: 10, color: { argb: "059669" } };
        }

        // Color coding for Persetujuan (Col 21 / U)
        const cellU = dataRow.getCell(21);
        if (row.persetujuan === "Disetujui") {
          cellU.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DEF7EC" } };
          cellU.font = { name: "Arial", size: 10, bold: true, color: { argb: "03543F" } };
        } else if (row.persetujuan === "Ditolak") {
          cellU.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FDE8E8" } };
          cellU.font = { name: "Arial", size: 10, bold: true, color: { argb: "9B1C1C" } };
        } else {
          cellU.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F3F4F6" } };
          cellU.font = { name: "Arial", size: 10, color: { argb: "4B5563" } };
        }
      });

      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Pelaporan_Risiko_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
            Laporan terpadu dari proses identifikasi hingga realisasi pemantauan risiko untuk proses persetujuan (approval).
          </Text>
        </div>
        <Button
          leftSection={<IconDownload size={16} />}
          variant="light"
          color="green"
          onClick={handleExportExcel}
        >
          Unduh Excel
        </Button>
      </Group>

      <Card withBorder padding="0" radius="md" style={{ overflowX: "auto" }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          style={{ fontSize: 12, minWidth: 2600, borderCollapse: "collapse" }}
        >
          <Table.Thead>
            {/* Row 1 Headers */}
            <Table.Tr>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 50 }}>No</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 220 }}>Risiko</Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center" }}>Identifikasi</Table.Th>
              <Table.Th colSpan={5} style={{ textAlign: "center" }}>Analisis Risiko Aktual</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 160 }}>Evaluasi (Respon)</Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>Rencana Tindak Penanganan (RTP)</Table.Th>
              <Table.Th colSpan={3} style={{ textAlign: "center" }}>Risiko Residual Harapan</Table.Th>
              <Table.Th colSpan={3} style={{ textAlign: "center" }}>Realisasi Pemantauan</Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center", width: 280 }}>Persetujuan (Reporting)</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 60 }}>Aksi</Table.Th>
            </Table.Tr>
            {/* Row 2 Headers */}
            <Table.Tr>
              <Table.Th style={{ width: 180 }}>Penyebab</Table.Th>
              <Table.Th style={{ width: 180 }}>Dampak</Table.Th>
              <Table.Th style={{ width: 120 }}>Kemungkinan</Table.Th>
              <Table.Th style={{ width: 120 }}>Dampak</Table.Th>
              <Table.Th style={{ width: 160, textAlign: "center" }}>Besaran Aktual</Table.Th>
              <Table.Th style={{ width: 180 }}>Pengendalian</Table.Th>
              <Table.Th style={{ width: 120 }}>Efektivitas</Table.Th>
              <Table.Th style={{ width: 240 }}>Rencana Penanganan</Table.Th>
              <Table.Th style={{ width: 120 }}>Target Waktu</Table.Th>
              <Table.Th style={{ width: 160 }}>Target Output</Table.Th>
              <Table.Th style={{ width: 140 }}>P. Jawab</Table.Th>
              <Table.Th style={{ width: 120 }}>Kemungkinan</Table.Th>
              <Table.Th style={{ width: 120 }}>Dampak</Table.Th>
              <Table.Th style={{ width: 160, textAlign: "center" }}>Besaran Residual</Table.Th>
              <Table.Th style={{ width: 130 }}>Waktu Realisasi</Table.Th>
              <Table.Th style={{ width: 180 }}>Output Realisasi</Table.Th>
              <Table.Th style={{ width: 180 }}>Dokumen Pendukung</Table.Th>
              <Table.Th style={{ width: 130, textAlign: "center" }}>Persetujuan</Table.Th>
              <Table.Th style={{ width: 150 }}>Disetujui Oleh</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {tableRows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={24} align="center" style={{ color: "var(--mantine-color-gray-5)", padding: "20px 0" }}>
                  {totalRows === 0 
                    ? 'Belum ada data risiko teridentifikasi.'
                    : 'Tidak ada data pada halaman ini.'}
                </Table.Td>
              </Table.Tr>
            ) : (
              tableRows.map((row) => (
                <Table.Tr key={row.identId}>
                  <Table.Td align="center">{row.no}</Table.Td>
                  <Table.Td style={{ fontWeight: 600 }}>{row.risiko}</Table.Td>
                  <Table.Td>{row.penyebab || "-"}</Table.Td>
                  <Table.Td>{row.dampak || "-"}</Table.Td>
                  <Table.Td>{row.kemungkinanAktual}</Table.Td>
                  <Table.Td>{row.dampakAktual}</Table.Td>
                  <Table.Td align="center">
                    {row.besaranAktual > 0 ? (
                      <Badge color={getBadgeColor(row.warnaAktual)} variant="filled">
                        {row.besaranAktual} ({row.levelAktual})
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td>{row.pengendalian || "-"}</Table.Td>
                  <Table.Td>{row.efektivitas || "-"}</Table.Td>
                  <Table.Td align="center">
                    <Badge color={row.respon === "Mengurangi Risiko" ? "orange" : "teal"} variant="light">
                      {row.respon}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.rencanaPenanganan || "-"}</Table.Td>
                  <Table.Td align="center">{row.targetWaktu || "-"}</Table.Td>
                  <Table.Td>{row.targetOutput || "-"}</Table.Td>
                  <Table.Td>{row.penanggungJawab || "-"}</Table.Td>
                  <Table.Td>{row.kemungkinanResidual}</Table.Td>
                  <Table.Td>{row.dampakResidual}</Table.Td>
                  <Table.Td align="center">
                    {row.besaranResidual > 0 ? (
                      <Badge color={getBadgeColor(row.warnaResidual)} variant="filled">
                        {row.besaranResidual} ({row.levelResidual})
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">{row.realisasiWaktu || "-"}</Table.Td>
                  <Table.Td>{row.realisasiOutput || "-"}</Table.Td>
                  <Table.Td>
                    {row.dokumenPendukung ? (
                      <Group gap="xs">
                        <IconFileText size={14} />
                        <Text
                          component="a"
                          href={row.dokumenPendukung.startsWith("/uploads/") ? row.dokumenPendukung.replace("/uploads/", "/api/uploads/") : row.dokumenPendukung}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                          c="blue"
                          style={{ textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                        >
                          Dokumen
                          <IconExternalLink size={10} />
                        </Text>
                      </Group>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    <Badge color={row.persetujuan === "Disetujui" ? "green" : row.persetujuan === "Ditolak" ? "red" : "gray"} variant="filled">
                      {row.persetujuan}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.disetujuiOleh || "-"}</Table.Td>
                  <Table.Td align="center">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openApprovalModal(row)}>
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
              <Text size="xs" fw={700} c="dimmed">RISIKO:</Text>
              <Text size="xs" fw={600} mt={2}>{selectedRow.risiko}</Text>
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
            <Button onClick={handleSaveModal}>
              Simpan Pelaporan
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}