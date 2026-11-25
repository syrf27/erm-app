"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetIdentity, useList } from "@refinedev/core";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Collapse,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconPencil,
  IconRefresh,
} from "@tabler/icons-react";
import { FileDropUpload } from "@/components/file-drop-upload";
import { useYear } from "@/lib/year-context";
import { getSafeDocumentHref } from "@/lib/safe-url";
import {
  assessRisk,
  compareResidualToTolerance,
  currentPeriode,
} from "@/lib/risk-assessment";
import {
  PEMANTAUAN_STATUS_LABEL,
  RISK_CYCLE_LABEL,
} from "@/lib/risk-cycle";

type DocForm = {
  id?: number;
  title: string;
  url: string;
  uploadedName: string;
};

interface MonitoringRow {
  riskId: number;
  risiko: string;
  team?: { id: number; nama: string } | null;
  teamLabel?: string | null;
  tahun: number;
  triwulan: number | null;
  statusSiklus: string;
  rtp: {
    id: number;
    uraian: string | null;
    targetOutput: string | null;
    targetWaktu: string | null;
    penanggungJawab: string | null;
  } | null;
  responEvaluasi: string | null;
  residualAcuan: { besaran: number | null; level: string | null; warna: string | null };
  residualHarapan: { besaran: number | null; level: string | null; warna: string | null };
  monitoring: any | null;
  statusPemantauan: string;
}

interface MonitoringData {
  periode: { tahun: number; triwulan: number | null; semuaTriwulan?: boolean };
  rows: MonitoringRow[];
  obligations: any[];
  counts: {
    totalWajibPantau: number;
    belumDiisi: number;
    menungguValidasi: number;
    kembali: number;
    final: number;
  };
}

const emptyForm = {
  realisasiWaktu: "",
  realisasiOutput: "",
  keterjadianRisiko: "",
  levelKemungkinanId: "",
  levelDampakId: "",
};

