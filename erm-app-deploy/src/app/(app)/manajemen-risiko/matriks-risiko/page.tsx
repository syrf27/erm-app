"use client";

import { useList } from "@refinedev/core";
import { useEffect, useState, useMemo } from "react";
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
} from "@mantine/core";
import { IconArrowRight, IconRefresh } from "@tabler/icons-react";

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
    besaran: number;
    level: string;
    warna: string;
  } | null;
  residual: {
    kemungkinan: string;
    kemungkinanSkala: number;
    dampak: string;
    dampakSkala: number;
    besaran: number;
    level: string;
    warna: string;
  } | null;
}

export default function MatriksRisikoPage() {
  const [selectedRiskIds, setSelectedRiskIds] = useState<number[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Fetch all configuration and transaction data
  const identQuery = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 10000 } });
  const analisisQuery = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });
  const rencanaQuery = useList({ resource: "rencana-penanganan", pagination: { pageSize: 10000 } });
  const lkQuery = useList({ resource: "level-kemungkinan", pagination: { pageSize: 100 } });
  const ldQuery = useList({ resource: "level-dampak", pagination: { pageSize: 100 } });
  const matriksQuery = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 100 } });

  const loading =
    identQuery.query.isPending ||
    analisisQuery.query.isPending ||
    rencanaQuery.query.isPending ||
    lkQuery.query.isPending ||
    ldQuery.query.isPending ||
    matriksQuery.query.isPending;

  const identData = useMemo(() => identQuery.result?.data ?? [], [identQuery.result?.data]);
  const analisisData = useMemo(() => analisisQuery.result?.data ?? [], [analisisQuery.result?.data]);
  const rencanaData = useMemo(() => rencanaQuery.result?.data ?? [], [rencanaQuery.result?.data]);
  const lkData = useMemo(() => lkQuery.result?.data ?? [], [lkQuery.result?.data]);
  const ldData = useMemo(() => ldQuery.result?.data ?? [], [ldQuery.result?.data]);
  const matriksData = useMemo(() => matriksQuery.result?.data ?? [], [matriksQuery.result?.data]);

  const getWarnaFromBesaran = (besaran: number): string => {
    if (besaran >= 1 && besaran <= 5) return "Biru";
    if (besaran >= 6 && besaran <= 10) return "Hijau";
    if (besaran >= 11 && besaran <= 14) return "Kuning";
    if (besaran >= 15 && besaran <= 19) return "Jingga";
    return "Merah";
  };

  const getLevelLabelFromBesaran = (besaran: number): string => {
    if (besaran >= 1 && besaran <= 5) return "Sangat Rendah";
    if (besaran >= 6 && besaran <= 10) return "Rendah";
    if (besaran >= 11 && besaran <= 14) return "Sedang";
    if (besaran >= 15 && besaran <= 19) return "Tinggi";
    return "Sangat Tinggi";
  };

  // Combine and map data
  const processedRisks = useMemo((): RiskData[] => {
    if (loading) return [];

    return identData.map((item: any) => {
      const analisis = analisisData.find((a: any) => a.identifikasiRisikoId === item.id);
      const rencana = rencanaData.find((r: any) => r.identifikasiRisikoId === item.id);

      // Find likelihood & impact scales for aktual
      const lkAktual = lkData.find((lk: any) => lk.id === analisis?.levelKemungkinanId);
      const ldAktual = ldData.find((ld: any) => ld.id === analisis?.levelDampakId);

      // Find likelihood & impact scales for residual
      const lkResidual = lkData.find((lk: any) => lk.id === rencana?.residualLevelKemungkinanId);
      const ldResidual = ldData.find((ld: any) => ld.id === rencana?.residualLevelDampakId);

      let aktual = null;
      if (lkAktual && ldAktual) {
        const matchMatriks = matriksData.find(
          (m: any) => m.levelKemungkinanId === lkAktual.id && m.levelDampakId === ldAktual.id
        );
        const besaran = matchMatriks?.besaran ?? (lkAktual.skala * ldAktual.skala);
        aktual = {
          kemungkinan: lkAktual.nama,
          kemungkinanSkala: lkAktual.skala,
          dampak: ldAktual.nama,
          dampakSkala: ldAktual.skala,
          besaran,
          level: getLevelLabelFromBesaran(besaran),
          warna: getWarnaFromBesaran(besaran),
        };
      }

      let residual = null;
      if (lkResidual && ldResidual) {
        const matchMatriks = matriksData.find(
          (m: any) => m.levelKemungkinanId === lkResidual.id && m.levelDampakId === ldResidual.id
        );
        const besaran = matchMatriks?.besaran ?? (lkResidual.skala * ldResidual.skala);
        residual = {
          kemungkinan: lkResidual.nama,
          kemungkinanSkala: lkResidual.skala,
          dampak: ldResidual.nama,
          dampakSkala: ldResidual.skala,
          besaran,
          level: getLevelLabelFromBesaran(besaran),
          warna: getWarnaFromBesaran(besaran),
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
  }, [loading, identData, analisisData, rencanaData, lkData, ldData, matriksData]);

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

  // Set default selected risk
  useEffect(() => {
    if (processedRisks.length > 0 && selectedRiskIds.length === 0) {
      const firstValid = processedRisks.find((r) => r.aktual && r.residual);
      if (firstValid) {
        setSelectedRiskIds([firstValid.id]);
      } else {
        setSelectedRiskIds([processedRisks[0].id]);
      }
    }
  }, [processedRisks, selectedRiskIds]);

  const selectedRisks = useMemo(() => {
    return processedRisks.filter((r) => selectedRiskIds.includes(r.id));
  }, [processedRisks, selectedRiskIds]);

  const toggleRiskSelection = (id: number) => {
    setSelectedRiskIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
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
    const cells: { kSkala: number; dSkala: number; besaran: number; warna: string }[] = [];
    for (let k = 5; k >= 1; k--) {
      for (let d = 1; d <= 5; d++) {
        // Find configuration cell
        const lk = lkData.find((item: any) => item.skala === k);
        const ld = ldData.find((item: any) => item.skala === d);
        let besaran = k * d;

        if (lk && ld) {
          const match = matriksData.find(
            (m: any) => m.levelKemungkinanId === lk.id && m.levelDampakId === ld.id
          );
          if (match) {
            besaran = match.besaran;
          }
        }

        cells.push({ kSkala: k, dSkala: d, besaran, warna: getWarnaFromBesaran(besaran) });
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
                          color: "#000",
                          fontWeight: 700,
                          fontSize: 18,
                        }}
                      >
                        {cell.besaran}
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
              <Title order={5} mb="sm">Visualisasi Perpindahan</Title>
              <Text size="xs" c="dimmed" mb="md">
                Klik baris pada tabel di bawah untuk melihat perpindahan selera risiko di matriks heatmap.
              </Text>

              {/* Risk Details Summary */}
              {selectedRisks.length > 0 ? (
                <Stack gap="sm" style={{ maxHeight: 320, overflowY: "auto" }}>
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
                                    <Text size="xs" fw={700} c="blue">{risk.aktual.besaran}</Text>
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
                                    <Text size="xs" fw={700} c="green">{risk.residual.besaran}</Text>
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
