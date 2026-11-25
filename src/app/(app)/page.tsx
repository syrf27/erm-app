"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Title, Text, Paper, SimpleGrid, Group, Stack, Box, Badge,
  Progress, Table, ThemeIcon, Center, Loader, Alert, Tooltip, Divider, ScrollArea,
} from "@mantine/core";
import {
  IconAlertTriangle, IconClipboardList, IconChartBar,
  IconActivity, IconTargetArrow, IconListCheck, IconArrowDownRight,
  IconArrowUpRight, IconRefresh, IconGauge,
} from "@tabler/icons-react";
import { useYear } from "@/lib/year-context";

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
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box style={{ minWidth: 0 }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">{label}</Text>
          <Text fw={800} fz={30} lh={1.1} mt={6}>{value}</Text>
          {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
        </Box>
        <ThemeIcon size={46} radius="md" variant="light" color={color} style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

function RiskMatrix({ title, description, cells, stats }: { title: string; description: string; cells: any[][]; stats: Stats }) {
  return (
    <Paper withBorder radius="md" p="lg" shadow="xs">
      <Group justify="space-between" mb="md">
        <Box>
          <Text fw={700}>{title}</Text>
          <Text size="xs" c="dimmed">{description} · Kemungkinan × Dampak</Text>
        </Box>
        <ThemeIcon variant="light" color="orange" radius="md"><IconGauge size={18} /></ThemeIcon>
      </Group>
      <Box style={{ overflowX: "auto" }}>
        <Box style={{ display: "grid", gridTemplateColumns: `minmax(100px, auto) repeat(${stats.levelDampak.length}, minmax(48px, 1fr))`, gap: 4, minWidth: 390 }}>
          <Box />
          {stats.levelDampak.map((d: any) => (
            <Center key={d.id}><Text size="10px" fw={600} ta="center" c="dimmed">{d.nama}</Text></Center>
          ))}
          {cells.slice().reverse().map((row: any[], ri: number) => {
            const likelihood = stats.levelKemungkinan[stats.levelKemungkinan.length - 1 - ri];
            return (
              <Box key={likelihood.id} style={{ display: "contents" }}>
                <Center><Text size="10px" fw={600} c="dimmed" ta="center">{likelihood.nama}</Text></Center>
                {row.map((cell: any) => (
                  <Tooltip key={`${likelihood.id}:${cell.dampakId}`} label={`${cell.levelRisikoNama ?? "–"} · Besaran ${cell.besaran ?? "Belum dapat dihitung"} · ${cell.count} risiko`}>
                    <Center style={{ background: fmtColor(cell.warna, "#e9ecef"), borderRadius: 6, minHeight: 46, color: "#fff" }}>
                      <Text fz={18} fw={800}>{cell.count || ""}</Text>
                    </Center>
                  </Tooltip>
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Group gap="md" mt="md" justify="center">
        {stats.byLevel.map((level: any) => (
          <Group key={level.nama} gap={6}>
            <Box w={12} h={12} style={{ background: fmtColor(level.warna), borderRadius: 3 }} />
            <Text size="xs">{level.nama}</Text>
          </Group>
        ))}
      </Group>
    </Paper>
  );
}

export default function DashboardPage() {
  const { tahunDari, tahunSampai } = useYear();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahunDari: String(tahunDari),
        tahunSampai: String(tahunSampai),
      });
      const res = await fetch(`/api/dashboard-stats?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat statistik (" + res.status + ")");
      setStats(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tahunDari, tahunSampai]);

  const maxCat = useMemo(() => Math.max(1, ...((stats?.byCategory ?? []).map((c: any) => c.count))), [stats]);

  if (loading) return <Center h={400}><Loader /></Center>;
  if (error) return <Alert color="red" title="Gagal memuat dashboard" icon={<IconAlertTriangle />}>{error}</Alert>;
  if (!stats) return null;

  const k = stats.kpi;
  const riskReduction = stats.pairedScores.actualAvg && stats.pairedScores.residualAvg != null
    ? Math.round((1 - stats.pairedScores.residualAvg / stats.pairedScores.actualAvg) * 100)
    : null;

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2}>Dashboard Manajemen Risiko</Title>
          <Text c="dimmed" size="sm">
            Ringkasan eksekutif penerapan MR berbasis ISO 31000 / SNI 8615
          </Text>
          <Text size="xs" c="blue" mt={4}>
            Periode risiko: {tahunDari === tahunSampai ? tahunDari : `${tahunDari}–${tahunSampai}`}
          </Text>
        </Box>
        <Badge size="lg" variant="light" leftSection={<IconRefresh size={14} />}>
          Diperbarui {new Date().toLocaleString("id-ID")}
        </Badge>
      </Group>

      {/* KPI Row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" data-tour="tour-kpi">
        <KpiCard icon={<IconAlertTriangle size={26} />} color="red"
          label="Total Risiko" value={k.totalRisiko}
          sub={k.sasaran + " sasaran • " + k.prosesBisnis + " proses bisnis"} />
        <KpiCard icon={<IconChartBar size={26} />} color="blue"
          label="Dianalisis" value={k.dianalisis} sub={"Cakupan " + k.analysisCoverage + "% dari identifikasi"} />
        <KpiCard icon={<IconClipboardList size={26} />} color="grape"
          label="Hasil Penanganan" value={`${stats.treatmentOutcomes.assessed}/${stats.treatmentOutcomes.totalPlans}`}
          sub="RTP dengan hasil pemantauan final" />
        {/* <KpiCard icon={<IconActivity size={26} />} color="teal"
          label="Indikator Risiko (KRI)" value={k.kri} sub={stats.kriSummary.merah + " melewati ambang batas"} /> */}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg" data-tour="tour-heatmap">
        <RiskMatrix title="Matriks Risiko Aktual" description="Sebelum pengendalian" cells={stats.heatmapAktual} stats={stats} />
        <RiskMatrix title="Matriks Risiko Residual Terkini" description="Setelah pengendalian; dasar kebutuhan rencana penanganan" cells={stats.heatmapResidual} stats={stats} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Paper withBorder radius="md" p="lg" shadow="xs">
            <Text fw={700} mb="md">Distribusi Tingkat Risiko Aktual</Text>
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
                <Text fw={700}>Aktual vs Residual Terkini</Text>
                <Text size="xs" c="dimmed">Rata-rata pada {stats.pairedScores.count} risiko dengan kedua penilaian lengkap</Text>
              </Box>
              {riskReduction === null ? (
                <Badge color="gray" variant="light">Belum dapat dihitung</Badge>
              ) : (
                <Badge color={riskReduction >= 0 ? "teal" : "red"} variant="light"
                  leftSection={riskReduction >= 0 ? <IconArrowDownRight size={14} /> : <IconArrowUpRight size={14} />}>
                  {Math.abs(riskReduction)}% {riskReduction >= 0 ? "penurunan" : "kenaikan"}
                </Badge>
              )}
            </Group>
            <Group mt="md" grow>
              <Box>
                <Text size="xs" c="dimmed">Aktual</Text>
                <Text fw={800} fz={26} c="red">{stats.pairedScores.actualAvg ?? "–"}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Residual Terkini</Text>
                <Text fw={800} fz={26} c="teal">{stats.pairedScores.residualAvg ?? "–"}</Text>
              </Box>
            </Group>
            {!stats.pairedScores.count && <Text size="xs" c="orange" mt="md">Belum ada risiko dengan penilaian aktual dan residual lengkap.</Text>}
          </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
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

        {/* Verified treatment outcomes */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Text fw={700} mb="xs">Hasil Penanganan RTP</Text>
          <Text size="xs" c="dimmed" mb="md">Hasil pemantauan FINAL terakhir per risiko dalam periode terpilih; dibandingkan dengan residual acuan saat pemantauan.</Text>
          <Stack gap="sm">
            <Group justify="space-between"><Text size="sm">RTP pada risiko aktif</Text><Text fw={700}>{stats.treatmentOutcomes.totalPlans}</Text></Group>
            <Group justify="space-between"><Text size="sm">Sudah ada hasil terverifikasi</Text><Text fw={700}>{stats.treatmentOutcomes.assessed}</Text></Group>
            <Group justify="space-between"><Text size="sm">Belum dapat dinilai</Text><Text fw={700} c="dimmed">{stats.treatmentOutcomes.notAssessed}</Text></Group>
            <Divider />
            {stats.treatmentOutcomes.assessed === 0 ? (
              <Text size="sm" c="dimmed">Belum ada hasil pemantauan final. Keberadaan RTP belum membuktikan besaran risiko sudah turun.</Text>
            ) : (
              <>
                <Group justify="space-between"><Text size="sm">Besaran menurun</Text><Text fw={700} c="teal">{stats.treatmentOutcomes.decreased} dari {stats.treatmentOutcomes.comparable}</Text></Group>
                <Group justify="space-between"><Text size="sm">Tetap / meningkat</Text><Text fw={700} c={stats.treatmentOutcomes.unchanged + stats.treatmentOutcomes.increased ? "orange" : "dimmed"}>{stats.treatmentOutcomes.unchanged} / {stats.treatmentOutcomes.increased}</Text></Group>
                <Group justify="space-between"><Text size="sm">Sudah dalam selera{stats.treatment.appetite != null ? ` (≤${stats.treatment.appetite})` : ""}</Text><Text fw={700}>{stats.treatmentOutcomes.withinAppetite ?? "–"} dari {stats.treatmentOutcomes.assessed}</Text></Group>
                {stats.treatmentOutcomes.comparable < stats.treatmentOutcomes.assessed && <Text size="xs" c="dimmed">{stats.treatmentOutcomes.assessed - stats.treatmentOutcomes.comparable} hasil final belum memiliki residual acuan untuk dibandingkan.</Text>}
              </>
            )}
            <Divider />
            <Text size="xs" c="dimmed">{stats.treatment.appetite == null ? "Selera risiko belum ditetapkan." : `${stats.treatment.eligible} risiko residual di atas selera ${stats.treatment.appetite}; ${stats.treatment.planned} sudah memiliki RTP.`}</Text>
          </Stack>
        </Paper>

      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        {/* Top risks table */}
        <Paper withBorder radius="md" p="lg" shadow="xs" style={{ gridColumn: "span 2" }}>
          <Group justify="space-between" mb="md">
            <Text fw={700}>Risiko Residual di Atas Selera</Text>
            <ThemeIcon variant="light" color="red" radius="md"><IconListCheck size={18} /></ThemeIcon>
          </Group>
          <ScrollArea>
            <Table highlightOnHover verticalSpacing="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Risiko</Table.Th>
                  <Table.Th>Kategori</Table.Th>
                  <Table.Th ta="center">Besaran Residual</Table.Th>
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
                  <Table.Tr><Table.Td colSpan={4}><Text size="sm" c="dimmed" ta="center">{stats.treatment.appetite == null ? "Selera risiko belum ditetapkan" : `Tidak ada risiko residual di atas selera ${stats.treatment.appetite}`}</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        {/* Process funnel */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Group justify="space-between" mb="md">
            <Text fw={700}>Progres Proses MR</Text>
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
                    <Text size="sm" fw={700}>{f.total ? `${f.count}/${f.total}` : f.count}</Text>
                  </Group>
                  <Progress value={f.coveragePercent ?? 0} color={colors[i]} size="md" radius="sm" />
                </Box>
              );
            })}
          </Stack>
          <Divider my="md" />
          <Group justify="space-between">
            <Text size="xs" c="dimmed">RTP dengan hasil terverifikasi</Text>
            <Badge color={stats.treatmentOutcomes.assessed ? "teal" : "gray"} variant="light">
              {stats.treatmentOutcomes.totalPlans ? `${stats.treatmentOutcomes.assessed}/${stats.treatmentOutcomes.totalPlans}` : "Tidak ada RTP"}
            </Badge>
          </Group>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
