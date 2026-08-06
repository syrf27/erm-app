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
  Badge,
  Loader,
  Center,
  Stack,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBell, IconAlertCircle, IconCheck } from "@tabler/icons-react";

export default function NotificationCenterPage() {
  const { result, query } = useList({
    resource: "rencana-penanganan",
    pagination: { mode: "off" },
  });

  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const rtpList = useMemo(() => result?.data ?? [], [result?.data]);

  // A risk is urgent / pending realisasi if realisasiOutput or realisasiWaktu is empty or null
  const pendingRealisationRtp = useMemo(() => {
    return rtpList.filter((r: any) => {
      const hasRealisasi = r.realisasiOutput && r.realisasiWaktu;
      return !hasRealisasi;
    });
  }, [rtpList]);

  const sendReminder = async (rtpId: number, silent = false) => {
    try {
      if (!silent) setSendingId(rtpId);
      const res = await fetch("/api/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtpId }),
      });

      if (!res.ok) {
        throw new Error("Gagal mengirim pengingat");
      }

      if (!silent) {
        notifications.show({
          title: "Berhasil",
          message: "Notifikasi pengingat berhasil dikirim ke seluruh anggota Tim",
          color: "green",
        });
      }
    } catch (error: any) {
      if (!silent) {
        notifications.show({
          title: "Gagal",
          message: error?.message || "Terjadi kesalahan saat mengirim pengingat",
          color: "red",
        });
      }
    } finally {
      if (!silent) setSendingId(null);
    }
  };

  const sendAllReminders = async () => {
    if (pendingRealisationRtp.length === 0) return;
    try {
      setSendingAll(true);
      for (const r of pendingRealisationRtp) {
        await sendReminder(Number(r.id), true);
      }
      notifications.show({
        title: "Berhasil",
        message: `Berhasil mengirim ${pendingRealisationRtp.length} pengingat ke Tim Kerja masing-masing`,
        color: "green",
      });
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: "Gagal mengirim sebagian pengingat",
        color: "red",
      });
    } finally {
      setSendingAll(false);
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
    <Stack gap="lg" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Pusat Notifikasi &amp; Urgensi Risiko</Title>
          <Text size="sm" c="dimmed">
            Pantau dan ingatkan Tim Kerja yang belum merealisasikan rencana penanganan risikonya.
          </Text>
        </div>
        {pendingRealisationRtp.length > 0 && (
          <Button
            leftSection={<IconBell size={16} />}
            color="red"
            loading={sendingAll}
            onClick={sendAllReminders}
          >
            Ingatkan Semua ({pendingRealisationRtp.length})
          </Button>
        )}
      </Group>

      {pendingRealisationRtp.length === 0 ? (
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm">
            <Center style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: "#e6fcf5" }}>
              <IconCheck size={32} color="#099268" />
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
            <Table highlightOnHover verticalSpacing="md" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 60 }}>No</Table.Th>
                  <Table.Th>Risiko</Table.Th>
                  <Table.Th>Penanggung Jawab (Tim)</Table.Th>
                  <Table.Th>Rencana Penanganan (RTP)</Table.Th>
                  <Table.Th>Target Waktu</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ width: 150 }} align="center">Aksi</Table.Th>
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
                        <Button
                          variant="light"
                          color="red"
                          size="xs"
                          leftSection={<IconBell size={14} />}
                          loading={sendingId === Number(r.id)}
                          onClick={() => sendReminder(Number(r.id))}
                        >
                          Ingatkan
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Card>
        </>
      )}
    </Stack>
  );
}
