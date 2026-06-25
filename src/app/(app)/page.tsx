"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Title, Text, Paper, SimpleGrid, Group, Stack, Box, Badge, RingProgress,
  Progress, Table, ThemeIcon, Center, Loader, Alert, Tooltip, Divider, ScrollArea,
} from "@mantine/core";
import {
  IconAlertTriangle, IconClipboardList, IconChartBar,
  IconActivity, IconTargetArrow, IconListCheck, IconArrowDownRight,
  IconArrowUpRight, IconRefresh, IconGauge,
} from "@tabler/icons-react";

type Stats = any;

const fmtColor = (warna?: string | null, fallback = "#868e96") => {
  if (!warna) return fallback;
  const map: Record<string, string> = {
    merah: "#fa5252", "merah tua": "#c92a2a", 
    jingga: "#fd7e14", oranye: "#fd7e14", orange: "#fd7e14",
    kuning: "#fab005", 
    hijau: "#40c057", "hijau tua": "#2b8a3e", 
    biru: "#228be6",
  };
  return map[warna.toLowerCase()] ?? warna;
};

function KpiCard({ icon, label, value, sub, color }: any) {
  return (
    <Paper withBorder radius="md" p="lg" shadow="xs">
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">{label}</Text>
          <Text fw={800} fz={30} lh={1.1} mt={6}>{value}</Text>
          {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
        </Box>
        <ThemeIcon size={46} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard-stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat statistik (" + res.status + ")");
      setStats(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const maxCat = useMemo(() => Math.max(1, ...((stats?.byCategory ?? []).map((c: any) => c.count))), [stats]);
  const maxType = useMemo(() => Math.max(1, ...((stats?.byType ?? []).map((c: any) => c.count))), [stats]);
  const maxFunnel = useMemo(() => Math.max(1, ...((stats?.funnel ?? []).map((c: any) => c.count))), [stats]);

  if (loading) return <Center h={400}><Loader /></Center>;
  if (error) return <Alert color="red" title="Gagal memuat dashboard" icon={<IconAlertTriangle />}>{error}</Alert>;
  if (!stats) return null;

  const k = stats.kpi;
  const totalKri = stats.kriSummary.hijau + stats.kriSummary.kuning + stats.kriSummary.merah + stats.kriSummary.belum;
  const riskReduction = stats.inherentVsResidual.inherentAvg > 0
    ? Math.round((1 - stats.inherentVsResidual.residualAvg / stats.inherentVsResidual.inherentAvg) * 100)
    : 0;

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2}>Dashboard Manajemen Risiko</Title>
          <Text c="dimmed" size="sm">
            Ringkasan eksekutif penerapan ERM berbasis ISO 31000 / SNI 8615
          </Text>
        </Box>
        <Badge size="lg" variant="light" leftSection={<IconRefresh size={14} />}>
          Diperbarui {new Date().toLocaleString("id-ID")}
        </Badge>
      </Group>

      {/* KPI Row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <KpiCard icon={<IconAlertTriangle size={26} />} color="red"
          label="Total Risiko" value={k.totalRisiko}
          sub={k.sasaran + " sasaran • " + k.prosesBisnis + " proses bisnis"} />
        <KpiCard icon={<IconChartBar size={26} />} color="blue"
          label="Dianalisis" value={k.dianalisis} sub={"Cakupan " + k.analysisCoverage + "% dari identifikasi"} />
        <KpiCard icon={<IconClipboardList size={26} />} color="grape"
          label="Rencana Penanganan" value={k.ditangani} sub={"Cakupan " + k.treatmentCoverage + "% dari identifikasi"} />
        <KpiCard icon={<IconActivity size={26} />} color="teal"
          label="Indikator Risiko (KRI)" value={k.kri} sub={stats.kriSummary.merah + " melewati ambang batas"} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {/* Risk Heatmap */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Group justify="space-between" mb="md">
            <Box>
              <Text fw={700}>Matrix Risiko (Inheren)</Text>
              <Text size="xs" c="dimmed">Kemungkinan (vertikal) × Dampak (horizontal)</Text>
            </Box>
            <ThemeIcon variant="light" color="orange" radius="md"><IconGauge size={18} /></ThemeIcon>
          </Group>
          <Box style={{ overflowX: "auto" }}>
            <Box style={{ display: "grid", gridTemplateColumns: "auto repeat(" + stats.levelDampak.length + ", 1fr)", gap: 4, minWidth: 360 }}>
              <Box />
              {stats.levelDampak.map((d: any) => (
                <Center key={"dh" + d.id}><Text size="10px" fw={600} ta="center" c="dimmed">{d.nama}</Text></Center>
              ))}
              {stats.heatmap.slice().reverse().map((row: any[], ri: number) => {
                const kk = stats.levelKemungkinan[stats.levelKemungkinan.length - 1 - ri];
                return (
                  <Box key={"r" + ri} style={{ display: "contents" }}>
                    <Center><Text size="10px" fw={600} c="dimmed" style={{ writingMode: "horizontal-tb" }}>{kk.nama}</Text></Center>
                    {row.map((cell: any, ci: number) => {
                      const bg = fmtColor(cell.warna, "#e9ecef");
                      return (
                        <Tooltip key={"c" + ri + ci} label={(cell.levelRisikoNama ?? "-") + " • Besaran " + cell.besaran + " • " + cell.count + " risiko"}>
                          <Center style={{ background: bg, borderRadius: 6, aspectRatio: "1.6 / 1", minHeight: 44, color: "#fff", fontWeight: 700, position: "relative" }}>
                            <Text fz={18} fw={800}>{cell.count || ""}</Text>
                          </Center>
                        </Tooltip>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>
          <Group gap="md" mt="md" justify="center">
            {stats.byLevel.map((l: any) => (
              <Group key={l.nama} gap={6}>
                <Box w={12} h={12} style={{ background: fmtColor(l.warna), borderRadius: 3 }} />
                <Text size="xs">{l.nama}</Text>
              </Group>
            ))}
          </Group>
        </Paper>

        {/* Risk distribution by level + inherent/residual */}
        <Stack gap="lg">
          <Paper withBorder radius="md" p="lg" shadow="xs">
            <Text fw={700} mb="md">Distribusi Tingkat Risiko</Text>
            <Stack gap="sm">
              {stats.byLevel.map((l: any) => {
                const total = stats.byLevel.reduce((s: number, x: any) => s + x.count, 0) || 1;
                return (
                  <Box key={l.nama}>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm">{l.nama}</Text>
                      <Text size="sm" fw={600}>{l.count} <Text span c="dimmed" size="xs">({Math.round((l.count / total) * 100)}%)</Text></Text>
                    </Group>
                    <Progress value={(l.count / total) * 100} color={fmtColor(l.warna)} size="lg" radius="sm" />
                  </Box>
                );
              })}
            </Stack>
          </Paper>

          <Paper withBorder radius="md" p="lg" shadow="xs">
            <Group justify="space-between">
              <Box>
                <Text fw={700}>Inheren vs Residual</Text>
                <Text size="xs" c="dimmed">Rata-rata besaran risiko {stats.inherentVsResidual.residualN} rencana</Text>
              </Box>
              <Badge color={riskReduction >= 0 ? "teal" : "red"} variant="light"
                leftSection={riskReduction >= 0 ? <IconArrowDownRight size={14} /> : <IconArrowUpRight size={14} />}>
                {Math.abs(riskReduction)}% {riskReduction >= 0 ? "penurunan" : "kenaikan"}
              </Badge>
            </Group>
            <Group mt="md" grow>
              <Box>
                <Text size="xs" c="dimmed">Inheren</Text>
                <Text fw={800} fz={26} c="red">{stats.inherentVsResidual.inherentAvg}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Residual</Text>
                <Text fw={800} fz={26} c="teal">{stats.inherentVsResidual.residualAvg}</Text>
              </Box>
            </Group>
          </Paper>
        </Stack>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        {/* By category */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Text fw={700} mb="md">Risiko per Kategori</Text>
          <Stack gap="xs">
            {stats.byCategory.slice(0, 7).map((c: any) => (
              <Box key={c.nama}>
                <Group justify="space-between" mb={2}><Text size="xs" lineClamp={1}>{c.nama}</Text><Text size="xs" fw={600}>{c.count}</Text></Group>
                <Progress value={(c.count / maxCat) * 100} size="sm" radius="sm" color="blue" />
              </Box>
            ))}
            {stats.byCategory.length === 0 && <Text size="sm" c="dimmed">Belum ada data</Text>}
          </Stack>
        </Paper>

        {/* By type */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Text fw={700} mb="md">Risiko per Jenis</Text>
          <Stack gap="xs">
            {stats.byType.slice(0, 7).map((c: any) => (
              <Box key={c.nama}>
                <Group justify="space-between" mb={2}><Text size="xs" lineClamp={1}>{c.nama}</Text><Text size="xs" fw={600}>{c.count}</Text></Group>
                <Progress value={(c.count / maxType) * 100} size="sm" radius="sm" color="grape" />
              </Box>
            ))}
            {stats.byType.length === 0 && <Text size="sm" c="dimmed">Belum ada data</Text>}
          </Stack>
        </Paper>

        {/* KRI status ring */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Text fw={700} mb="md">Status Indikator Risiko (KRI)</Text>
          <Center>
            <RingProgress size={150} thickness={16} roundCaps
              sections={[
                { value: totalKri ? (stats.kriSummary.hijau / totalKri) * 100 : 0, color: "teal", tooltip: "Aman" },
                { value: totalKri ? (stats.kriSummary.kuning / totalKri) * 100 : 0, color: "yellow", tooltip: "Waspada" },
                { value: totalKri ? (stats.kriSummary.merah / totalKri) * 100 : 0, color: "red", tooltip: "Kritis" },
              ]}
              label={<Center><Stack gap={0} align="center"><Text fw={800} fz={24}>{totalKri}</Text><Text size="xs" c="dimmed">KRI</Text></Stack></Center>}
            />
          </Center>
          <Group justify="space-around" mt="md">
            <Stack gap={0} align="center"><Badge color="teal" variant="light">{stats.kriSummary.hijau}</Badge><Text size="10px" c="dimmed" mt={4}>Aman</Text></Stack>
            <Stack gap={0} align="center"><Badge color="yellow" variant="light">{stats.kriSummary.kuning}</Badge><Text size="10px" c="dimmed" mt={4}>Waspada</Text></Stack>
            <Stack gap={0} align="center"><Badge color="red" variant="light">{stats.kriSummary.merah}</Badge><Text size="10px" c="dimmed" mt={4}>Kritis</Text></Stack>
            <Stack gap={0} align="center"><Badge color="gray" variant="light">{stats.kriSummary.belum}</Badge><Text size="10px" c="dimmed" mt={4}>Belum</Text></Stack>
          </Group>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        {/* Top risks table */}
        <Paper withBorder radius="md" p="lg" shadow="xs" style={{ gridColumn: "span 2" }}>
          <Group justify="space-between" mb="md">
            <Text fw={700}>Risiko Prioritas Tertinggi</Text>
            <ThemeIcon variant="light" color="red" radius="md"><IconListCheck size={18} /></ThemeIcon>
          </Group>
          <ScrollArea>
            <Table highlightOnHover verticalSpacing="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Risiko</Table.Th>
                  <Table.Th>Kategori</Table.Th>
                  <Table.Th ta="center">Besaran</Table.Th>
                  <Table.Th>Level</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {stats.topRisks.map((r: any, i: number) => (
                  <Table.Tr key={i}>
                    <Table.Td><Text size="sm" lineClamp={2}>{r.risiko}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{r.kategori}</Text></Table.Td>
                    <Table.Td ta="center"><Text fw={700} size="sm">{r.besaran}</Text></Table.Td>
                    <Table.Td><Badge variant="filled" style={{ background: fmtColor(r.warna) }}>{r.level}</Badge></Table.Td>
                  </Table.Tr>
                ))}
                {stats.topRisks.length === 0 && (
                  <Table.Tr><Table.Td colSpan={4}><Text size="sm" c="dimmed" ta="center">Belum ada analisis risiko</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        {/* Process funnel */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Group justify="space-between" mb="md">
            <Text fw={700}>Progres Proses ERM</Text>
            <ThemeIcon variant="light" color="indigo" radius="md"><IconTargetArrow size={18} /></ThemeIcon>
          </Group>
          <Stack gap="md">
            {stats.funnel.map((f: any, i: number) => {
              const colors = ["red", "orange", "yellow", "teal"];
              return (
                <Box key={f.tahap}>
                  <Group justify="space-between" mb={4}>
                    <Group gap={6}>
                      <ThemeIcon size={20} radius="xl" variant="light" color={colors[i]}>
                        <Text size="10px" fw={700}>{i + 1}</Text>
                      </ThemeIcon>
                      <Text size="sm">{f.tahap}</Text>
                    </Group>
                    <Text size="sm" fw={700}>{f.count}</Text>
                  </Group>
                  <Progress value={(f.count / maxFunnel) * 100} color={colors[i]} size="md" radius="sm" />
                </Box>
              );
            })}
          </Stack>
          <Divider my="md" />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Cakupan penanganan</Text>
            <Badge color={k.treatmentCoverage >= 80 ? "teal" : k.treatmentCoverage >= 50 ? "yellow" : "red"} variant="light">
              {k.treatmentCoverage}%
            </Badge>
          </Group>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}