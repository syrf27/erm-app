"use client";

import { useList } from "@refinedev/core";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Title,
  Loader,
  Center,
  Stack,
  Text,
  Grid,
  Card,
  Group,
  Table,
  Button,
  Badge,
  TextInput,
  Pagination,
  ScrollArea,
  Alert,
  SegmentedControl,
  Select,
  Box,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

interface RiskData {
  id: number;
  risiko: string;
  penyebab: string;
  dampak: string;
  aktual: {
    kemungkinan: string;
    kemungkinanSkala: number;
    dampak: string;
    dampakSkala: number;
    besaran: number | null;
    level: string;
    warna: string;
  } | null;
  residual: {
    kemungkinan: string;
    kemungkinanSkala: number;
    dampak: string;
    dampakSkala: number;
    besaran: number | null;
    level: string;
    warna: string;
  } | null;
}

export default function MatriksRisikoPage() {
  const [selectedRiskIds, setSelectedRiskIds] = useState<number[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 5;

  // Fetch all configuration and transaction data
  const identQuery = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 10000 } });
  const analisisQuery = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });
  const evaluasiQuery = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 10000 } });
  const lkQuery = useList({ resource: "level-kemungkinan", pagination: { pageSize: 100 } });
  const ldQuery = useList({ resource: "level-dampak", pagination: { pageSize: 100 } });
  const matriksQuery = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 100 } });

  const loading =
    identQuery.query.isPending ||
    analisisQuery.query.isPending ||
    evaluasiQuery.query.isPending ||
    lkQuery.query.isPending ||
    ldQuery.query.isPending ||
    matriksQuery.query.isPending;

  const identData = useMemo(() => identQuery.result?.data ?? [], [identQuery.result?.data]);
  const analisisData = useMemo(() => analisisQuery.result?.data ?? [], [analisisQuery.result?.data]);
  const evaluasiData = useMemo(() => evaluasiQuery.result?.data ?? [], [evaluasiQuery.result?.data]);
  const lkData = useMemo(() => lkQuery.result?.data ?? [], [lkQuery.result?.data]);
  const ldData = useMemo(() => ldQuery.result?.data ?? [], [ldQuery.result?.data]);
  const matriksData = useMemo(() => matriksQuery.result?.data ?? [], [matriksQuery.result?.data]);

  const now = new Date();
  const [matrixMode, setMatrixMode] = useState<"current" | "history">("current");
  const [histTahun, setHistTahun] = useState(now.getFullYear());
  const [histTriwulan, setHistTriwulan] = useState(
    Math.ceil((now.getMonth() + 1) / 3)
  );
  const [histData, setHistData] = useState<any>(null);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (matrixMode !== "history") return;
    let cancelled = false;
    const loadHistory = async () => {
      setHistLoading(true);
      try {
        const res = await fetch(
          `/api/matriks-historis?tahun=${histTahun}&triwulan=${histTriwulan}`
        );
        const payload = await res.json().catch(() => ({}));
        if (!cancelled) setHistData(res.ok ? payload : null);
      } finally {
        if (!cancelled) setHistLoading(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [matrixMode, histTahun, histTriwulan]);

  // Combine and map data
  const processedRisks = useMemo((): RiskData[] => {
    if (loading) return [];

    return identData.map((item: any) => {
      const analisis = analisisData.find((a: any) => a.identifikasiRisikoId === item.id);
      // Residual risk is determined during Evaluasi Risiko. Rencana
      // Penanganan is a follow-up action and may not duplicate those fields.
      const evaluasi = evaluasiData.find((e: any) => e.identifikasiRisikoId === item.id);

      // Find likelihood & impact scales for aktual
      const lkAktual = lkData.find((lk: any) => lk.id === analisis?.levelKemungkinanId);
      const ldAktual = ldData.find((ld: any) => ld.id === analisis?.levelDampakId);

      // Find likelihood & impact scales for residual
      const lkResidual = lkData.find((lk: any) => lk.id === evaluasi?.residualLevelKemungkinanId);
      const ldResidual = ldData.find((ld: any) => ld.id === evaluasi?.residualLevelDampakId);

      let aktual = null;
      if (lkAktual && ldAktual) {
        const matchMatriks = matriksData.find(
          (m: any) => m.levelKemungkinanId === lkAktual.id && m.levelDampakId === ldAktual.id
        );
        aktual = {
          kemungkinan: lkAktual.nama,
          kemungkinanSkala: lkAktual.skala,
          dampak: ldAktual.nama,
          dampakSkala: ldAktual.skala,
          besaran: matchMatriks?.besaran ?? null,
          level: matchMatriks?.levelRisiko?.nama ?? "Belum dapat dihitung",
          warna: matchMatriks?.levelRisiko?.warna ?? "gray",
        };
      }

      let residual = null;
      if (lkResidual && ldResidual) {
        const matchMatriks = matriksData.find(
          (m: any) => m.levelKemungkinanId === lkResidual.id && m.levelDampakId === ldResidual.id
        );
        residual = {
          kemungkinan: lkResidual.nama,
          kemungkinanSkala: lkResidual.skala,
          dampak: ldResidual.nama,
          dampakSkala: ldResidual.skala,
          besaran: matchMatriks?.besaran ?? null,
          level: matchMatriks?.levelRisiko?.nama ?? "Belum dapat dihitung",
          warna: matchMatriks?.levelRisiko?.warna ?? "gray",
        };
      }

      return {
        id: item.id,
        risiko: item.risiko,
        penyebab: item.penyebab ?? "",
        dampak: item.dampak ?? "",
        aktual,
        residual,
      };
    });
  }, [loading, identData, analisisData, evaluasiData, lkData, ldData, matriksData]);

  // Filter and Paginate the list
  const filteredRisks = useMemo(() => {
    if (!processedRisks) return [];
    return processedRisks.filter((r) =>
      r.risiko.toLowerCase().includes(searchVal.toLowerCase()) ||
      r.penyebab.toLowerCase().includes(searchVal.toLowerCase())
    );
  }, [processedRisks, searchVal]);

  const paginatedRisks = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredRisks.slice(start, end);
  }, [filteredRisks, page, pageSize]);

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    setPage(1);
  };

  // Set default selected risk only once on initial load; allow empty selection afterwards
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!hasAutoSelectedRef.current && processedRisks.length > 0 && selectedRiskIds.length === 0) {
      const firstValid = processedRisks.find((r) => r.aktual && r.residual);
      if (firstValid) {
        setSelectedRiskIds([firstValid.id]);
      } else {
        setSelectedRiskIds([processedRisks[0].id]);
      }
      hasAutoSelectedRef.current = true;
    }
  }, [processedRisks, selectedRiskIds]);

  const selectedRisks = useMemo(() => {
    return processedRisks.filter((r) => selectedRiskIds.includes(r.id));
  }, [processedRisks, selectedRiskIds]);

  const toggleRiskSelection = (id: number) => {
    setSelectedRiskIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const exportMatrixAsImage = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const scale = 2;
      const cellSize = 90;
      const left = 170;
      const top = 110;
      const canvas = document.createElement("canvas");
      canvas.width = 900 * scale;
      canvas.height = 650 * scale;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(scale, scale);
      context.fillStyle = getComputedStyle(document.body).backgroundColor || "#ffffff";
      context.fillRect(0, 0, 900, 650);
      context.fillStyle = getComputedStyle(document.body).color || "#1f2937";
      context.font = "700 20px sans-serif";
      context.fillText("MATRIKS ANALISIS RISIKO GABUNGAN", 24, 38);
      context.font = "13px sans-serif";
      context.fillText("Aktual dan residual risiko", 24, 62);

      context.textAlign = "center";
      context.font = "700 12px sans-serif";
      xAxisItems.forEach((item, index) => {
        context.fillText(String(item.skala), left + index * cellSize + cellSize / 2, top - 34);
        context.font = "11px sans-serif";
        context.fillText(item.label, left + index * cellSize + cellSize / 2, top - 14);
        context.font = "700 12px sans-serif";
      });
      yAxisItems.forEach((item, index) => {
        const y = top + index * cellSize + cellSize / 2;
        context.textAlign = "right";
        context.fillText(`${item.skala} ${item.label}`, left - 12, y + 4);
        context.textAlign = "center";
      });

      gridCells.forEach((cell, index) => {
        const x = left + (index % 5) * cellSize;
        const y = top + Math.floor(index / 5) * cellSize;
        context.fillStyle = getColorHex(cell.warna);
        context.fillRect(x, y, cellSize, cellSize);
        context.strokeStyle = "rgba(0,0,0,.35)";
        context.strokeRect(x, y, cellSize, cellSize);
        context.fillStyle = "#ffffff";
        context.font = "700 20px sans-serif";
        context.fillText(cell.besaran == null ? "–" : String(cell.besaran), x + cellSize / 2, y + cellSize / 2 + 7);
      });

      selectedRisks.forEach((risk, index) => {
        if (!risk.aktual || !risk.residual) return;
        const color = ["#e03131", "#228be6", "#7950f2", "#fab005", "#15aabf"][index % 5];
        const startX = left + (risk.aktual.dampakSkala - 1) * cellSize + cellSize / 2;
        const startY = top + (5 - risk.aktual.kemungkinanSkala) * cellSize + cellSize / 2;
        const endX = left + (risk.residual.dampakSkala - 1) * cellSize + cellSize / 2;
        const endY = top + (5 - risk.residual.kemungkinanSkala) * cellSize + cellSize / 2;
        context.strokeStyle = color;
        context.fillStyle = color;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
        context.beginPath();
        context.arc(startX, startY, 18, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.arc(endX, endY, 18, 0, Math.PI * 2);
        context.stroke();
        context.font = "700 10px sans-serif";
        context.fillText(String(risk.id), startX, startY + 4);
        context.fillText(String(risk.id), endX, endY + 4);
      });

      context.textAlign = "left";
      context.fillStyle = getComputedStyle(document.body).color || "#1f2937";
      context.font = "700 15px sans-serif";
      context.fillText("Risiko dipilih", 650, 120);
      context.font = "12px sans-serif";
      selectedRisks.slice(0, 8).forEach((risk, index) => {
        const y = 150 + index * 52;
        context.fillText(`${index + 1}. ${risk.risiko.slice(0, 34)}`, 650, y);
        context.fillText(`Aktual: ${risk.aktual?.besaran ?? "Belum dapat dihitung"}   Residual: ${risk.residual?.besaran ?? "Belum dapat dihitung"}`, 665, y + 20);
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `matriks-risiko-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export risk matrix image", error);
    } finally {
      setExporting(false);
    }
  };

  // Map color names to Hex
  const getColorHex = (warna: string) => {
    switch (warna?.toLowerCase()) {
      case "biru":
      case "blue":
        return "#4285F4"; // Elegant Blue
      case "hijau":
      case "green":
        return "#5EA246"; // Elegant Green
      case "kuning":
      case "yellow":
        return "#F4E022"; // Elegant Yellow
      case "jingga":
      case "oranye":
      case "orange":
        return "#F58220"; // Elegant Orange
      case "merah":
      case "red":
        return "#D81515"; // Elegant Red
      default:
        return "#e9ecef";
    }
  };

  // Generate matrix cells
  const gridCells = useMemo(() => {
    const cells: {
      kSkala: number;
      dSkala: number;
      besaran: number | null;
      warna: string;
    }[] = [];
    for (let k = 5; k >= 1; k--) {
      for (let d = 1; d <= 5; d++) {
        const lk = lkData.find((item: any) => item.skala === k);
        const ld = ldData.find((item: any) => item.skala === d);
        const match = lk && ld
          ? matriksData.find(
              (m: any) =>
                m.levelKemungkinanId === lk.id && m.levelDampakId === ld.id
            )
          : null;

        cells.push({
          kSkala: k,
          dSkala: d,
          besaran: match?.besaran ?? null,
          warna: match?.levelRisiko?.warna ?? "gray",
        });
      }
    }
    return cells;
  }, [lkData, ldData, matriksData]);

  // Calculate coordinates for all selected transition arrows
  const transitionArrows = useMemo(() => {
    return selectedRisks.map((risk, index) => {
      if (!risk.aktual || !risk.residual) return null;

      const Ka = risk.aktual.kemungkinanSkala;
      const Da = risk.aktual.dampakSkala;
      const Kr = risk.residual.kemungkinanSkala;
      const Dr = risk.residual.dampakSkala;

      const x1 = (Da - 1) * 100 + 50;
      const y1 = (5 - Ka) * 100 + 50;
      const x2 = (Dr - 1) * 100 + 50;
      const y2 = (5 - Kr) * 100 + 50;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);

      const x1_s = len > 0 ? x1 + (dx / len) * 22 : x1;
      const y1_s = len > 0 ? y1 + (dy / len) * 22 : y1;
      const x2_s = len > 0 ? x2 - (dx / len) * 26 : x2;
      const y2_s = len > 0 ? y2 - (dy / len) * 26 : y2;

      // Clean, bright colors for overlays
      const colors = ["#e03131", "#228be6", "#7950f2", "#fab005", "#15aabf", "#e64980", "#40c057"];
      const color = colors[index % colors.length];

      return {
        id: risk.id,
        color,
        x1, y1, x2, y2, x1_s, y1_s, x2_s, y2_s,
        isSame: len === 0
      };
    }).filter(Boolean) as {
      id: number;
      color: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x1_s: number;
      y1_s: number;
      x2_s: number;
      y2_s: number;
      isSame: boolean;
    }[];
  }, [selectedRisks]);

  if (matrixMode === "history") {
    const config = histData?.konfigurasi;
    const snapMatrix: any[] = Array.isArray(config?.matriks) ? config.matriks : [];
    const snapLk: any[] = Array.isArray(config?.levelKemungkinan)
      ? config.levelKemungkinan
      : [];
    const snapLd: any[] = Array.isArray(config?.levelDampak)
      ? config.levelDampak
      : [];
    const snapLr: any[] = Array.isArray(config?.levelRisiko)
      ? config.levelRisiko
      : [];
    const levelRisikoById = new Map(snapLr.map((item: any) => [item.id, item]));
    const lkBySkala = new Map(snapLk.map((item: any) => [item.skala, item]));
    const ldBySkala = new Map(snapLd.map((item: any) => [item.skala, item]));
    const cellByPair = new Map(
      snapMatrix.map((item: any) => [
        `${item.levelKemungkinanId}:${item.levelDampakId}`,
        item,
      ])
    );

    const histRows: any[] = histData?.rows ?? [];
    const pointsByCell = new Map<string, any[]>();
    for (const row of histRows) {
      if (!row.kemungkinanSkala || !row.dampakSkala) continue;
      const key = `${row.kemungkinanSkala}:${row.dampakSkala}`;
      const list = pointsByCell.get(key) ?? [];
      list.push(row);
      pointsByCell.set(key, list);
    }

    return (
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={3}>Matriks Risiko Historis</Title>
            <Text size="xs" c="dimmed">
              Menggunakan snapshot hasil final periode. Tidak dihitung ulang dari
              matriks terkini.
            </Text>
          </div>
          <Group gap="xs" align="flex-end">
            <SegmentedControl
              size="xs"
              value={matrixMode}
              onChange={(value) => setMatrixMode(value as "current" | "history")}
              data={[
                { label: "Terkini", value: "current" },
                { label: "Historis", value: "history" },
              ]}
            />
            <Select
              size="xs"
              label="Tahun"
              value={String(histTahun)}
              onChange={(value) => setHistTahun(Number(value) || histTahun)}
              data={[histTahun - 1, histTahun, histTahun + 1].map((year) => ({
                value: String(year),
                label: String(year),
              }))}
              w={100}
            />
            <Select
              size="xs"
              label="Triwulan"
              value={String(histTriwulan)}
              onChange={(value) => setHistTriwulan(Number(value) || histTriwulan)}
              data={[1, 2, 3, 4].map((quarter) => ({
                value: String(quarter),
                label: `TW ${quarter}`,
              }))}
              w={100}
            />
          </Group>
        </Group>

        {histData?.catatan && (
          <Alert color="orange" variant="light">
            {histData.catatan}
          </Alert>
        )}

        {histLoading ? (
          <Center h={200}><Loader /></Center>
        ) : (
          <>
            {config && (
              <Card withBorder padding="md">
                <Text fw={700} mb="xs">
                  Latar matriks snapshot{" "}
                  {config.takenAt
                    ? `(${new Date(config.takenAt).toLocaleString("id-ID")})`
                    : ""}
                </Text>
                <Box style={{ overflowX: "auto" }}>
                  <Box
                    style={{
                      display: "grid",
                      gridTemplateColumns: `auto repeat(5, minmax(70px, 1fr))`,
                      gap: 4,
                      minWidth: 520,
                    }}
                  >
                    <Box />
                    {[1, 2, 3, 4, 5].map((dampakSkala) => (
                      <Center key={`hd-${dampakSkala}`}>
                        <Text size="10px" fw={700} ta="center" c="dimmed">
                          {ldBySkala.get(dampakSkala)?.nama ?? dampakSkala}
                        </Text>
                      </Center>
                    ))}
                    {[5, 4, 3, 2, 1].map((kemungkinanSkala) => (
                      <Box key={`row-${kemungkinanSkala}`} style={{ display: "contents" }}>
                        <Center>
                          <Text size="10px" fw={700} c="dimmed">
                            {lkBySkala.get(kemungkinanSkala)?.nama ?? kemungkinanSkala}
                          </Text>
                        </Center>
                        {[1, 2, 3, 4, 5].map((dampakSkala) => {
                          const lk = lkBySkala.get(kemungkinanSkala);
                          const ld = ldBySkala.get(dampakSkala);
                          const cell = lk && ld
                            ? cellByPair.get(`${lk.id}:${ld.id}`)
                            : null;
                          const level = cell
                            ? levelRisikoById.get(cell.levelRisikoId)
                            : null;
                          const points =
                            pointsByCell.get(`${kemungkinanSkala}:${dampakSkala}`) ?? [];
                          return (
                            <Center
                              key={`cell-${kemungkinanSkala}-${dampakSkala}`}
                              style={{
                                background: cell
                                  ? getColorHex(String(level?.warna ?? ""))
                                  : "var(--mantine-color-gray-2)",
                                borderRadius: 6,
                                minHeight: 58,
                                color: "#fff",
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                              }}
                            >
                              <Text size="sm" fw={800}>
                                {cell?.besaran ?? "–"}
                              </Text>
                              {points.map((point) => (
                                <Badge key={point.monitoringId} size="8px" variant="filled" color="dark">
                                  {point.riskId}
                                </Badge>
                              ))}
                            </Center>
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Card>
            )}

            <Card withBorder padding="0" style={{ overflowX: "auto" }}>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Risiko</Table.Th>
                    <Table.Th>Kemungkinan</Table.Th>
                    <Table.Th>Dampak</Table.Th>
                    <Table.Th>Besaran</Table.Th>
                    <Table.Th>Level</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {histRows.map((row) => (
                    <Table.Tr key={row.monitoringId}>
                      <Table.Td>{row.risiko}</Table.Td>
                      <Table.Td>{row.kemungkinan ?? "-"}</Table.Td>
                      <Table.Td>{row.dampak ?? "-"}</Table.Td>
                      <Table.Td>{row.besaran ?? "Belum dapat dihitung"}</Table.Td>
                      <Table.Td>{row.level ?? "-"}</Table.Td>
                    </Table.Tr>
                  ))}
                  {histRows.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={5} ta="center" c="dimmed" py="md">
                        Belum ada hasil final pada periode ini.
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Card>
          </>
        )}
      </Stack>
    );
  }

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Y-Axis possibilities (Kemungkinan)
  const yAxisItems = [
    { skala: 5, label: "Hampir Pasti Terjadi" },
    { skala: 4, label: "Sering Terjadi" },
    { skala: 3, label: "Kadang Terjadi" },
    { skala: 2, label: "Jarang Terjadi" },
    { skala: 1, label: "Hampir Tidak Terjadi" },
  ];

  // X-Axis possibilities (Dampak)
  const xAxisItems = [
    { skala: 1, label: "Tidak Signifikan" },
    { skala: 2, label: "Minor" },
    { skala: 3, label: "Moderat" },
    { skala: 4, label: "Signifikan" },
    { skala: 5, label: "Sangat Signifikan" },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={3}>Matriks Risiko & Heatmap Perpindahan</Title>
          <Text size="sm" c="dimmed">
            Visualisasi perpindahan tingkat risiko dari Kondisi Aktual ke Kondisi Residual Harapan.
          </Text>
        </Stack>
        <Group gap="xs">
          <SegmentedControl
            size="xs"
            value={matrixMode}
            onChange={(value) => setMatrixMode(value as "current" | "history")}
            data={[
              { label: "Terkini", value: "current" },
              { label: "Historis", value: "history" },
            ]}
          />
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            loading={exporting}
            onClick={exportMatrixAsImage}
          >
            Unduh Matriks
          </Button>
        </Group>
      </Group>

      <Grid gutter="xl">
        {/* Heatmap Section */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="md" radius="md" style={{ overflow: "auto" }}>
            <Center style={{ flexDirection: "column", minWidth: 640 }}>
              <Title order={5} mb="md" fw={700}>MATRIKS ANALISIS RISIKO GABUNGAN</Title>

              {/* Complete Matrix Layout using CSS Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 40px 110px repeat(5, 90px)",
                  gridTemplateRows: "35px 35px 45px repeat(5, 90px)",
                  border: "1px solid var(--mantine-color-default-border)",
                  backgroundColor: "var(--mantine-color-body)",
                  color: "var(--mantine-color-text)",
                  fontFamily: "sans-serif",
                }}
              >
                {/* Top-Left Merged Title Header */}
                <div
                  style={{
                    gridColumn: "1 / 4",
                    gridRow: "1 / 4",
                    borderBottom: "2px solid var(--mantine-color-default-border)",
                    borderRight: "2px solid var(--mantine-color-default-border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: 12,
                    textAlign: "center",
                    padding: 4,
                  }}
                >
                  <div>MATRIKS</div>
                  <div>ANALISIS</div>
                  <div>RISIKO</div>
                </div>

                {/* DAMPAK Heading */}
                <div
                  style={{
                    gridColumn: "4 / 9",
                    gridRow: "1",
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: 12,
                    letterSpacing: 1.5,
                  }}
                >
                  DAMPAK
                </div>

                {/* Dampak Scales (1 to 5) */}
                {xAxisItems.map((item, idx) => (
                  <div
                    key={`dx-${item.skala}`}
                    style={{
                      gridColumn: 4 + idx,
                      gridRow: "2",
                      borderBottom: "1px solid var(--mantine-color-default-border)",
                      borderRight: idx < 4 ? "1px solid var(--mantine-color-default-border)" : undefined,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    {item.skala}
                  </div>
                ))}

                {/* Dampak Labels ("Tidak Signifikan", etc.) */}
                {xAxisItems.map((item, idx) => (
                  <div
                    key={`dl-${item.skala}`}
                    style={{
                      gridColumn: 4 + idx,
                      gridRow: "3",
                      borderBottom: "2px solid var(--mantine-color-default-border)",
                      borderRight: idx < 4 ? "1px solid var(--mantine-color-default-border)" : undefined,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                      textAlign: "center",
                      padding: 2,
                      lineHeight: "1.1",
                    }}
                  >
                    {item.label}
                  </div>
                ))}

                {/* KEMUNGKINAN Vertical Heading */}
                <div
                  style={{
                    gridColumn: "1",
                    gridRow: "4 / 9",
                    borderRight: "1px solid var(--mantine-color-default-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: 12,
                    letterSpacing: 1.5,
                    writingMode: "vertical-lr",
                    transform: "rotate(180deg)",
                    textTransform: "uppercase",
                  }}
                >
                  KEMUNGKINAN
                </div>

                {/* Kemungkinan Scales (5 down to 1) */}
                {yAxisItems.map((item, idx) => (
                  <div
                    key={`ky-${item.skala}`}
                    style={{
                      gridColumn: "2",
                      gridRow: 4 + idx,
                      borderBottom: idx < 4 ? "1px solid var(--mantine-color-default-border)" : undefined,
                      borderRight: "1px solid var(--mantine-color-default-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    {item.skala}
                  </div>
                ))}

                {/* Kemungkinan Labels ("Hampir Pasti Terjadi", etc.) */}
                {yAxisItems.map((item, idx) => (
                  <div
                    key={`kl-${item.skala}`}
                    style={{
                      gridColumn: "3",
                      gridRow: 4 + idx,
                      borderBottom: idx < 4 ? "1px solid var(--mantine-color-default-border)" : undefined,
                      borderRight: "2px solid var(--mantine-color-default-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      fontSize: 10,
                      fontWeight: "bold",
                      paddingLeft: 6,
                      lineHeight: "1.2",
                    }}
                  >
                    {item.label}
                  </div>
                ))}

                {/* 5x5 Grid Cells Area with absolute SVG overlay */}
                <div
                  style={{
                    gridColumn: "4 / 9",
                    gridRow: "4 / 9",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {/* Grid cells */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 90px)",
                      gridTemplateRows: "repeat(5, 90px)",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    {gridCells.map((cell, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: getColorHex(cell.warna),
                          borderBottom: Math.floor(idx / 5) < 4 ? "1px solid var(--mantine-color-default-border)" : undefined,
                          borderRight: (idx % 5) < 4 ? "1px solid var(--mantine-color-default-border)" : undefined,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "light-dark(var(--mantine-color-black), var(--mantine-color-white))",
                          fontWeight: 700,
                          fontSize: 18,
                        }}
                      >
                        {cell.besaran == null ? "–" : cell.besaran}
                      </div>
                    ))}
                  </div>

                  {/* SVG Overlay for Arrows */}
                  {transitionArrows.length > 0 && (
                    <svg
                      viewBox="0 0 500 500"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      <defs>
                        {transitionArrows.map((arrow) => (
                          <marker
                            key={`marker-${arrow.id}`}
                            id={`heatmap-arrow-${arrow.id}`}
                            viewBox="0 0 10 10"
                            refX="6"
                            refY="5"
                            markerWidth="8"
                            markerHeight="8"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={arrow.color} />
                          </marker>
                        ))}
                      </defs>

                      {transitionArrows.map((arrow) => (
                        <g key={`group-${arrow.id}`}>
                          {arrow.isSame ? (
                            <>
                              <circle
                                cx={arrow.x1}
                                cy={arrow.y1}
                                r="25"
                                fill="none"
                                stroke={arrow.color}
                                strokeWidth="3.5"
                              />
                              <text
                                x={arrow.x1}
                                y={arrow.y1 + 5}
                                fill={arrow.color}
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {arrow.id}
                              </text>
                            </>
                          ) : (
                            <>
                              {/* Transition line */}
                              <line
                                x1={arrow.x1_s}
                                y1={arrow.y1_s}
                                x2={arrow.x2_s}
                                y2={arrow.y2_s}
                                stroke={arrow.color}
                                strokeWidth="4"
                                markerEnd={`url(#heatmap-arrow-${arrow.id})`}
                              />

                              {/* Aktual Cell Indicator */}
                              <circle
                                cx={arrow.x1}
                                cy={arrow.y1}
                                r="18"
                                fill="none"
                                stroke={arrow.color}
                                strokeWidth="2.5"
                              />
                              <circle
                                cx={arrow.x1}
                                cy={arrow.y1}
                                r="19"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="1"
                              />
                              <circle
                                cx={arrow.x1 - 12}
                                cy={arrow.y1 - 12}
                                r="9"
                                fill={arrow.color}
                              />
                              <text
                                x={arrow.x1 - 12}
                                y={arrow.y1 - 9}
                                fill="#fff"
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                A
                              </text>
                              {/* Label ID inside center of circle */}
                              <text
                                x={arrow.x1}
                                y={arrow.y1 + 4}
                                fill={arrow.color}
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {arrow.id}
                              </text>

                              {/* Residual Cell Indicator */}
                              <circle
                                cx={arrow.x2}
                                cy={arrow.y2}
                                r="18"
                                fill="none"
                                stroke={arrow.color}
                                strokeWidth="2.5"
                              />
                              <circle
                                cx={arrow.x2}
                                cy={arrow.y2}
                                r="19"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="1"
                              />
                              <circle
                                cx={arrow.x2 + 12}
                                cy={arrow.y2 - 12}
                                r="9"
                                fill={arrow.color}
                              />
                              <text
                                x={arrow.x2 + 12}
                                y={arrow.y2 - 9}
                                fill="#fff"
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                R
                              </text>
                              {/* Label ID inside center of circle */}
                              <text
                                x={arrow.x2}
                                y={arrow.y2 + 4}
                                fill={arrow.color}
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {arrow.id}
                              </text>
                            </>
                          )}
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              </div>
            </Center>
          </Card>
        </Grid.Col>

        {/* Selected Risk Details & List Section */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="md">
            {/* Risk Selection Card */}
            <Card withBorder padding="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Title order={5}>Visualisasi Perpindahan</Title>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => setSelectedRiskIds([])}
                  disabled={selectedRiskIds.length === 0}
                >
                  Hapus Semua
                </Button>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                Klik baris pada tabel di bawah untuk melihat perpindahan selera risiko di matriks heatmap.
              </Text>

              {/* Risk Details Summary - Scrollable */}
              {selectedRisks.length > 0 ? (
                <ScrollArea h={320} type="auto" offsetScrollbars>
                  <Stack gap="sm" pr="xs">
                  {selectedRisks.map((risk) => {
                    const arrow = transitionArrows.find((a) => a.id === risk.id);
                    const color = arrow?.color || "#e03131";
                    return (
                      <Card key={risk.id} withBorder radius="sm" padding="xs" style={{ borderLeft: `4px solid ${color}` }}>
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text size="xs" fw={700} style={{ color }}>RISIKO (ID {risk.id})</Text>
                          </Group>
                          <Text size="xs" fw={600} lineClamp={2}>{risk.risiko}</Text>
                          {risk.penyebab && (
                            <Text size="10px" c="dimmed" lineClamp={1}>Penyebab: {risk.penyebab}</Text>
                          )}
                          <Grid gutter="xs">
                            <Grid.Col span={6}>
                              <Card withBorder padding="xs" radius="sm" bg="var(--mantine-color-default-hover)" style={{ padding: 6 }}>
                                <Text size="9px" fw={700} c="dimmed">AKTUAL (A)</Text>
                                {risk.aktual ? (
                                  <Group gap={6} mt={2}>
                                    <Text size="xs" fw={700} c="blue">{risk.aktual.besaran ?? "–"}</Text>
                                    <Badge color={risk.aktual.warna} size="9px" style={{ fontSize: "8px" }}>
                                      {risk.aktual.level}
                                    </Badge>
                                  </Group>
                                ) : (
                                  <Text size="9px" c="dimmed">Belum dianalisis</Text>
                                )}
                              </Card>
                            </Grid.Col>
                            <Grid.Col span={6}>
                              <Card withBorder padding="xs" radius="sm" bg="var(--mantine-color-default-hover)" style={{ padding: 6 }}>
                                <Text size="9px" fw={700} c="dimmed">RESIDUAL (R)</Text>
                                {risk.residual ? (
                                  <Group gap={6} mt={2}>
                                    <Text size="xs" fw={700} c="green">{risk.residual.besaran ?? "–"}</Text>
                                    <Badge color={risk.residual.warna} size="9px" style={{ fontSize: "8px" }}>
                                      {risk.residual.level}
                                    </Badge>
                                  </Group>
                                ) : (
                                  <Text size="9px" c="dimmed">Belum ditangani</Text>
                                )}
                              </Card>
                            </Grid.Col>
                          </Grid>
                        </Stack>
                      </Card>
                    );
                  })}
                  </Stack>
                </ScrollArea>
              ) : (
                <Text size="sm" c="dimmed" ta="center">Belum ada risiko dipilih</Text>
              )}
            </Card>

            {/* List Table of All Risks */}
            <Card withBorder padding="xs" radius="md">
              <Title order={6} p="xs">Daftar Risiko Teridentifikasi</Title>
              <TextInput
                placeholder="Cari risiko..."
                size="xs"
                value={searchVal}
                onChange={(e) => handleSearchChange(e.currentTarget.value)}
                mb="xs"
                mx="xs"
              />
              <Table highlightOnHover style={{ cursor: "pointer", fontSize: 11 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}></Table.Th>
                    <Table.Th>Risiko</Table.Th>
                    <Table.Th w={60}>Aktual</Table.Th>
                    <Table.Th w={60}>Residual</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedRisks.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4} ta="center" c="dimmed">Belum ada data</Table.Td>
                    </Table.Tr>
                  ) : (
                    paginatedRisks.map((r) => (
                      <Table.Tr
                        key={r.id}
                        onClick={() => toggleRiskSelection(r.id)}
                        style={{
                          backgroundColor:
                            selectedRiskIds.includes(r.id)
                              ? "var(--mantine-color-blue-light)"
                              : undefined,
                        }}
                      >
                        <Table.Td>
                          <input
                            type="checkbox"
                            checked={selectedRiskIds.includes(r.id)}
                            onChange={() => {}}
                            style={{ pointerEvents: "none", cursor: "pointer" }}
                          />
                        </Table.Td>
                        <Table.Td style={{ fontWeight: selectedRiskIds.includes(r.id) ? 600 : 400 }}>
                          {r.risiko}
                        </Table.Td>
                        <Table.Td>
                          {r.aktual ? (
                            <Badge color={r.aktual.warna} size="xs">{r.aktual.besaran}</Badge>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {r.residual ? (
                            <Badge color={r.residual.warna} size="xs">{r.residual.besaran}</Badge>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
              {filteredRisks.length > pageSize && (
                <Group justify="center" mt="sm" pb="xs">
                  <Pagination
                    total={Math.ceil(filteredRisks.length / pageSize)}
                    value={page}
                    onChange={setPage}
                    size="xs"
                  />
                </Group>
              )}
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
