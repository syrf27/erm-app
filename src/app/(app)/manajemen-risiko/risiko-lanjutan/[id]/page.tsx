"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react";
import { useGetIdentity } from "@refinedev/core";
import {
  RiskWizard,
  type RiskWizardInitialData,
} from "@/components/risk-wizard/RiskWizard";
import { RISK_CYCLE_LABEL } from "@/lib/risk-cycle";

export default function RisikoLanjutanDetailPage() {
  const params = useParams<{ id: string }>();
  const riskId = Number(params?.id);
  const { data: identity } = useGetIdentity<{ role?: string }>();
  const isAdmin = String(identity?.role ?? "").toLowerCase() === "admin";

  const [risk, setRisk] = useState<any | null>(null);
  const [chain, setChain] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"return" | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isInteger(riskId) || riskId <= 0) {
      setError("ID risiko lanjutan tidak valid");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/risiko-lanjutan/${riskId}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Gagal memuat");
      setRisk(payload.risk);
      setChain(payload.chain ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [riskId]);

  useEffect(() => {
    load();
  }, [load]);

  const initialData = useMemo<RiskWizardInitialData | null>(() => {
    if (!risk) return null;
    return {
      identifikasi: {
        risiko: risk.risiko,
        penyebab: risk.penyebab,
        dampak: risk.dampak,
        jenisRisikoId: risk.jenisRisikoId,
        sumberRisikoId: risk.sumberRisikoId,
        kategoriRisikoId: risk.kategoriRisikoId,
        areaDampakId: risk.areaDampakId,
        sasaranId: risk.sasaranId,
        kegiatanId: risk.kegiatanId,
        prosesBisnisId: risk.prosesBisnisId,
        tahun: risk.tahun,
      },
      analisis: risk.analisisRisiko,
      evaluasi: risk.evaluasiRisiko,
      rencana: risk.rencanaPenanganan,
      version: risk.version,
    };
  }, [risk]);

  const runAction = async (action: string, actionReason?: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/risiko-lanjutan/${riskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          version: risk?.version,
          reason: actionReason ?? null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = Array.isArray(payload?.details)
          ? ` ${payload.details.join("; ")}`
          : "";
        throw new Error((payload?.error || "Aksi gagal") + details);
      }
      notifications.show({ title: "Berhasil", message: "Status risiko lanjutan diperbarui", color: "green" });
      setModal(null);
      setReason("");
      await load();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Aksi gagal", color: "red" });
    } finally {
      setActing(false);
    }
  };

  if (loading) return <Center h={300}><Loader /></Center>;
  if (error) {
    return <Alert color="red" icon={<IconAlertTriangle />} title="Gagal memuat">{error}</Alert>;
  }
  if (!risk) return null;

  const status = risk.statusSiklus as string;
  const canEdit = status === "FOLLOW_UP_DRAFT";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs" mb={4}>
            <Link href="/manajemen-risiko/risiko-lanjutan">
              <Button size="compact-xs" variant="subtle" leftSection={<IconArrowLeft size={12} />}>
                Kembali
              </Button>
            </Link>
            <Badge variant="light">{RISK_CYCLE_LABEL[status] ?? status}</Badge>
            <Text size="xs" c="dimmed">ID {risk.id}</Text>
          </Group>
          <Title order={4}>{risk.risiko}</Title>
          <Text size="xs" c="dimmed">
            Tim: {risk.team?.nama ?? "-"} · Target TW {risk.followUpTriwulan ?? "-"} {risk.followUpTahun ?? ""}
          </Text>
        </div>
        <Group>
          {canEdit && (
            <Button loading={acting} onClick={() => runAction("submit")}>
              Ajukan Validasi
            </Button>
          )}
          {isAdmin && status === "FOLLOW_UP_SUBMITTED" && (
            <>
              <Button color="green" loading={acting} onClick={() => runAction("approve")}>
                Sahkan
              </Button>
              <Button color="orange" variant="light" onClick={() => setModal("return")}>
                Kembalikan
              </Button>
            </>
          )}
        </Group>
      </Group>

      <Card withBorder padding="sm">
        <Text size="xs" fw={700} c="dimmed">Pemicu pemantauan</Text>
        {risk.sourceMonitoring ? (
          <Stack gap={4} mt={4}>
            <Text size="sm">
              {risk.sourceMonitoring.risk?.risiko ?? "-"} — TW {risk.sourceMonitoring.triwulan} {risk.sourceMonitoring.tahun}
            </Text>
            <Text size="xs" c="dimmed">
              Residual {risk.sourceMonitoring.besaran ?? "belum dapat dihitung"} · Selera {risk.sourceMonitoring.seleraSnapshot ?? "-"} ·
              Pelaksanaan: {risk.sourceMonitoring.statusPelaksanaan ?? "-"}
            </Text>
            {risk.sourceMonitoring.uraianPelaksanaan && (
              <Text size="xs">Pelaksanaan: {risk.sourceMonitoring.uraianPelaksanaan}</Text>
            )}
            {risk.sourceMonitoring.pekerjaanTertunda && (
              <Text size="xs" c="orange">
                Pekerjaan tertunda (referensi, bukan pengendalian efektif):{" "}
                {risk.sourceMonitoring.pekerjaanTertunda}
              </Text>
            )}
            {risk.sourceMonitoring.reconciliationDecision && (
              <Text size="xs" c="dimmed">
                Rekonsiliasi koreksi:{" "}
                {risk.sourceMonitoring.reconciliationDecision}
                {risk.sourceMonitoring.reconciliationNote
                  ? ` — ${risk.sourceMonitoring.reconciliationNote}`
                  : ""}
              </Text>
            )}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">Tidak ada data pemicu.</Text>
        )}
      </Card>

      {risk.kewajibanSebagaiLanjutan?.catatan && (
        <Alert color="blue" variant="light">
          {risk.kewajibanSebagaiLanjutan.catatan}
        </Alert>
      )}

      <Divider label=" rantai risiko " labelPosition="left" />
      <Card withBorder padding="sm" style={{ overflowX: "auto" }}>
        <Table withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Risiko</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Target</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {chain.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.id}</Table.Td>
                <Table.Td>{item.risiko}</Table.Td>
                <Table.Td>{RISK_CYCLE_LABEL[item.statusSiklus] ?? item.statusSiklus}</Table.Td>
                <Table.Td>{item.followUpTriwulan ? `TW ${item.followUpTriwulan} ${item.followUpTahun ?? ""}` : "-"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      {canEdit && initialData ? (
        <Card withBorder padding="md">
          <RiskWizard
            variant="followup"
            followUpRiskId={riskId}
            initialData={initialData}
            teamScope={risk.teamId}
            onSuccess={load}
          />
        </Card>
      ) : (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={700}>Ringkasan penilaian</Text>
            <Text size="sm">Aktual: {risk.analisisRisiko?.pengendalianUraian ?? "-"}</Text>
            <Text size="sm">Residual evaluasi: {risk.evaluasiRisiko?.residualLevelKemungkinanId ?? "-"} / {risk.evaluasiRisiko?.residualLevelDampakId ?? "-"}</Text>
            <Text size="sm">RTP baru: {risk.rencanaPenanganan?.rencanaTidakPenanganan ?? "-"}</Text>
            <Text size="sm">Alasan penguatan: {risk.rencanaPenanganan?.alasanPenguatan ?? "-"}</Text>
          </Stack>
        </Card>
      )}

      <Modal opened={modal === "return"} onClose={() => setModal(null)} title="Kembalikan Risiko Lanjutan">
        <Stack>
          <Textarea label="Alasan *" minRows={3} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModal(null)}>Batal</Button>
            <Button loading={acting} onClick={() => runAction("return", reason)}>Kirim</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
