"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import {
  KEWAJIBAN_STATUS_LABEL,
  RISK_CYCLE_LABEL,
} from "@/lib/risk-cycle";

interface FollowUpRow {
  obligationId: number | null;
  statusKewajiban: string | null;
  status: string;
  riskId: number | null;
  risiko: string;
  monitoring: { tahun: number; triwulan: number } | null;
  followUpRiskId: number | null;
  followUpStatus: string | null;
  followUpStatusLabel: string | null;
  team: { id: number; nama: string } | null;
  tahun: number | null;
  triwulan: number | null;
  createdAt: string | null;
}

export default function RisikoLanjutanListPage() {
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/risiko-lanjutan");
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Gagal memuat");
      setRows(payload.rows ?? []);
      setCounts(payload.counts ?? {});
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Center h={300}><Loader /></Center>;
  if (error) return <Alert color="red" icon={<IconAlertTriangle />} title="Gagal memuat">{error}</Alert>;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Tindak Lanjut Wajib</Title>
          <Text size="xs" c="dimmed" mt={4}>
            Risiko lanjutan otomatis dari pemantauan yang belum mencapai selera. Wajib dilengkapi tim dan disahkan Admin.
          </Text>
        </div>
        <Button variant="light" leftSection={<IconRefresh size={14} />} onClick={load}>
          Muat Ulang
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Wajib dilengkapi</Text>
          <Text fw={800} fz={24} c="red">{counts.wajib ?? 0}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Menunggu validasi</Text>
          <Text fw={800} fz={24} c="blue">{counts.menungguValidasi ?? 0}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Draf lanjutan</Text>
          <Text fw={800} fz={24}>{counts.draf ?? 0}</Text>
        </Card>
      </SimpleGrid>

      <Card withBorder padding="0" radius="md" style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Risiko Asal</Table.Th>
              <Table.Th>Tim</Table.Th>
              <Table.Th>Pemicu</Table.Th>
              <Table.Th>Target</Table.Th>
              <Table.Th>Status Lanjutan</Table.Th>
              <Table.Th>Kewajiban</Table.Th>
              <Table.Th>Usia</Table.Th>
              <Table.Th>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8} ta="center" c="dimmed" py="md">
                  Tidak ada tindak lanjut terbuka.
                </Table.Td>
              </Table.Tr>
            )}
            {rows.map((row) => (
              <Table.Tr key={`${row.followUpRiskId}-${row.obligationId}-${row.riskId}`}>
                <Table.Td style={{ maxWidth: 320 }}>{row.risiko}</Table.Td>
                <Table.Td>{row.team?.nama ?? "-"}</Table.Td>
                <Table.Td>
                  {row.monitoring
                    ? `TW ${row.monitoring.triwulan} ${row.monitoring.tahun}`
                    : "-"}
                </Table.Td>
                <Table.Td>
                  {row.triwulan ? `TW ${row.triwulan} ${row.tahun ?? ""}` : "-"}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">
                    {row.followUpStatusLabel ??
                      (row.followUpStatus
                        ? RISK_CYCLE_LABEL[row.followUpStatus]
                        : "-")}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {row.statusKewajiban ? (
                    <Badge color={row.statusKewajiban === "WAJIB" ? "red" : "blue"} variant="light">
                      {KEWAJIBAN_STATUS_LABEL[row.statusKewajiban] ?? row.statusKewajiban}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </Table.Td>
                <Table.Td>
                  {row.createdAt
                    ? `${Math.max(
                        0,
                        Math.floor(
                          (Date.now() - new Date(row.createdAt).getTime()) /
                            (24 * 60 * 60 * 1000)
                        )
                      )} hari`
                    : "-"}
                </Table.Td>
                <Table.Td>
                  {row.followUpRiskId ? (
                    <Link href={`/manajemen-risiko/risiko-lanjutan/${row.followUpRiskId}`}>
                      <Button size="xs" variant="light">Buka</Button>
                    </Link>
                  ) : (
                    "-"
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
