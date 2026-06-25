"use client";

import { useEffect, useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import {
  Title,
  Button,
  Group,
  Loader,
  Center,
  Stack,
  Text,
  Card,
  Modal,
  TextInput,
  Textarea,
  Table,
  Badge,
  ActionIcon,
  SegmentedControl,
  FileButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPencil, IconUpload, IconLink, IconExternalLink, IconFileText } from "@tabler/icons-react";
import { Pagination } from "@/components/pagination";

interface RiskRow {
  identId: number;
  rencanaId: number | null;
  no: number;
  prioritas: string;
  prioritasWarna: string;
  rencanaTindakPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  realisasiWaktu: string;
  realisasiOutput: string;
  dokumenPendukung: string;
}

export default function PemantauanRisikoPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RiskRow | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal Fields
  const [modalWaktu, setModalWaktu] = useState("");
  const [modalOutput, setModalOutput] = useState("");
  const [modalDocType, setModalDocType] = useState<"link" | "upload">("link");
  const [modalDocLink, setModalDocLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);

  const identResult = useList({ 
    resource: "identifikasi-risiko", 
    pagination: { mode: "off" } // Need all for filtering
  });
  const analisisResult = useList({ 
    resource: "analisis-risiko", 
    pagination: { mode: "off" }
  });
  const evaluasiResult = useList({ 
    resource: "evaluasi-risiko", 
    pagination: { mode: "off" }
  });
  const rencanaResult = useList({ 
    resource: "rencana-penanganan", 
    pagination: { mode: "off" }
  });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (rencanaResult.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const evaluasiData = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const rencanaData = useMemo(() => rencanaResult.result?.data ?? [], [rencanaResult.result?.data]);
  const refetchQuery = rencanaResult.query?.refetch;

  // Compile data row mapping
  const allRows = useMemo((): RiskRow[] => {
    if (loading) return [];
    
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    const evaluasiById = new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e]));
    const rencanaById = new Map(rencanaData.map((r: any) => [r.identifikasiRisikoId, r]));

    // Only filter risks with respon "Mengurangi Risiko"
    const filtered = identifikasiData.filter((r: Record<string, any>) => {
      const ev = evaluasiById.get(r.id);
      return ev?.responRisiko === "Mengurangi Risiko";
    });

    return filtered.map((r: Record<string, any>, index): RiskRow => {
      const an = analisisById.get(r.id);
      const rp = rencanaById.get(r.id);

      return {
        identId: r.id,
        rencanaId: rp?.id ?? null,
        no: index + 1,
        prioritas: an?.levelRisiko?.nama ?? "Sedang",
        prioritasWarna: an?.levelRisiko?.warna ?? "Kuning",
        rencanaTindakPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        dokumenPendukung: rp?.dokumenPendukung ?? "",
      };
    });
  }, [loading, identifikasiData, analisisData, evaluasiData, rencanaData]);

  // Paginate rows
  const totalRows = allRows.length;
  const tableRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allRows.slice(start, end).map((row, idx) => ({ ...row, no: start + idx + 1 }));
  }, [allRows, currentPage, pageSize]);

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const convertToInputDate = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY
  const convertToDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  // Open Edit Modal for a row
  const openEditModal = (row: RiskRow) => {
    setSelectedRow(row);
    setModalWaktu(convertToInputDate(row.realisasiWaktu));
    setModalOutput(row.realisasiOutput);
    
    // Check if the current value looks like a link or local uploaded file path
    const isLocalUpload = row.dokumenPendukung.startsWith("/uploads/") || row.dokumenPendukung.startsWith("/api/uploads/");
    if (isLocalUpload) {
      setModalDocType("upload");
      const cleanName = row.dokumenPendukung.replace("/api/uploads/", "").replace("/uploads/", "");
      setUploadedFile({
        name: cleanName.split("_").slice(1).join("_") || "File Pendukung",
        url: row.dokumenPendukung
      });
      setModalDocLink("");
    } else {
      setModalDocType("link");
      setModalDocLink(row.dokumenPendukung);
      setUploadedFile(null);
    }

    setModalOpened(true);
  };

  // Upload file logic
  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal mengupload berkas");
      const data = await res.json();
      
      setUploadedFile({ name: data.filename, url: data.url });
      notifications.show({ title: "Berhasil", message: "Berkas berhasil diupload", color: "green" });
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal mengupload berkas", color: "red" });
    } finally {
      setUploading(false);
    }
  };

  // Submit Modal Save
  const handleSaveModal = async () => {
    if (!selectedRow) return;

    let docValue = "";
    if (modalDocType === "upload") {
      docValue = uploadedFile?.url ?? "";
    } else {
      docValue = modalDocLink;
    }

    const payload = {
      realisasiWaktu: convertToDisplayDate(modalWaktu) || null,
      realisasiOutput: modalOutput || null,
      dokumenPendukung: docValue || null,
    };

    try {
      if (selectedRow.rencanaId === null) {
        // Create new record
        const res = await fetch("/api/rencana-penanganan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, identifikasiRisikoId: selectedRow.identId }),
        });
        if (!res.ok) throw new Error("Gagal menyimpan realisasi");
      } else {
        // Update existing record
        const res = await fetch(`/api/rencana-penanganan/${selectedRow.rencanaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Gagal memperbarui realisasi");
      }

      notifications.show({ title: "Tersimpan", message: "Realisasi pemantauan berhasil disimpan", color: "green" });
      setModalOpened(false);
      if (refetchQuery) refetchQuery();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal menyimpan realisasi", color: "red" });
    }
  };

  const getBadgeColor = (warna: string) => {
    switch (warna?.toLowerCase()) {
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
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Pemantauan Risiko</Title>
        <Text size="xs" c="dimmed" mt={4}>
          Pemantauan Risiko diisi apabila sudah dilaksanakan RTP-nya sesuai Target Waktunya dan sertakan pula dokumen pendukungnya.
        </Text>
      </div>

      <Card withBorder padding="0" radius="md" style={{ overflow: "hidden" }}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          style={{ fontSize: 13, borderCollapse: "collapse", width: "100%" }}
        >
          <Table.Thead>
            {/* First Row of headers */}
            <Table.Tr>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 50 }}>No</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 110 }}>Prioritas</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center" }}>Rencana Tindak Penanganan</Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center" }}>Target</Table.Th>
              <Table.Th colSpan={3} style={{ textAlign: "center" }}>Realisasi</Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 70 }}>Aksi</Table.Th>
            </Table.Tr>
            {/* Second Row of headers */}
            <Table.Tr>
              <Table.Th style={{ textAlign: "center", width: 120 }}>Waktu</Table.Th>
              <Table.Th style={{ textAlign: "center", width: 160 }}>Output</Table.Th>
              <Table.Th style={{ textAlign: "center", width: 120 }}>Waktu</Table.Th>
              <Table.Th style={{ textAlign: "center", width: 160 }}>Output</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Dokumen Pendukung</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {tableRows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={9} align="center" style={{ color: "var(--mantine-color-gray-5)", padding: "20px 0" }}>
                  {totalRows === 0 
                    ? 'Belum ada Rencana Tindak Penanganan dengan Respon "Mengurangi Risiko".'
                    : 'Tidak ada data pada halaman ini.'}
                </Table.Td>
              </Table.Tr>
            ) : (
              tableRows.map((row) => (
                <Table.Tr key={row.identId}>
                  <Table.Td align="center">{row.no}</Table.Td>
                  <Table.Td align="center">
                    <Badge color={getBadgeColor(row.prioritasWarna)} variant="filled" size="sm">
                      {row.prioritas}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.rencanaTindakPenanganan || <Text size="xs" c="dimmed">Belum diisi</Text>}</Table.Td>
                  <Table.Td align="center">{row.targetWaktu || "-"}</Table.Td>
                  <Table.Td>{row.targetOutput || "-"}</Table.Td>
                  <Table.Td align="center" style={{ fontWeight: 600 }}>{row.realisasiWaktu || "-"}</Table.Td>
                  <Table.Td>{row.realisasiOutput || "-"}</Table.Td>
                  <Table.Td>
                    {row.dokumenPendukung ? (
                      <Group gap="xs" style={{ wordBreak: "break-all" }}>
                        <IconFileText size={16} color="#495057" />
                        <Text
                          component="a"
                          href={row.dokumenPendukung.startsWith("/uploads/") ? row.dokumenPendukung.replace("/uploads/", "/api/uploads/") : row.dokumenPendukung}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                          c="blue"
                          style={{ textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}
                        >
                          Buka Dokumen
                          <IconExternalLink size={10} />
                        </Text>
                      </Group>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    <ActionIcon
                      variant="filled"
                      color="gray"
                      onClick={() => openEditModal(row)}
                      title="Update Realisasi"
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {totalRows > 0 && (
        <Pagination
          current={currentPage}
          total={totalRows}
          pageSize={pageSize}
          onChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          showSizeChanger
          showTotal
        />
      )}

      {/* Edit Realisasi Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Input Realisasi Pemantauan Risiko"
        size="md"
        radius="md"
      >
        <Stack gap="md">
          {selectedRow && (
            <Card withBorder padding="xs" bg="var(--mantine-color-gray-0)">
              <Text size="xs" fw={700} c="dimmed">RTP:</Text>
              <Text size="xs" fw={600} mt={2}>{selectedRow.rencanaTindakPenanganan}</Text>
            </Card>
          )}

          <TextInput
            type="date"
            label="Realisasi Waktu"
            value={modalWaktu}
            onChange={(e) => setModalWaktu(e.currentTarget.value)}
          />

          <Textarea
            label="Realisasi Output"
            placeholder="Deskripsi output pelaksanaan penanganan"
            minRows={3}
            value={modalOutput}
            onChange={(e) => setModalOutput(e.currentTarget.value)}
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>Metode Dokumen Pendukung</Text>
            <SegmentedControl
              value={modalDocType}
              onChange={(val: any) => setModalDocType(val)}
              data={[
                { label: "Input Link", value: "link" },
                { label: "Upload File", value: "upload" },
              ]}
              mb="xs"
            />
          </Stack>

          {modalDocType === "link" ? (
            <TextInput
              label="Link Dokumen Pendukung"
              placeholder="https://drive.google.com/..."
              value={modalDocLink}
              onChange={(e) => setModalDocLink(e.currentTarget.value)}
              rightSection={<IconLink size={16} color="#adb5bd" />}
            />
          ) : (
            <Stack gap="xs">
              <Text size="xs" fw={500} c="dimmed">Unggah dokumen pendukung pelaksanaan RTP</Text>
              <Group>
                <FileButton onChange={handleFileUpload} accept="*">
                  {(props) => (
                    <Button {...props} leftSection={<IconUpload size={16} />} loading={uploading}>
                      Pilih Berkas
                    </Button>
                  )}
                </FileButton>
                {uploadedFile && (
                  <Text size="xs" c="dimmed" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <IconFileText size={14} />
                    {uploadedFile.name}
                  </Text>
                )}
              </Group>
            </Stack>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveModal}>
              Simpan Realisasi
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
