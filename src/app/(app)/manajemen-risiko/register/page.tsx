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
  ScrollArea,
  Menu,
  Box,
  FileButton,
} from "@mantine/core";
import { IconPlus, IconChevronDown, IconDatabase, IconSparkles, IconDeviceFloppy, IconAdjustments, IconDownload, IconUpload } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useYear } from "@/lib/year-context";
import { RiskWizard } from "@/components/risk-wizard/RiskWizard";
import { RegisterModeSwitcher } from "@/components/register-mode-switcher";
import { Pagination } from "@/components/pagination";

type TabKey = "identifikasi" | "analisis" | "evaluasi" | "rencana";

export default function RegisterRisikoPage() {
  const { tahunDari, tahunSampai } = useYear();
  const [tab, setTab] = useState<TabKey>("identifikasi");
  const [search, setSearch] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const [bankResults, setBankResults] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMethod, setBankMethod] = useState("");
  const [importing, setImporting] = useState(false);
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

  const searchBank = async () => {
    if (!bankQuery.trim()) return;
    setBankLoading(true);
    try {
      const res = await fetch("/api/bank-risiko/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: bankQuery.trim(), limit: 15, tahun: tahunDari }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pencarian gagal");
      setBankResults(data.results ?? []);
      setBankMethod(data.method ?? "text");
    } catch (e: any) { notifications.show({ title: "Gagal", message: e.message, color: "red" }); }
    finally { setBankLoading(false); }
  };

  const importBankRisk = async (risk: any) => {
    try {
      const payload = { risiko: risk.risiko, jenisRisikoId: risk.jenis_risiko_id, sumberRisikoId: risk.sumber_risiko_id, kategoriRisikoId: risk.kategori_risiko_id, areaDampakId: risk.area_dampak_id, penyebab: risk.penyebab, dampak: risk.dampak, ...(risk.sasaran_id != null && { sasaranId: risk.sasaran_id }), ...(risk.kegiatan_id != null && { kegiatanId: risk.kegiatan_id }), ...(risk.proses_bisnis_id != null && { prosesBisnisId: risk.proses_bisnis_id }), ...(risk.unit_kerja_id != null && { unitKerjaId: risk.unit_kerja_id }), tahun: tahunDari };
      const res = await fetch("/api/identifikasi-risiko", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan");
      setBankOpen(false);
      refetchAll();
      notifications.show({ title: "Ditambahkan", message: "Risiko dari Bank Risiko berhasil ditambahkan", color: "green" });
    } catch (e: any) { notifications.show({ title: "Gagal", message: e.message, color: "red" }); }
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`/api/import/identifikasi-risiko/template?tahunDari=${tahunDari}&tahunSampai=${tahunSampai}`);
      if (!res.ok) throw new Error("Gagal mengunduh template");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = `Template_Import_Identifikasi_Risiko_${tahunDari}.xlsx`; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { notifications.show({ title: "Gagal", message: e.message, color: "red" }); }
  };

  const importExcel = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("tahunDari", String(tahunDari));
      const res = await fetch("/api/import/identifikasi-risiko", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Impor gagal");
      refetchAll();
      notifications.show({ title: "Berhasil", message: `${data.created ?? 0} dibuat, ${data.updated ?? 0} diperbarui`, color: "green" });
    } catch (e: any) { notifications.show({ title: "Impor gagal", message: e.message, color: "red" }); }
    finally { setImporting(false); }
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
            Tabel biasa per tahap (scroll horizontal). Periode {tahunDari === tahunSampai ? tahunDari : `${tahunDari}-${tahunSampai}`} · {total} risiko.
          </Text>
        </div>
        <Group gap="xs">
          <RegisterModeSwitcher />
          <Menu shadow="md" width={270} position="bottom-end">
            <Menu.Target>
              <Button leftSection={<IconPlus size={16} />} rightSection={<IconChevronDown size={14} />}>
                Tambah Risiko
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Pilih cara menambahkan risiko</Menu.Label>
              <Menu.Item leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>Isi Manual (Wizard)</Menu.Item>
              <Menu.Item leftSection={<IconDatabase size={16} />} onClick={() => setBankOpen(true)}>Pilih dari Bank Risiko</Menu.Item>
              <Menu.Item leftSection={<IconSparkles size={16} />} onClick={() => setModalOpened(true)}>Bantu Isi dengan AI</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button variant="light" leftSection={<IconDeviceFloppy size={16} />} onClick={refetchAll}>
            Muat Ulang
          </Button>
          <Menu shadow="md" width={260} position="bottom-end">
            <Menu.Target>
              <Button variant="default" leftSection={<IconAdjustments size={16} />} rightSection={<IconChevronDown size={14} />}>
                Kelola Data
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Kelengkapan dan pertukaran data</Menu.Label>
              <Menu.Item leftSection={<IconDownload size={16} />} onClick={downloadTemplate}>Unduh Template</Menu.Item>
              <FileButton accept=".xlsx,.xlsm,.xls,.xlsb,.csv" onChange={importExcel}>
                {(props) => <Menu.Item {...props} leftSection={<IconUpload size={16} />} disabled={importing}>Import Excel</Menu.Item>}
              </FileButton>
            </Menu.Dropdown>
          </Menu>
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

      <Card withBorder padding="0" radius="md">
        <ScrollArea type="auto" offsetScrollbars>
          <Box style={{ minWidth: tab === "identifikasi" ? 1200 : 1100 }}>
          {tab === "identifikasi" && (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th style={{ minWidth: 260 }}>Risiko</Table.Th>
                <Table.Th>Sasaran</Table.Th>
                <Table.Th>Kegiatan</Table.Th>
                <Table.Th>Jenis</Table.Th>
                <Table.Th>Kategori</Table.Th>
                <Table.Th style={{ minWidth: 220 }}>Penyebab</Table.Th>
                <Table.Th style={{ minWidth: 220 }}>Dampak</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paged.map((r: any, i: number) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{(page - 1) * pageSize + i + 1}</Table.Td>
                  <Table.Td style={{ fontWeight: 600, whiteSpace: "normal", wordBreak: "break-word" }}>{r.risiko}</Table.Td>
                  <Table.Td>{r.sasaran?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.kegiatan?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.jenisRisiko?.nama ?? "-"}</Table.Td>
                  <Table.Td>{r.kategoriRisiko?.nama ?? "-"}</Table.Td>
                  <Table.Td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{r.penyebab ?? "-"}</Table.Td>
                  <Table.Td style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{r.dampak ?? "-"}</Table.Td>
                </Table.Tr>
              ))}
              {paged.length === 0 && (
                <Table.Tr><Table.Td colSpan={8} ta="center" c="dimmed" py="md">Belum ada data</Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        {tab === "analisis" && (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th style={{ minWidth: 260 }}>Risiko</Table.Th>
                <Table.Th>Kemungkinan</Table.Th>
                <Table.Th>Dampak</Table.Th>
                <Table.Th>Besaran</Table.Th>
                <Table.Th>Level</Table.Th>
                <Table.Th style={{ minWidth: 260 }}>Pengendalian</Table.Th>
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
                    <Table.Td style={{ fontWeight: 600, whiteSpace: "normal" }}>{r.risiko}</Table.Td>
                    <Table.Td>{an ? lkById.get(an.levelKemungkinanId)?.nama ?? "-" : "-"}</Table.Td>
                    <Table.Td>{an ? ldById.get(an.levelDampakId)?.nama ?? "-" : "-"}</Table.Td>
                    <Table.Td>{b.besaran > 0 ? <Badge color={getBadgeColor(b.warna)}>{b.besaran}</Badge> : "-"}</Table.Td>
                    <Table.Td>{b.besaran > 0 ? <Badge color={getBadgeColor(b.warna)}>{b.level}</Badge> : "-"}</Table.Td>
                    <Table.Td style={{ whiteSpace: "normal" }}>{an?.pengendalianUraian ?? "-"}</Table.Td>
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
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th style={{ minWidth: 260 }}>Risiko</Table.Th>
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
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No</Table.Th>
                <Table.Th style={{ minWidth: 260 }}>Risiko</Table.Th>
                <Table.Th style={{ minWidth: 300 }}>RTP</Table.Th>
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
                    <Table.Td style={{ whiteSpace: "normal" }}>{rp?.rencanaTidakPenanganan ?? "-"}</Table.Td>
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
          </Box>
        </ScrollArea>
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
        size="xl"
        styles={{ content: { maxWidth: 980 }, body: { maxHeight: "78vh", overflowY: "auto" } }}
      >
        <RiskWizard onSuccess={handleWizardSuccess} />
      </Modal>

      <Modal opened={bankOpen} onClose={() => setBankOpen(false)} title="Cari dari Bank Risiko" size="xl">
        <Stack gap="md">
          <Group>
            <TextInput value={bankQuery} onChange={(e) => setBankQuery(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchBank(); }} placeholder="Ketik kata kunci risiko..." style={{ flex: 1 }} />
            <Button loading={bankLoading} onClick={searchBank}>Cari</Button>
          </Group>
          {bankMethod && <Text size="sm">Metode: {bankMethod === "semantic" ? "Semantik" : "Teks"}</Text>}
          {bankResults.map((risk) => (
            <Group key={risk.id} justify="space-between" align="start" p="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
              <Box style={{ flex: 1 }}><Text size="sm">{risk.risiko}</Text><Badge size="xs">{risk.kategori_risiko_nama}</Badge></Box>
              <Button size="xs" onClick={() => void importBankRisk(risk)}>Tambahkan</Button>
            </Group>
          ))}
          {bankResults.length === 0 && <Text size="sm" c="dimmed">Belum ada hasil</Text>}
        </Stack>
      </Modal>
    </Stack>
  );
}
