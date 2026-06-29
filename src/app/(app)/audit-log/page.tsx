"use client";

import { useState, useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import {
  Stack,
  Title,
  Table,
  Card,
  Text,
  Group,
  TextInput,
  Select,
  Button,
  Badge,
  Loader,
  Center,
  Paper,
  Modal,
  ScrollArea,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconSearch, IconFilter, IconDownload, IconEye } from "@tabler/icons-react";
import { Pagination } from "@/components/pagination";

interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

const actionColors: Record<string, string> = {
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  VIEW: "gray",
  LOGIN: "teal",
  LOGOUT: "orange",
  DOWNLOAD: "violet",
  UPLOAD: "cyan",
  APPROVE: "lime",
  REJECT: "pink",
};

// Strip ::ffff: IPv6 prefix from localhost IPs
const cleanIP = (ip: string | null): string => {
  if (!ip) return "-";
  return ip.replace(/^::ffff:/i, "");
};

// Format details object as human-readable key-value pairs
const formatDetails = (details: any): string => {
  if (!details || typeof details !== "object") return "-";
  const entries = Object.entries(details);
  if (entries.length === 0) return "-";
  return entries.map(([key, val]) => `${key}: ${JSON.stringify(val)}`).join("; ");
};

export default function AuditLogPage() {
  const { data: identity, isPending: isIdentityLoading } = useGetIdentity<any>();
  const router = useRouter();

  useEffect(() => {
    if (!isIdentityLoading && identity && (!identity.permissions || !identity.permissions.includes("audit-logs:read"))) {
      notifications.show({
        title: "Akses Ditolak",
        message: "Anda tidak memiliki hak akses untuk membuka halaman ini.",
        color: "red",
      });
      router.push("/");
    }
  }, [identity, isIdentityLoading, router]);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState<string | null>(null);
  const [resource, setResource] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsModalOpened, setDetailsModalOpened] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (userId) params.append("userId", userId);
      if (action) params.append("action", action);
      if (resource) params.append("resource", resource);
      if (dateRange[0]) params.append("startDate", dateRange[0].toISOString());
      if (dateRange[1]) params.append("endDate", dateRange[1].toISOString());

      const response = await fetch(`/api/audit-logs?${params}`);
      const data = await response.json();

      setLogs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, userId, action, resource, dateRange]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleReset = () => {
    setUserId("");
    setAction(null);
    setResource(null);
    setDateRange([null, null]);
    setSearchTerm("");
    setPage(1);
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Resource", "Resource ID", "IP Address", "Details"];
    const csvData = logs.map((log) => [
      dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss"),
      `${log.userName} (${log.userId})`,
      log.action,
      log.resource,
      log.resourceId || "-",
      log.ipAddress || "-",
      JSON.stringify(log.details || {}),
    ]);

    const csv = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(search) ||
      log.userId.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.resource.toLowerCase().includes(search)
    );
  });

  if (isIdentityLoading || (identity && identity.role !== "admin")) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Audit Log</Title>
        <Button leftSection={<IconDownload size={16} />} onClick={exportToCSV} disabled={logs.length === 0}>
          Export CSV
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" fw={500}>Filter Audit Logs</Text>
            <Button variant="subtle" size="xs" onClick={handleReset}>Reset Filter</Button>
          </Group>

          <Group grow>
            <TextInput placeholder="Search..." leftSection={<IconSearch size={16} />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <TextInput placeholder="User ID / Email" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </Group>

          <Group grow>
            <Select
              placeholder="Select Action"
              data={[
                { value: "CREATE", label: "Create" },
                { value: "UPDATE", label: "Update" },
                { value: "DELETE", label: "Delete" },
                { value: "VIEW", label: "View" },
                { value: "LOGIN", label: "Login" },
                { value: "LOGOUT", label: "Logout" },
                { value: "DOWNLOAD", label: "Download" },
                { value: "UPLOAD", label: "Upload" },
                { value: "APPROVE", label: "Approve" },
                { value: "REJECT", label: "Reject" },
              ]}
              value={action}
              onChange={setAction}
              clearable
            />
            <Select
              placeholder="Select Resource"
              data={[
                { value: "sasaran", label: "Sasaran" },
                { value: "prosesBisnis", label: "Proses Bisnis" },
                { value: "pemangkuKepentingan", label: "Pemangku Kepentingan" },
                { value: "peraturanPerundangan", label: "Peraturan Perundangan" },
                { value: "jenisRisiko", label: "Jenis Risiko" },
                { value: "sumberRisiko", label: "Sumber Risiko" },
                { value: "kategoriRisiko", label: "Kategori Risiko" },
                { value: "areaDampak", label: "Area Dampak" },
                { value: "levelKemungkinan", label: "Level Kemungkinan" },
                { value: "levelDampak", label: "Level Dampak" },
                { value: "levelRisiko", label: "Level Risiko" },
                { value: "opsiPenanganan", label: "Opsi Penanganan" },
                { value: "kriteriaKemungkinan", label: "Kriteria Kemungkinan" },
                { value: "kriteriaDampak", label: "Kriteria Dampak" },
                { value: "seleraRisiko", label: "Selera Risiko" },
                { value: "identifikasiRisiko", label: "Identifikasi Risiko" },
                { value: "analisisRisiko", label: "Analisis Risiko" },
                { value: "evaluasiRisiko", label: "Evaluasi Risiko" },
                { value: "rencanaPenanganan", label: "Rencana Penanganan / Pemantauan" },
                { value: "kri", label: "KRI" },
                { value: "matriksAnalisisRisiko", label: "Matriks Analisis Risiko" },
              ]}
              value={resource}
              onChange={setResource}
              clearable
            />
          </Group>

          <DatePickerInput type="range" placeholder="Select date range" value={dateRange} onChange={setDateRange} clearable />
        </Stack>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Total: {total} records</Text>
            <Text size="sm" c="dimmed">Page {page} of {totalPages}</Text>
          </Group>

          {loading ? (
            <Center p="xl"><Loader /></Center>
          ) : filteredLogs.length === 0 ? (
            <Center p="xl"><Text c="dimmed">No audit logs found</Text></Center>
          ) : (
            <>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Timestamp</Table.Th>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th>Resource</Table.Th>
                    <Table.Th>IP Address</Table.Th>
                    <Table.Th>Details</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredLogs.map((log) => (
                    <Table.Tr key={log.id}>
                      <Table.Td><Text size="sm">{dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss")}</Text></Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>{log.userName}</Text>
                          <Text size="xs" c="dimmed">{log.userId}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td><Badge color={actionColors[log.action] || "gray"} style={{ minWidth: "fit-content" }}>{log.action}</Badge></Table.Td>
                      <Table.Td><Text size="sm">{log.resource}</Text></Table.Td>
                      <Table.Td><Text size="sm">{cleanIP(log.ipAddress)}</Text></Table.Td>
                      <Table.Td align="center">
                        {log.details ? (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailsModalOpened(true);
                            }}
                            title="View Details"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        ) : (
                          <Text size="xs" c="dimmed">-</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                showSizeChanger
                showTotal
              />
            </>
          )}
        </Stack>
      </Card>
    

      {/* Details Modal */}
      <Modal
        opened={detailsModalOpened}
        onClose={() => setDetailsModalOpened(false)}
        title="Audit Log Details"
        size="lg"
        radius="md"
      >
        {selectedLog && (
          <Stack gap="md">
            <Group>
              <Text fw={600} size="sm">Timestamp:</Text>
              <Text size="sm">{dayjs(selectedLog.timestamp).format("YYYY-MM-DD HH:mm:ss")}</Text>
            </Group>
            <Group>
              <Text fw={600} size="sm">User:</Text>
              <Text size="sm">{selectedLog.userName} (ID: {selectedLog.userId})</Text>
            </Group>
            <Group>
              <Text fw={600} size="sm">Action:</Text>
              <Badge color={actionColors[selectedLog.action.toLowerCase()] || "gray"}>
                {selectedLog.action}
              </Badge>
            </Group>
            <Group>
              <Text fw={600} size="sm">Resource:</Text>
              <Text size="sm">{selectedLog.resource}</Text>
            </Group>
            <Group>
              <Text fw={600} size="sm">Resource ID:</Text>
              <Text size="sm">{selectedLog.resourceId || "-"}</Text>
            </Group>
            <Group>
              <Text fw={600} size="sm">IP Address:</Text>
              <Text size="sm">{cleanIP(selectedLog.ipAddress)}</Text>
            </Group>
            <div>
              <Text fw={600} size="sm" mb="xs">Details:</Text>
              <ScrollArea h={200}>
                <Paper p="sm" withBorder radius="md" style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
                  <Stack gap="xs">
                    {selectedLog.details && typeof selectedLog.details === "object" ? (
                      Object.entries(selectedLog.details).map(([key, value]) => (
                        <Group key={key} gap="xs">
                          <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>{key}:</Text>
                          <Text size="sm" style={{ wordBreak: "break-word", flex: 1 }}>
                            {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                          </Text>
                        </Group>
                      ))
                    ) : (
                      <Text size="sm" c="dimmed">No details available</Text>
                    )}
                  </Stack>
                </Paper>
              </ScrollArea>
            </div>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}