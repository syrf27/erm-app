"use client";

import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import {
  Stack,
  Title,
  Text,
  Group,
  Button,
  Tabs,
  Table,
  Badge,
  TextInput,
  Modal,
  Card,
  Loader,
  Center,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useYear } from "@/lib/year-context";
import { RiskWizard } from "@/components/risk-wizard/RiskWizard";
import { Pagination } from "@/components/pagination";

type TabKey = "identifikasi" | "analisis" | "evaluasi" | "rencana";

export default function RegisterRisikoPage() {
  const { tahunDari, tahunSampai } = useYear();
  const [tab, setTab] = useState<TabKey>("identifikasi");
  const [search, setSearch] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const identResult = useList({
    resource: "identifikasi-risiko",
    pagination: { pageSize: 1000 },
    filters: [
      { field: "tahun", operator: "gte", value: tahunDari },
      { field: "tahun", operator: "lte", value: tahunSampai },
    ],
  });
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 1000 } });
  const evaluasiResult = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 1000 } });
  const rencanaResult = useList({ resource: "rencana-penanganan", pagination: { pageSize: 1000 } });
  const lkResult = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const ldResult = useList({ resource: "level-dampak", pagination: { mode: "off" } });
  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { mode: "off" } });

  const loading =
    identResult.query.isPending ||
    analisisResult.query.isPending ||
    evaluasiResult.query.isPending ||
    rencanaResult.query.isPending;

  const identData: any[] = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const analisisData: any[] = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const evaluasiData: any[] = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const rencanaData: any[] = useMemo(() => rencanaResult.result?.data ?? [], [rencanaResult.result?.data]);
  const lkData: any[] = useMemo(() => lkResult.result?.data ?? [], [lkResult.result?.data]);
  const ldData: any[] = useMemo(() => ldResult.result?.data ?? [], [ldResult.result?.data]);
  const matriksData: any[] = useMemo(() => matriksResult.result?.data ?? [], [matriksResult.result?.data]);

  const lkById = useMemo(() => new Map(lkData.map((x: any) => [x.id, x])), [lkData]);
  const ldById = useMemo(() => new Map(ldData.map((x: any) => [x.id, x])), [ldData]);
  const analisisById = useMemo(() => new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a])), [analisisData]);
  const evaluasiById = useMemo(() => new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e])), [evaluasiData]);
  const rencanaById = useMemo(() => new Map(rencanaData.map((r: any) => [r.identifikasiRisikoId, r])), [rencanaData]);

  const getBesaran = (lkId: number | null, ldId: number | null) => {
    const lk = lkId ? lkById.get(lkId) : null;
    const ld = ldId ? ldById.get(ldId) : null;
    if (!lk || !ld) return { besaran: 0, level: "-", warna: "gray" };
    const m = matriksData.find((x: any) => x.levelKemungkinanId === lk.id && x.levelDampakId === ld.id);
    const besaran = m?.besaran ?? lk.skala * ld.skala;
    const level = m?.levelRisiko?.nama ?? "-";
    const warna = m?.levelRisiko?.warna ?? "gray";
    return { besaran, level, warna };
  };

  const getBadgeColor = (warna: string) => {
    switch (warna?.toLowerCase()) {
      case "biru": case "blue": return "blue";
      case "hijau": case "green": return "green";
      case "kuning": case "yellow": return "yellow";
      case "jingga": case "oranye": case "orange": return "orange";
      case "merah": case "red": return "red";
      default: return "gray";
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return identData;
    return identData.filter((r: any) =>
      String(r.risiko ?? "").toLowerCase().includes(q) ||
      String(r.penyebab ?? "").toLowerCase().includes(q) ||
      String(r.sasaran?.nama ?? "").toLowerCase().includes(q)
    );
  }, [identData, search]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const refetchAll = () => {
    identResult.query?.refetch?.();
    analisisResult.query?.refetch?.();
    evaluasiResult.query?.refetch?.();
    rencanaResult.query?.refetch?.();
  };

  const handleWizardSuccess = () => {
    setModalOpened(false);
    refetchAll();
  };

  if (loading) {
    return <Center h={300}><Loader /></Center>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Register Risiko — Mode Panduan</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Tampilan tabel biasa per tahap. Klik Tambah Risiko untuk form multistep. Periode {tahunDari === tahunSampai ? tahunDari : `${tahunDari}-${tahunSampai}`} · {total} risiko.
          </Text>
        </div>
        <Group>
          <Button component={Link} href="/manajemen-risiko/risk-register" variant="light">
            ← Mode Spreadsheet
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Tambah Risiko
          </Button>
        </Group>
      </Group>

      <Tabs value={tab} onChange={(v) => { setTab((v as TabKey) ?? "identifikasi"); setPage(1); }}>
        <Tabs.List>
          <Tabs.Tab value="identifikasi">Identifikasi Risiko</Tabs.Tab>
          <Tabs.Tab value="analisis">Analisis Risiko</Tabs.Tab>
          <Tabs.Tab value="evaluasi">Evaluasi Risiko</Tabs.Tab>
          <Tabs.Tab value="rencana">Rencana Penanganan</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Group>
        <TextInput
          placeholder={`Cari di ${tab}...`}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          style={{ flex: 1 }}
        />
      </Group>

      <Card withBorder padding="0" radius="md" style={{ overflowX: "auto" }}>
        {tab === "identifikasi" && (
          <Table striped highlightOnHover withTableBorder style={{ minWidth: 1200 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th>Risiko</Table.Th>
                <Table.Th>Sasaran</Table.Th>
                <Table.Th>Kegiatan</Table.Th>
                <Table.Th>Jenis</Table.Th>
                <Table.Th>Kategori</Table.Th>
                <Table.Th>Penyebab</Table.Th>
                <Table.Th>Dampak</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paged.map((r: any, i: number) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{(page - 1) * pageSize + i + 1}</Table.Td>
                  <Table.Td style={{ fontWeight: 600 }}>{r.risiko}</Table.Td>
                  <Table.Td>{r.sasaran?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.kegiatan?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.jenisRisiko?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.kategoriRisiko?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.penyebab ?? "-"}</Table.Td>
                  <Table.Td>{r.dampak ?? "-"}</Table.Td>
                </Table.Tr>
              ))}
              {paged.length === 0 && (
                <Table.Tr><Table.Td colSpan={8} ta="center" c="dimmed" py="md">Belum ada data</Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        {tab === "analisis" && (
          <Table striped highlightOnHover withTableBorder style={{ minWidth: 1100 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th>Risiko</Table.Th>
                <Table.Th>Kemungkinan</Table.Th>
                <Table.Th>Dampak</Table.Th>
                <Table.Th>Besaran</Table.Th>
                <Table.Th>Level</Table.Th>
                <Table.Th>Pengendalian</Table.Th>
                <Table.Th>Efektivitas</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paged.map((r: any, i: number) => {
                const an = analisisById.get(r.id);
                const b = getBesaran(an?.levelKemungkinanId ?? null, an?.levelDampakId ?? null);
                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>{(page - 1) * pageSize + i + 1}</Table.Td>
                    <Table.Td style={{ fontWeight: 600 }}>{r.risiko}</Table.Td>
                    <Table.Td>{an ? lkById.get(an.levelKemungkinanId)?.nama ?? "-" : "-"}</Table.Td>
                    <Table.Td>{an ? ldById.get(an.levelDampakId)?.nama ?? "-" : "-"}</Table.Td>
                    <Table.Td>{b.besaran > 0 ? <Badge color={getBadgeColor(b.warna)}>{b.besaran}</Badge> : "-"}</Table.Td>
                    <Table.Td>{b.besaran > 0 ? <Badge color={getBadgeColor(b.warna)}>{b.level}</Badge> : "-"}</Table.Td>
                    <Table.Td>{an?.pengendalianUraian ?? "-"}</Table.Td>
                    <Table.Td>{an?.pengendalianEfektivitas ?? "-"}</Table.Td>
                  </Table.Tr>
                );
              })}
              {paged.length === 0 && (
                <Table.Tr><Table.Td colSpan={8} ta="center" c="dimmed" py="md">Belum ada data</Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        {tab === "evaluasi" && (
          <Table striped highlightOnHover withTableBorder style={{ minWidth: 1000 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th>Risiko</Table.Th>
                <Table.Th>Respon</Table.Th>
                <Table.Th>Residual Kemungkinan</Table.Th>
                <Table.Th>Residual Dampak</Table.Th>
                <Table.Th>Besaran Residual</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paged.map((r: any, i: number) => {
                const ev = evaluasiById.get(r.id);
                const b = getBesaran(ev?.residualLevelKemungkinanId ?? null, ev?.residualLevelDampakId ?? null);
                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>{(page - 1) * pageSize + i + 1}</Table.Td>
                    <Table.Td style={{ fontWeight: 600 }}>{r.risiko}</Table.Td>
                    <Table.Td>{ev?.responRisiko ?? "-"}</Table.Td>
                    <Table.Td>{ev ? lkById.get(ev.residualLevelKemungkinanId)?.nama ?? "-" : "-"}</Table.Td>
                    <Table.Td>{ev ? ldById.get(ev.residualLevelDampakId)?.nama ?? "-" : "-"}</Table.Td>
                    <Table.Td>{b.besaran > 0 ? <Badge color={getBadgeColor(b.warna)}>{b.besaran} ({b.level})</Badge> : "-"}</Table.Td>
                  </Table.Tr>
                );
              })}
              {paged.length === 0 && (
                <Table.Tr><Table.Td colSpan={6} ta="center" c="dimmed" py="md">Belum ada data</Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        {tab === "rencana" && (
          <Table striped highlightOnHover withTableBorder style={{ minWidth: 1100 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th>Risiko</Table.Th>
                <Table.Th>RTP</Table.Th>
                <Table.Th>Target Output</Table.Th>
                <Table.Th>Target Waktu</Table.Th>
                <Table.Th>PJ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paged.map((r: any, i: number) => {
                const rp = rencanaById.get(r.id);
                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>{(page - 1) * pageSize + i + 1}</Table.Td>
                    <Table.Td style={{ fontWeight: 600 }}>{r.risiko}</Table.Td>
                    <Table.Td>{rp?.rencanaTidakPenanganan ?? "-"}</Table.Td>
                    <Table.Td>{rp?.targetOutput ?? "-"}</Table.Td>
                    <Table.Td>{rp?.targetWaktu ?? "-"}</Table.Td>
                    <Table.Td>{rp?.penanggungJawab ?? "-"}</Table.Td>
                  </Table.Tr>
                );
              })}
              {paged.length === 0 && (
                <Table.Tr><Table.Td colSpan={6} ta="center" c="dimmed" py="md">Belum ada data</Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {total > 0 && (
        <Pagination
          current={page}
          total={total}
          pageSize={pageSize}
          onChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          showSizeChanger
          showTotal
        />
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Tambah Risiko — Form Multistep"
        size="lg"
        styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
      >
        <RiskWizard onSuccess={handleWizardSuccess} />
      </Modal>
    </Stack>
  );
}