export default function PemantauanRisikoPage() {
  const { tahunDari } = useYear();
  const initial = useMemo(() => currentPeriode(), []);
  const [tahun, setTahun] = useState(tahunDari || initial.tahun);
  const [triwulan, setTriwulan] = useState<number | "all">(initial.triwulan);
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: identity } = useGetIdentity<{ role?: string }>();
  const isAdmin = String(identity?.role ?? "").toLowerCase() === "admin";

  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<MonitoringRow | null>(null);
  const [monitoringId, setMonitoringId] = useState<number | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [form, setForm] = useState({ ...emptyForm });
  const [docs, setDocs] = useState<DocForm[]>([]);
  const [uploading, setUploading] = useState(false);
  const [meetingKeyword, setMeetingKeyword] = useState("");
  const [meetingResults, setMeetingResults] = useState<any[]>([]);
  const [meetingSearching, setMeetingSearching] = useState(false);
  const [importingMeetingId, setImportingMeetingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionModal, setActionModal] = useState<"return" | "revise" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState<"active" | "history">("active");
  const [confirmModal, setConfirmModal] = useState<
    | null
    | {
        type: "ASSESSMENT_CHANGED" | "RECONCILIATION_REQUIRED";
        monitoringId: number;
        successorId?: number;
        successorStatus?: string;
        options?: string[];
      }
  >(null);
  const [reconcileDecision, setReconcileDecision] = useState("KEEP_ACTIVE_CHAIN");
  const [reconcileNote, setReconcileNote] = useState("");

  const lkList = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const ldList = useList({ resource: "level-dampak", pagination: { mode: "off" } });
  const matriksList = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 1000 } });
  const seleraList = useList({
    resource: "selera-risiko",
    pagination: { pageSize: 1 },
    sorters: [{ field: "updatedAt", order: "desc" }],
  });

  const lkData: any[] = lkList.result?.data ?? [];
  const ldData: any[] = ldList.result?.data ?? [];
  const matriksData: any[] = matriksList.result?.data ?? [];
  const selera: number | null =
    (seleraList.result?.data ?? [])[0]?.nilai ?? null;

  const assessment = useMemo(
    () =>
      assessRisk(
        matriksData,
        Number(form.levelKemungkinanId) || null,
        Number(form.levelDampakId) || null
      ),
    [matriksData, form.levelKemungkinanId, form.levelDampakId]
  );
  const effectiveSelera = monitoringId
    ? (selected?.monitoring?.seleraSnapshot ?? selera)
    : selera;
  const comparison = compareResidualToTolerance(
    assessment.besaran,
    effectiveSelera
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pemantauan-risiko?tahun=${tahun}&triwulan=${triwulan === "all" ? "all" : triwulan}&mode=${mode}`
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Gagal memuat pemantauan");
      setData(payload);
    } catch (e: any) {
      setError(e?.message ?? "Gagal memuat pemantauan");
    } finally {
      setLoading(false);
    }
  }, [tahun, triwulan, mode]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = async (row: MonitoringRow) => {
    setSelected(row);
    setHistory([]);
    setShowHistory(false);
    setMeetingKeyword("");
    setMeetingResults([]);
    if (row.monitoring) {
      const res = await fetch(`/api/pemantauan-risiko/${row.monitoring.id}`);
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        const m = payload.monitoring;
        setMonitoringId(m.id);
        setVersion(m.version);
        setHistory(payload.history ?? []);
        setForm({
          realisasiWaktu: m.realisasiWaktu ?? "",
          realisasiOutput: m.realisasiOutput ?? "",
          keterjadianRisiko: m.keterjadianRisiko ?? "",
          levelKemungkinanId: m.levelKemungkinanId ? String(m.levelKemungkinanId) : "",
          levelDampakId: m.levelDampakId ? String(m.levelDampakId) : "",
        });
        setDocs(
          (m.dokumens ?? []).map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            url: doc.url,
            uploadedName: doc.title,
          }))
        );
      } else {
        notifications.show({ title: "Gagal", message: payload?.error ?? "Gagal memuat detail", color: "red" });
        return;
      }
    } else {
      setMonitoringId(null);
      setVersion(0);
      setForm({ ...emptyForm });
      setDocs([]);
    }
    setOpened(true);
  };

  const canEdit =
    mode === "active" &&
    triwulan !== "all" &&
    (monitoringId == null ||
      ["DRAFT", "RETURNED"].includes(
        String(selected?.monitoring?.status ?? "")
      ));

  const payloadBody = () => ({
    realisasiWaktu: form.realisasiWaktu || null,
    realisasiOutput: form.realisasiOutput || null,
    keterjadianRisiko: form.keterjadianRisiko || null,
    levelKemungkinanId: form.levelKemungkinanId ? Number(form.levelKemungkinanId) : null,
    levelDampakId: form.levelDampakId ? Number(form.levelDampakId) : null,
    dokumens: docs
      .filter((doc) => doc.url.trim())
      .map((doc) => ({ title: doc.title.trim() || "Bukti Dukung", url: doc.url.trim() })),
  });

  const saveDraft = async (): Promise<{ id: number; version: number } | null> => {
    if (!selected) return null;
    setSaving(true);
    try {
      const isCreate = monitoringId == null;
      const res = await fetch(
        isCreate ? "/api/pemantauan-risiko" : `/api/pemantauan-risiko/${monitoringId}`,
        {
          method: isCreate ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payloadBody(),
            ...(isCreate
              ? { riskId: selected.riskId, tahun, triwulan }
              : { version }),
          }),
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = Array.isArray(payload?.details)
          ? ` ${payload.details.join("; ")}`
          : "";
        throw new Error((payload?.error || "Gagal menyimpan") + details);
      }
      setMonitoringId(payload.id);
      setVersion(payload.version);
      notifications.show({ title: "Tersimpan", message: "Draf pemantauan tersimpan", color: "green" });
      await load();
      return { id: payload.id as number, version: payload.version as number };
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal menyimpan", color: "red" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    id: number,
    action: string,
    reason?: string,
    versionOverride?: number,
    extra?: Record<string, unknown>
  ) => {
    const res = await fetch(`/api/pemantauan-risiko/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        version: versionOverride ?? version,
        reason: reason ?? null,
        ...(extra ?? {}),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const details = Array.isArray(payload?.details)
        ? ` ${payload.details.join("; ")}`
        : "";
      const error = new Error(
        (payload?.error || "Aksi gagal") + details
      ) as Error & { payload?: Record<string, unknown> };
      error.payload = payload;
      throw error;
    }
    return payload;
  };

  const submit = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    try {
      await runAction(saved.id, "submit", undefined, saved.version);
      notifications.show({ title: "Diajukan", message: "Pemantauan diajukan ke Admin", color: "green" });
      setOpened(false);
      await load();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal mengajukan", color: "red" });
    }
  };

  const finalize = async (
    extra?: Record<string, unknown>
  ) => {
    if (!monitoringId) return;
    try {
      const result = await runAction(monitoringId, "finalize", undefined, version, extra);
      notifications.show({
        title: "Final",
        message: result?.reconciliationDecision
          ? `Pemantauan difinalisasi (rekonsiliasi: ${result.reconciliationDecision})`
          : "Pemantauan difinalisasi",
        color: "green",
      });
      setConfirmModal(null);
      setOpened(false);
      await load();
    } catch (e: any) {
      const details = e?.payload?.details;
      if (details?.code === "ASSESSMENT_CHANGED") {
        setConfirmModal({
          type: "ASSESSMENT_CHANGED",
          monitoringId: monitoringId as number,
        });
        return;
      }
      if (details?.code === "RECONCILIATION_REQUIRED") {
        setConfirmModal({
          type: "RECONCILIATION_REQUIRED",
          monitoringId: monitoringId as number,
          successorId: details.successorId,
          successorStatus: details.successorStatus,
          options: details.options,
        });
        return;
      }
      if (details?.code === "OPEN_OBLIGATION") {
        notifications.show({
          title: "Kewajiban sebelumnya masih terbuka",
          message: `Selesaikan kewajiban TW ${details.triwulan} ${details.tahun} terlebih dahulu sebelum membuat penerus kedua.`,
          color: "red",
        });
        return;
      }
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal finalisasi", color: "red" });
    }
  };

  const confirmFinalize = async () => {
    if (!confirmModal) return;
    if (confirmModal.type === "ASSESSMENT_CHANGED") {
      await finalize({ acknowledgeChanges: true });
      return;
    }
    if (!reconcileNote.trim()) {
      notifications.show({
        title: "Catatan wajib",
        message: "Isi catatan rekonsiliasi sebelum melanjutkan.",
        color: "orange",
      });
      return;
    }
    await finalize({
      reconciliation: {
        decision: reconcileDecision,
        note: reconcileNote.trim(),
      },
    });
  };

  const submitActionModal = async () => {
    if (!monitoringId || !actionModal) return;
    if (!actionReason.trim()) {
      notifications.show({ title: "Alasan wajib", message: "Isi alasan terlebih dahulu", color: "orange" });
      return;
    }
    try {
      await runAction(monitoringId, actionModal, actionReason.trim());
      notifications.show({ title: "Berhasil", message: "Tindakan tersimpan", color: "green" });
      setActionModal(null);
      setActionReason("");
      setOpened(false);
      await load();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Aksi gagal", color: "red" });
    }
  };

  const uploadDoc = async (file: File | null, index: number) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Gagal upload");
      setDocs((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          title: next[index].title || payload.filename,
          url: payload.url,
          uploadedName: payload.filename,
        };
        return next;
      });
    } catch (e: any) {
      notifications.show({ title: "Gagal upload", message: e?.message ?? "Gagal upload", color: "red" });
    } finally {
      setUploading(false);
    }
  };

  const searchOfficeMeetings = async () => {
    if (meetingKeyword.trim().length < 2) {
      notifications.show({ title: "Kata kunci terlalu pendek", message: "Masukkan minimal 2 karakter untuk mencari rapat.", color: "orange" });
      return;
    }
    setMeetingSearching(true);
    try {
      const res = await fetch(`/api/gojags-office/rapat?keyword=${encodeURIComponent(meetingKeyword.trim())}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Gagal mencari rapat di GOJAGS Office");
      setMeetingResults(payload.data ?? []);
      if (!(payload.data ?? []).length) notifications.show({ title: "Tidak ada rapat", message: "Tidak ditemukan rapat yang cocok.", color: "gray" });
    } catch (e: any) {
      notifications.show({ title: "Pencarian gagal", message: e?.message ?? "Gagal mencari rapat", color: "red" });
    } finally {
      setMeetingSearching(false);
    }
  };

  const importMeetingAttendance = async (meeting: any) => {
    setImportingMeetingId(meeting.id);
    try {
      const title = `Daftar Hadir - ${meeting.agenda || `Rapat ${meeting.id}`}`;
      const res = await fetch(`/api/gojags-office/rapat/${meeting.id}/presensi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Gagal mengambil presensi dari GOJAGS Office");
      setDocs((prev) => [...prev, { title: payload.title || title, url: payload.url, uploadedName: payload.filename || `${title}.pdf` }]);
      notifications.show({ title: "Presensi ditambahkan", message: "PDF daftar hadir GOJAGS Office masuk ke Bukti Pendukung.", color: "green" });
    } catch (e: any) {
      notifications.show({ title: "Gagal mengambil presensi", message: e?.message ?? "Gagal mengambil PDF", color: "red" });
    } finally {
      setImportingMeetingId(null);
    }
  };

  if (loading && !data) {
    return <Center h={300}><Loader /></Center>;
  }
  if (error) {
    return <Alert color="red" icon={<IconAlertTriangle />} title="Gagal memuat">{error}</Alert>;
  }

  const rows = data?.rows ?? [];
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Pemantauan Risiko</Title>
          <Text size="xs" c="dimmed" mt={4}>
            {triwulan === "all"
              ? "Ringkasan catatan pemantauan yang tersimpan pada setiap triwulan tahun ini. Pilih satu triwulan untuk mengisi atau memperbarui pemantauan."
              : "Pemantauan triwulanan atas pelaksanaan rencana tindak penanganan risiko."}
          </Text>
        </div>
        <Group gap="xs" align="flex-end">
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(value) => setMode(value as "active" | "history")}
            data={[
              { label: "Aktif", value: "active" },
              { label: "Historis", value: "history" },
            ]}
          />
          <Select
            size="xs"
            label="Tahun"
            value={String(tahun)}
            onChange={(v) => setTahun(Number(v) || tahun)}
            data={[tahun - 1, tahun, tahun + 1].map((y) => ({ value: String(y), label: String(y) }))}
            w={100}
          />
          <Select
            size="xs"
            label="Triwulan"
            value={String(triwulan)}
            onChange={(v) => setTriwulan(v === "all" ? "all" : Number(v) || initial.triwulan)}
            data={[{ value: "all", label: "Semua" }, ...[1, 2, 3, 4].map((q) => ({ value: String(q), label: `TW ${q}` }))]}
            w={100}
          />
          <Button variant="light" leftSection={<IconRefresh size={14} />} onClick={load} loading={loading}>
            Muat Ulang
          </Button>
          <Button
            variant="default"
            leftSection={<IconDownload size={14} />}
            component="a"
            href={`/api/pemantauan-risiko/laporan/export?tahun=${tahun}&triwulan=${triwulan}`}
            download
          >
            Ekspor Historis
          </Button>
        </Group>
      </Group>

      <Card withBorder padding="0" radius="md" style={{ overflowX: "auto" }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          style={{
            fontSize: 13,
            minWidth: 2180,
            tableLayout: "fixed",
          }}
          styles={{
            th: {
              whiteSpace: "normal",
              lineHeight: 1.35,
              verticalAlign: "middle",
              padding: "12px 10px",
            },
            td: {
              verticalAlign: "top",
              whiteSpace: "normal",
              wordBreak: "break-word",
              lineHeight: 1.45,
              padding: "12px 10px",
            },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th rowSpan={2} style={{ width: 360 }}>Risiko</Table.Th>
              <Table.Th rowSpan={2} style={{ width: 190 }}>Tim</Table.Th>
              <Table.Th rowSpan={2} ta="center" style={{ width: 110 }}>Periode</Table.Th>
              <Table.Th rowSpan={2} style={{ width: 370 }}>Rencana Tindak Penanganan</Table.Th>
              <Table.Th colSpan={2} ta="center">Target</Table.Th>
              <Table.Th colSpan={4} ta="center">Realisasi</Table.Th>
              <Table.Th colSpan={2} ta="center">Risiko Residual Harapan</Table.Th>
              <Table.Th rowSpan={2} ta="center" style={{ width: 160 }}>Status Pemantauan</Table.Th>
              <Table.Th rowSpan={2} ta="center" style={{ width: 100 }}>Aksi</Table.Th>
            </Table.Tr>
            <Table.Tr>
              <Table.Th ta="center" style={{ width: 150 }}>Waktu</Table.Th>
              <Table.Th ta="center" style={{ width: 340 }}>Output</Table.Th>
              <Table.Th ta="center" style={{ width: 190 }}>Keterjadian Risiko</Table.Th>
              <Table.Th ta="center" style={{ width: 150 }}>Waktu</Table.Th>
              <Table.Th style={{ width: 340 }}>Output</Table.Th>
              <Table.Th style={{ width: 300 }}>Dokumen Pendukung</Table.Th>
              <Table.Th ta="center" style={{ width: 230 }}>Level Kemungkinan</Table.Th>
              <Table.Th ta="center" style={{ width: 200 }}>Level Dampak</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={14} ta="center" c="dimmed" py="md">
                  {triwulan === "all"
                    ? "Belum ada catatan pemantauan pada tahun ini."
                    : "Tidak ada risiko aktif dengan RTP pada periode ini."}
                </Table.Td>
              </Table.Tr>
            )}
            {rows.map((row) => {
              const m = row.monitoring;
              return (
                <Table.Tr key={`${row.riskId}-${row.triwulan ?? "none"}`}>
                  <Table.Td style={{ minWidth: 240 }}>
                    <Text size="sm" fw={600}>{row.risiko}</Text>
                    <Group gap={4} mt={4}>
                      <Badge size="xs" variant="light">{RISK_CYCLE_LABEL[row.statusSiklus] ?? row.statusSiklus}</Badge>
                      <Text size="10px" c="dimmed">ID {row.riskId}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>{row.team?.nama ?? row.teamLabel ?? row.rtp?.penanggungJawab ?? "-"}</Table.Td>
                  <Table.Td ta="center">{row.triwulan ? `TW ${row.triwulan}` : "-"}</Table.Td>
                  <Table.Td style={{ maxWidth: 260 }}>{row.rtp?.uraian ?? "-"}</Table.Td>
                  <Table.Td ta="center">{m?.targetWaktu ?? row.rtp?.targetWaktu ?? "-"}</Table.Td>
                  <Table.Td>{m?.targetOutput ?? row.rtp?.targetOutput ?? "-"}</Table.Td>
                  <Table.Td ta="center">
                    {m?.keterjadianRisiko ? (
                      <Badge color={m.keterjadianRisiko === "Terjadi" ? "red" : "green"} variant="light">
                        {m.keterjadianRisiko}
                      </Badge>
                    ) : "-"}
                  </Table.Td>
                  <Table.Td ta="center">{m?.realisasiWaktu ?? "-"}</Table.Td>
                  <Table.Td>{m?.realisasiOutput ?? "-"}</Table.Td>
                  <Table.Td>
                    {m?.dokumens?.length ? (
                      <Stack gap={4}>
                        {m.dokumens.map((doc: any) => (
                          <Text
                            key={doc.id}
                            component="a"
                            href={getSafeDocumentHref(doc.url) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="xs"
                            c="blue"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <IconFileText size={14} />
                            {doc.title}
                            <IconExternalLink size={12} />
                          </Text>
                        ))}
                      </Stack>
                    ) : "-"}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Stack gap={2} align="center">
                      <Text size="sm">{m?.kemungkinanLabel ?? "-"}</Text>
                      {m?.besaran != null && <Badge size="xs" color={warnaToMantine(m.levelRisikoWarna)}>Nilai {m.besaran}</Badge>}
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="center">{m?.dampakLabel ?? "-"}</Table.Td>
                  <Table.Td ta="center">
                    <Badge color={statusColor(row.statusPemantauan)} variant="light">
                      {PEMANTAUAN_STATUS_LABEL[row.statusPemantauan] ?? row.statusPemantauan}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap={4} justify="center" wrap="nowrap">
                      {mode === "active" && triwulan !== "all" ? (
                        <ActionIcon variant="light" onClick={() => openForm(row)} title="Isi pemantauan">
                          <IconPencil size={15} />
                        </ActionIcon>
                      ) : (
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openForm(row)}
                          title="Lihat hasil historis"
                        >
                          <IconFileText size={15} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          selected ? (
            <Stack gap={2} maw="calc(100% - 28px)">
              <Text fw={700} size="lg">Pemantauan Risiko</Text>
              <Text size="sm" c="dimmed" lineClamp={2} fw={400}>
                ID {selected.riskId} · TW {selected.triwulan ?? "-"} · {selected.risiko}
              </Text>
            </Stack>
          ) : "Pemantauan Risiko"
        }
        size="xl"
        centered
        styles={{
          title: { flex: 1, minWidth: 0 },
          body: { maxHeight: "78vh", overflowY: "auto", paddingTop: 8 },
        }}
      >
        <Stack gap="md">
          {selected && (
            <Card withBorder padding="sm">
              <Text size="sm" fw={700}>Rencana tindak penanganan yang dipantau</Text>
              <Text size="sm">{selected.rtp?.uraian ?? "-"}</Text>
              <Group gap="lg" mt="md" wrap="wrap">
                <Text size="xs">Target waktu: {selected.rtp?.targetWaktu ?? "-"}</Text>
                <Text size="xs">Target output: {selected.rtp?.targetOutput ?? "-"}</Text>
                <Text size="xs">PJ: {selected.rtp?.penanggungJawab ?? "-"}</Text>
              </Group>
            </Card>
          )}

          <Divider label="Realisasi" labelPosition="left" />
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Keterjadian risiko"
                value={form.keterjadianRisiko}
                onChange={(v) => setForm({ ...form, keterjadianRisiko: v ?? "" })}
                data={[{ value: "Terjadi", label: "Terjadi" }, { value: "Tidak Terjadi", label: "Tidak Terjadi" }]}
                clearable
                disabled={!canEdit}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                type="date"
                label="Realisasi waktu"
                value={form.realisasiWaktu}
                onChange={(e) => setForm({ ...form, realisasiWaktu: e.currentTarget.value })}
                disabled={!canEdit}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="Realisasi output"
                value={form.realisasiOutput}
                onChange={(e) => setForm({ ...form, realisasiOutput: e.currentTarget.value })}
                disabled={!canEdit}
              />
            </Grid.Col>
          </Grid>

          <Divider label="Bukti pendukung" labelPosition="left" />
          <Card withBorder padding="sm">
            <Stack gap="sm">
              <Text size="sm" fw={700}>Ambil bukti dari GOJAGS Office</Text>
              <Group align="flex-end" wrap="nowrap">
                <TextInput label="Cari rapat" placeholder="Agenda atau nama rapat" value={meetingKeyword} onChange={(e) => setMeetingKeyword(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchOfficeMeetings(); } }} style={{ flex: 1 }} disabled={!canEdit} />
                <Button variant="light" loading={meetingSearching} onClick={searchOfficeMeetings} disabled={!canEdit}>Cari</Button>
              </Group>
              {meetingResults.map((meeting) => (
                <Card key={meeting.id} withBorder padding="xs">
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Stack gap={2}>
                      <Text size="sm" fw={600}>{meeting.agenda}</Text>
                      <Text size="xs" c="dimmed">{meeting.tanggal} · {meeting.waktuMulai || ""} · {meeting.pesertaCount} peserta</Text>
                    </Stack>
                    <Button size="xs" loading={importingMeetingId === meeting.id} disabled={!canEdit || importingMeetingId !== null} onClick={() => void importMeetingAttendance(meeting)}>Ambil PDF presensi</Button>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Card>
          <Group>
            <Button size="xs" variant="outline" disabled={!canEdit} onClick={() => setDocs((p) => [...p, { title: "", url: "", uploadedName: "" }])}>
              + Tambah tautan
            </Button>
            <Button size="xs" variant="outline" disabled={!canEdit} onClick={() => setDocs((p) => [...p, { title: "", url: "", uploadedName: "" }])}>
              + Upload berkas
            </Button>
          </Group>
          <Stack gap="sm">
            {docs.map((doc, idx) => (
              <Card key={idx} withBorder padding="sm">
                <Group justify="space-between" mb={6}>
                  <Text size="xs" fw={700} c="dimmed">Dokumen #{idx + 1}</Text>
                  <Button size="compact-xs" variant="subtle" color="red" disabled={!canEdit} onClick={() => setDocs((p) => p.filter((_, i) => i !== idx))}>
                    Hapus
                  </Button>
                </Group>
                <TextInput
                  label="Judul"
                  value={doc.title}
                  onChange={(e) => { const v = e.currentTarget.value; setDocs((p) => p.map((d, i) => i === idx ? { ...d, title: v } : d)); }}
                  disabled={!canEdit}
                />
                <TextInput
                  mt="xs"
                  label="URL"
                  value={doc.url}
                  onChange={(e) => { const v = e.currentTarget.value; setDocs((p) => p.map((d, i) => i === idx ? { ...d, url: v } : d)); }}
                  disabled={!canEdit}
                />
                <Stack mt="xs" gap={4}>
                  <FileDropUpload
                    size="sm"
                    loading={uploading}
                    currentFileName={doc.uploadedName || undefined}
                    onFileSelect={(file) => uploadDoc(file, idx)}
                  />
                  {doc.url && (
                    <Text size="xs" component="a" href={getSafeDocumentHref(doc.url) ?? undefined} target="_blank" rel="noopener noreferrer" c="blue">
                      <IconFileText size={12} /> {doc.uploadedName || "Buka dokumen"} <IconExternalLink size={10} />
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>

          <Divider label="Risiko Residual Harapan" labelPosition="left" />
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Level kemungkinan harapan"
                value={form.levelKemungkinanId}
                onChange={(v) => setForm({ ...form, levelKemungkinanId: v ?? "" })}
                data={lkData.map((x) => ({ value: String(x.id), label: x.nama }))}
                disabled={!canEdit}
                searchable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Level dampak harapan"
                value={form.levelDampakId}
                onChange={(v) => setForm({ ...form, levelDampakId: v ?? "" })}
                data={ldData.map((x) => ({ value: String(x.id), label: x.nama }))}
                disabled={!canEdit}
                searchable
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Group gap="sm">
                {assessment.status === "OK" ? (
                  <>
                    <Badge color={warnaToMantine(assessment.warna)}>Besaran {assessment.besaran}</Badge>
                    <Badge variant="light">{assessment.level}</Badge>
                    <Text size="xs" c="dimmed">
                      Selera risiko: {monitoringId ? (selected?.monitoring?.seleraSnapshot ?? selera ?? "-") : (selera ?? "belum tersedia")}
                    </Text>
                    <Badge color={comparison === "BELUM_DI_BAWAH" ? "red" : comparison === "DI_BAWAH" ? "green" : "gray"} variant="light">
                      {comparison === "BELUM_DI_BAWAH"
                        ? "Belum di bawah selera"
                        : comparison === "DI_BAWAH"
                        ? "Sudah di bawah selera"
                        : "Belum dapat dinilai"}
                    </Badge>
                  </>
                ) : (
                  <Text size="sm" c="dimmed">{assessment.label}</Text>
                )}
              </Group>
            </Grid.Col>
          </Grid>

          {history.length > 0 && (
            <>
              <Button variant="subtle" size="xs" onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? "Sembunyikan riwayat" : `Lihat riwayat (${history.length})`}
              </Button>
              <Collapse in={showHistory}>
                <Table withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Revisi</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Besaran</Table.Th>
                      <Table.Th>Rekonsiliasi</Table.Th>
                      <Table.Th>Finalisasi</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {history.map((h) => (
                      <Table.Tr key={h.id}>
                        <Table.Td>Revisi {h.revision}</Table.Td>
                        <Table.Td>{PEMANTAUAN_STATUS_LABEL[h.status] ?? h.status}</Table.Td>
                        <Table.Td>{h.besaran ?? "-"}</Table.Td>
                        <Table.Td>{h.reconciliationDecision ?? "-"}</Table.Td>
                        <Table.Td>{h.finalizedAt ? new Date(h.finalizedAt).toLocaleDateString("id-ID") : "-"}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Collapse>
            </>
          )}

          <Group justify="space-between" mt="md">
            <Group>
              {mode === "active" && isAdmin && monitoringId && selected?.monitoring?.status === "SUBMITTED" && (
                <>
                  <Button color="green" onClick={() => finalize()}>Finalisasi</Button>
                  <Button color="orange" variant="light" onClick={() => setActionModal("return")}>Kembalikan</Button>
                </>
              )}
              {mode === "active" && isAdmin && monitoringId && selected?.monitoring?.status === "FINAL" && (
                <Button variant="light" onClick={() => setActionModal("revise")}>Buat Revisi Koreksi</Button>
              )}
            </Group>
            <Group>
              <Button variant="default" onClick={() => setOpened(false)}>Tutup</Button>
              {canEdit && (
                <>
                  <Button variant="light" loading={saving} onClick={saveDraft}>Simpan Draf</Button>
                  <Button loading={saving} onClick={submit}>Ajukan</Button>
                </>
              )}
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmModal !== null}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.type === "ASSESSMENT_CHANGED"
            ? "Hasil Resmi Berubah"
            : "Rekonsiliasi Koreksi"
        }
      >
        {confirmModal?.type === "ASSESSMENT_CHANGED" ? (
          <Stack>
            <Alert color="orange" variant="light">
              Matriks atau selera berubah sejak hasil diajukan. Nilai final akan
              dihitung ulang dari konfigurasi terbaru. Tinjau perubahan sebelum
              melanjutkan.
            </Alert>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setConfirmModal(null)}>Batal</Button>
              <Button onClick={confirmFinalize}>Tinjau &amp; Finalisasi</Button>
            </Group>
          </Stack>
        ) : (
          <Stack>
            <Alert color="red" variant="light">
              Penerus #{confirmModal?.successorId} berstatus{" "}
              {confirmModal?.successorStatus}. Pilih keputusan rekonsiliasi dan
              tuliskan alasannya. Sistem tidak akan mengubah penerus yang sudah
              disahkan secara otomatis.
            </Alert>
            <Select
              label="Keputusan rekonsiliasi *"
              value={reconcileDecision}
              onChange={(value) => setReconcileDecision(value ?? "KEEP_ACTIVE_CHAIN")}
              data={(confirmModal?.options ?? ["KEEP_ACTIVE_CHAIN", "MARK_FOR_REVIEW"]).map(
                (option) => ({
                  value: option,
                  label:
                    option === "KEEP_ACTIVE_CHAIN"
                      ? "Pertahankan rantai aktif"
                      : option === "MARK_FOR_REVIEW"
                      ? "Tandai untuk ditinjau"
                      : option,
                })
              )}
            />
            <Textarea
              label="Catatan rekonsiliasi *"
              minRows={3}
              value={reconcileNote}
              onChange={(event) => setReconcileNote(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setConfirmModal(null)}>Batal</Button>
              <Button onClick={confirmFinalize}>Simpan &amp; Finalisasi</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={actionModal !== null}
        onClose={() => setActionModal(null)}
        title={actionModal === "return" ? "Kembalikan Pemantauan" : "Buat Revisi Koreksi"}
      >
        <Stack>
          <Textarea
            label="Alasan *"
            minRows={3}
            value={actionReason}
            onChange={(e) => setActionReason(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setActionModal(null)}>Batal</Button>
            <Button onClick={submitActionModal}>Kirim</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function warnaToMantine(warna?: string | null) {
  switch (String(warna ?? "").toLowerCase()) {
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
}

function statusColor(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "blue";
    case "RETURNED":
      return "red";
    case "FINAL":
      return "green";
    case "SUPERSEDED":
      return "gray";
    case "BELUM_DIISI":
      return "orange";
    default:
      return "yellow";
  }
}
