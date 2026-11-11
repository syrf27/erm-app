"use client";

import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import {
  Title,
  Card,
  Table,
  Button,
  Group,
  Text,
  Textarea,
  Badge,
  Loader,
  Center,
  Stack,
  Alert,
  ScrollArea,
  Modal,
  Radio,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBell, IconAlertCircle, IconCheck, IconBrandWhatsapp, IconHistory } from "@tabler/icons-react";
import type { ManualWhatsAppRecipient, WhatsAppReminderPreview } from "@/lib/whatsapp-notification";

type ReminderLog = {
  id: number;
  channel: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientSource: string | null;
  status: string;
  providerMessageId: string | null;
  error: string | null;
  sentBy: string | null;
  createdAt: string;
  rencanaPenanganan?: { identifikasiRisiko?: { risiko?: string | null } | null } | null;
};

export default function NotificationCenterPage() {
  const { result, query } = useList({
    resource: "rencana-penanganan",
    pagination: { mode: "off" },
  });

  const [sendingAll, setSendingAll] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderIds, setReminderIds] = useState<number[]>([]);
  const [reminderChannel, setReminderChannel] = useState<"push" | "whatsapp">("push");
  const [previews, setPreviews] = useState<WhatsAppReminderPreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [manualNumbers, setManualNumbers] = useState("");
  const [previewedManualNumbers, setPreviewedManualNumbers] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ReminderLog[]>([]);
  const [historyRtp, setHistoryRtp] = useState<{ id: number; risk: string } | null>(null);

  const rtpList = useMemo(() => result?.data ?? [], [result?.data]);

  // A risk is urgent / pending realisasi if realisasiOutput or realisasiWaktu is empty or null
  const pendingRealisationRtp = useMemo(() => {
    return rtpList.filter((r: any) => {
      const hasRealisasi = r.realisasiOutput && r.realisasiWaktu;
      return !hasRealisasi;
    });
  }, [rtpList]);

  const parseManualRecipients = (value: string): ManualWhatsAppRecipient[] =>
    value
      .split(/[\n,;]+/)
      .map((phone) => phone.trim())
      .filter(Boolean)
      .slice(0, 50)
      .map((phone, index) => ({ phone, name: `Penerima manual ${index + 1}` }));

  const loadReminderPreviews = async (ids: number[], manualValue: string) => {
    const manualRecipients = parseManualRecipients(manualValue);
    setPreviewLoading(true);
    try {
      const results = await Promise.all(ids.map(async (rtpId) => {
        const res = await fetch("/api/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rtpId, channel: "preview", manualRecipients }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result?.error || "Gagal mengambil nomor tujuan");
        return result.whatsapp as WhatsAppReminderPreview;
      }));
      setPreviews(results);
      setPreviewedManualNumbers(manualValue);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openReminderModal = async (ids: number[]) => {
    setReminderIds(ids);
    setReminderChannel("push");
    setManualNumbers("");
    setPreviewedManualNumbers("");
    setPreviews([]);
    setReminderModalOpen(true);
    try {
      await loadReminderPreviews(ids, "");
    } catch (error: any) {
      setReminderModalOpen(false);
      notifications.show({
        title: "Gagal",
        message: error?.message || "Gagal mengambil informasi penerima",
        color: "red",
      });
    }
  };

  const sendReminder = async () => {
    try {
      setSending(true);
      const manualRecipients = reminderChannel === "whatsapp"
        ? parseManualRecipients(manualNumbers)
        : [];
      for (const rtpId of reminderIds) {
        const res = await fetch("/api/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rtpId, channel: reminderChannel, manualRecipients }),
        });
        if (!res.ok) throw new Error("Gagal mengirim pengingat");
      }

      notifications.show({
        title: "Berhasil",
        message: `${reminderChannel === "whatsapp" ? "WhatsApp" : "Push notification"} berhasil dikirim untuk ${reminderIds.length} risiko.`,
        color: "green",
      });
      setReminderModalOpen(false);
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error?.message || "Terjadi kesalahan saat mengirim pengingat",
        color: "red",
      });
    } finally {
      setSending(false);
    }
  };

  const sendAllReminders = async () => {
    if (pendingRealisationRtp.length === 0) return;
    setSendingAll(true);
    await openReminderModal(pendingRealisationRtp.map((r: any) => Number(r.id)));
    setSendingAll(false);
  };

  const handleReminderClick = (rtpId: number) => {
    void openReminderModal([rtpId]);
  };

  const openHistory = async (rtp?: { id: number; risk: string }) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRtp(rtp ?? null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (rtp) params.set("rtpId", String(rtp.id));
      const response = await fetch(`/api/reminder-logs?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Gagal mengambil riwayat pengingat");
      setHistory(result.data ?? []);
    } catch (error: any) {
      notifications.show({ title: "Gagal", message: error?.message || "Gagal mengambil riwayat pengingat", color: "red" });
    } finally {
      setHistoryLoading(false);
    }
  };

  if (query.isPending) {
    return (
      <Center style={{ height: "60vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="sm">
        <div>
          <Title order={3}>Pusat Notifikasi &amp; Urgensi Risiko</Title>
          <Text size="sm" c="dimmed">
            Pantau dan ingatkan Tim Kerja yang belum merealisasikan rencana penanganan risikonya.
          </Text>
        </div>
        {pendingRealisationRtp.length > 0 && (
          <Group>
            <Button variant="light" leftSection={<IconHistory size={16} />} onClick={() => openHistory()}>
              Riwayat Pengingat
            </Button>
            <Button
              leftSection={<IconBell size={16} />}
              color="red"
              loading={sendingAll}
              onClick={sendAllReminders}
            >
              Ingatkan Semua ({pendingRealisationRtp.length})
            </Button>
          </Group>
        )}
        {pendingRealisationRtp.length === 0 && (
          <Button variant="light" leftSection={<IconHistory size={16} />} onClick={() => openHistory()}>
            Riwayat Pengingat
          </Button>
        )}
      </Group>

      {pendingRealisationRtp.length === 0 ? (
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm">
            <Center
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: "light-dark(var(--mantine-color-teal-0), var(--mantine-color-teal-9))",
              }}
            >
              <IconCheck size={32} color="light-dark(var(--mantine-color-teal-7), var(--mantine-color-teal-2))" />
            </Center>
            <Text fw={500} size="lg">Semua Rencana Penanganan Selesai</Text>
            <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 450 }}>
              Semua risiko yang teridentifikasi telah memiliki realisasi penanganan yang lengkap. Tidak ada tindakan pengingat yang diperlukan untuk saat ini.
            </Text>
          </Stack>
        </Card>
      ) : (
        <>
          <Alert color="orange" icon={<IconAlertCircle size={18} />}>
            Terdapat {pendingRealisationRtp.length} Rencana Tindak Penanganan (RTP) yang belum merealisasikan laporannya. Anda dapat mengirimkan pengingat notifikasi ke seluruh anggota Tim Kerja yang bertanggung jawab.
          </Alert>

          <Card withBorder padding="0" radius="md" style={{ overflow: "hidden" }}>
            <ScrollArea type="auto">
              <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md" miw={860}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 60 }}>No</Table.Th>
                    <Table.Th>Risiko</Table.Th>
                    <Table.Th>Penanggung Jawab (Tim)</Table.Th>
                    <Table.Th>Rencana Penanganan (RTP)</Table.Th>
                    <Table.Th>Target Waktu</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ width: 220 }} align="center">Aksi</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pendingRealisationRtp.map((r: any, idx: number) => {
                    const riskName = r.identifikasiRisiko?.risiko || "-";
                    const teamName = r.penanggungJawab || r.identifikasiRisiko?.team?.nama || "Semua Tim";
                    const targetWaktu = r.targetWaktu || "-";

                    return (
                      <Table.Tr key={r.id}>
                        <Table.Td>{idx + 1}</Table.Td>
                        <Table.Td style={{ fontWeight: 500 }}>{riskName}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue">
                            {teamName}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{r.rencanaTidakPenanganan || "-"}</Table.Td>
                        <Table.Td>{targetWaktu}</Table.Td>
                        <Table.Td>
                          <Badge variant="filled" color="orange">
                            Belum Realisasi
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Button.Group>
                            <Button
                              variant="light"
                              color="red"
                              size="xs"
                              leftSection={<IconBell size={14} />}
                              loading={previewLoading && reminderIds.includes(Number(r.id))}
                              onClick={() => handleReminderClick(Number(r.id))}
                            >
                              Ingatkan
                            </Button>
                            <Button
                              variant="light"
                              color="gray"
                              size="xs"
                              leftSection={<IconHistory size={14} />}
                              onClick={() => openHistory({ id: Number(r.id), risk: riskName })}
                            >
                              Riwayat
                            </Button>
                          </Button.Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}

      <Modal
        opened={reminderModalOpen}
        onClose={() => !sending && setReminderModalOpen(false)}
        title="Pilih cara mengingatkan"
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Pilih kanal pengingat. Untuk WhatsApp, periksa nomor tujuan sebelum pesan dikirim.
          </Text>
          <Radio.Group
            value={reminderChannel}
            onChange={(value) => setReminderChannel(value as "push" | "whatsapp")}
            label="Kirim melalui"
          >
            <Group mt="xs">
              <Radio value="push" label="Notifikasi aplikasi" />
              <Radio value="whatsapp" label="WhatsApp" />
            </Group>
          </Radio.Group>

          <Divider />
          <Text fw={600}>Nomor tujuan</Text>
          {reminderChannel === "whatsapp" && (
            <Stack gap="xs">
              <Textarea
                label="Nomor WhatsApp manual (opsional)"
                description="Masukkan satu atau beberapa nomor, pisahkan dengan baris baru, koma, atau titik koma. Jika diisi, nomor manual akan digunakan sebagai penerima pengganti nomor Tim Kerja."
                placeholder={"08123456789\n+6285123456789"}
                value={manualNumbers}
                onChange={(event) => setManualNumbers(event.currentTarget.value)}
                minRows={2}
              />
              <Group justify="flex-end">
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => void loadReminderPreviews(reminderIds, manualNumbers).catch((error: any) => {
                    notifications.show({ title: "Nomor tidak valid", message: error?.message || "Periksa nomor WhatsApp manual.", color: "red" });
                  })}
                  loading={previewLoading}
                >
                  Periksa Nomor
                </Button>
              </Group>
              {manualNumbers !== previewedManualNumbers && manualNumbers.trim() && (
                <Text size="xs" c="orange">Klik “Periksa Nomor” untuk memperbarui pratinjau penerima.</Text>
              )}
            </Stack>
          )}
          {previewLoading ? (
            <Center py="md"><Loader size="sm" /></Center>
          ) : previews.length === 0 ? (
            <Alert color="orange">Tidak ada informasi penerima yang dapat ditampilkan.</Alert>
          ) : (
            <Stack gap="xs">
              {previews.map((preview) => (
                <Card key={preview.rtpId} withBorder padding="sm" radius="sm">
                  <Text size="sm" fw={600}>{preview.teamName}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>{preview.risk}</Text>
                  {preview.recipients.length === 0 ? (
                    <Text size="sm" c="orange" mt={4}>Tim belum memiliki nomor WhatsApp.</Text>
                  ) : (
                    preview.recipients.map((recipient) => (
                      <Group key={`${preview.rtpId}-${recipient.id}`} gap="xs" mt={4}>
                        <IconBrandWhatsapp size={16} color="var(--mantine-color-green-7)" />
                        <Text size="sm">{recipient.name}: {recipient.whatsappNumber || "Nomor belum diisi"}</Text>
                      </Group>
                    ))
                  )}
                </Card>
              ))}
            </Stack>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setReminderModalOpen(false)} disabled={sending}>
              Batal
            </Button>
            <Button
              color={reminderChannel === "whatsapp" ? "green" : "blue"}
              leftSection={reminderChannel === "whatsapp" ? <IconBrandWhatsapp size={16} /> : <IconBell size={16} />}
              onClick={sendReminder}
              loading={sending}
              disabled={previewLoading || (reminderChannel === "whatsapp" && (
                manualNumbers !== previewedManualNumbers ||
                previews.every((p) => p.recipients.length === 0)
              ))}
            >
              Kirim Pengingat
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={
          <Group gap="xs">
            <IconHistory size={18} />
            <span>
              Riwayat Pengingat{historyRtp ? ` — Risiko: ${historyRtp.risk}` : " (Semua)"}
            </span>
          </Group>
        }
        size="xl"
      >
        {historyLoading ? (
          <Center py="xl"><Loader size="sm" /></Center>
        ) : history.length === 0 ? (
          <Alert color="gray">
            {historyRtp ? "Belum ada riwayat pengingat untuk risiko ini." : "Belum ada riwayat pengingat."}
          </Alert>
        ) : (
          <Stack gap="sm">
            {historyRtp && (
              <Group justify="flex-end">
                <Button variant="subtle" size="xs" onClick={() => openHistory()}>
                  Tampilkan semua risiko
                </Button>
              </Group>
            )}
            <ScrollArea type="auto">
              <Table miw={900} striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Waktu</Table.Th>
                    <Table.Th>Risiko</Table.Th>
                    <Table.Th>Kanal</Table.Th>
                    <Table.Th>Penerima</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Pengirim</Table.Th>
                    <Table.Th>Detail</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {history.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{new Date(log.createdAt).toLocaleString("id-ID")}</Table.Td>
                    <Table.Td>{log.rencanaPenanganan?.identifikasiRisiko?.risiko || "-"}</Table.Td>
                    <Table.Td>{log.channel === "whatsapp" ? "WhatsApp" : "Notifikasi aplikasi"}</Table.Td>
                    <Table.Td>{log.recipientName || "-"}{log.recipientPhone ? ` (${log.recipientPhone})` : ""}</Table.Td>
                    <Table.Td>
                      <Badge color={log.status === "sent" ? "green" : log.status === "skipped" ? "yellow" : "red"}>
                        {log.status === "sent" ? "Terkirim" : log.status === "skipped" ? "Dilewati" : "Gagal"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{log.sentBy || "-"}</Table.Td>
                    <Table.Td>{log.error || log.providerMessageId || "-"}</Table.Td>
                  </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
