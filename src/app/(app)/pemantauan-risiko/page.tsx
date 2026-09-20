"use client";

import { useEffect, useState, useMemo } from "react";
import { useCreate, useUpdate, useCustom, useList } from "@refinedev/core";
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
  Select,
  Collapse,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPencil,
  IconExternalLink,
  IconFileText,
  IconSearch,
} from "@tabler/icons-react";
import { Pagination } from "@/components/pagination";
import { FileDropUpload } from "@/components/file-drop-upload";
import { useYear } from "@/lib/year-context";
import { getSafeDocumentHref, isSafeAppUrl } from "@/lib/safe-url";

interface RiskRow {
  identId: number;
  rencanaId: number | null;
  no: number;
  prioritas: string;
  prioritasWarna: string;
  rencanaTindakPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  keterjadiRisiko: string;
  realisasiWaktu: string;
  realisasiOutput: string;
  residualLevelKemungkinanId: number | null;
  residualLevelDampakId: number | null;
  residualLevelKemungkinan: string;
  residualLevelDampak: string;
  dokumenPendukung: string;
  dokumenPendukungs: Array<{ id: number; title: string; url: string }>;
}

interface OfficeMeeting {
  id: number;
  uuid: string;
  agenda: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  pemimpin: string;
  notulis: string;
  status: string;
  ruangan: string;
  pesertaCount: number;
}

export default function PemantauanRisikoPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RiskRow | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const { tahunDari, tahunSampai } = useYear();

  // Modal Fields
  const [modalWaktu, setModalWaktu] = useState("");
  const [modalOutput, setModalOutput] = useState("");
  const [modalKeterjadian, setModalKeterjadian] = useState("");
  const [modalResidualKemungkinan, setModalResidualKemungkinan] = useState("");
  const [modalResidualDampak, setModalResidualDampak] = useState("");
  const [uploading, setUploading] = useState(false);
  const [meetingKeyword, setMeetingKeyword] = useState("");
  const [meetingSearching, setMeetingSearching] = useState(false);
  const [meetingResults, setMeetingResults] = useState<OfficeMeeting[]>([]);
  const [meetingError, setMeetingError] = useState("");
  const [importingMeetingId, setImportingMeetingId] = useState<number | null>(null);
  const [modalDocs, setModalDocs] = useState<Array<{
    id?: number;
    title: string;
    url: string;
    docType: "link" | "upload";
    uploadedName: string;
  }>>([]);
  const [officeSourceOpened, setOfficeSourceOpened] = useState(false);

  const result = useCustom({
    url: "/api/custom-pemantauan-risiko",
    method: "get",
    config: {
      query: {
        tahunDari,
        tahunSampai,
      },
    },
  });
  const kemungkinanList = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const dampakList = useList({ resource: "level-dampak", pagination: { mode: "off" } });
  const kemungkinanOptions = (kemungkinanList.result?.data ?? []).map((item: any) => ({ value: String(item.id), label: item.nama }));
  const dampakOptions = (dampakList.result?.data ?? []).map((item: any) => ({ value: String(item.id), label: item.nama }));

  const customData = result.result;
  const isLoading = result.query.isLoading;
  const refetchQuery = result.query.refetch;

  console.log("Pemantauan Page useCustom query status:", {
    isLoading,
    dataExists: !!customData,
    data: customData
  });

  const { mutate: createMutate } = useCreate();
  const { mutate: updateMutate } = useUpdate();
  const loading = isLoading;

  // Compile data row mapping
  const allRows = useMemo((): RiskRow[] => {
    if (loading) return [];
    
    // Support both direct array response and wrapped data objects
    const list = Array.isArray(customData?.data)
      ? customData.data
      : Array.isArray((customData?.data as any)?.data)
      ? (customData?.data as any).data
      : [];

    return list.map((r: any, index: number): RiskRow => {
      const an = r.analisisRisiko;
      const rp = r.rencanaPenanganan;

      return {
        identId: r.id,
        rencanaId: rp?.id ?? null,
        no: index + 1,
        prioritas: String(r.priorityRank ?? "-"),
        prioritasWarna: an?.levelRisiko?.warna ?? "Kuning",
        rencanaTindakPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        keterjadiRisiko: rp?.keterjadiRisiko ?? "",
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        residualLevelKemungkinanId: rp?.residualLevelKemungkinanId ?? null,
        residualLevelDampakId: rp?.residualLevelDampakId ?? null,
        residualLevelKemungkinan: rp?.residualLevelKemungkinan?.nama ?? "",
        residualLevelDampak: rp?.residualLevelDampak?.nama ?? "",
        dokumenPendukung: rp?.dokumenPendukung ?? "",
        dokumenPendukungs: rp?.dokumenPendukungs ?? [],
      };
    });
  }, [loading, customData]);

  // Paginate rows
  const totalRows = allRows.length;
  const tableRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allRows
      .slice(start, end)
      .map((row, idx) => ({ ...row, no: start + idx + 1 }));
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
    setModalKeterjadian(row.keterjadiRisiko);
    setModalResidualKemungkinan(row.residualLevelKemungkinanId ? String(row.residualLevelKemungkinanId) : "");
    setModalResidualDampak(row.residualLevelDampakId ? String(row.residualLevelDampakId) : "");

    // Map existing documents list to form state
    const docs = (row.dokumenPendukungs || []).map((d) => {
      const isLocalUpload = d.url.startsWith("/uploads/") || d.url.startsWith("/api/uploads/");
      const cleanName = isLocalUpload
        ? d.url.replace("/api/uploads/", "").replace("/uploads/", "").split("_").slice(1).join("_")
        : "";
      return {
        id: d.id,
        title: d.title,
        url: d.url,
        docType: (isLocalUpload ? "upload" : "link") as "upload" | "link",
        uploadedName: cleanName || "File Pendukung",
      };
    });

    setModalDocs(docs);
    setMeetingKeyword("");
    setMeetingResults([]);
    setMeetingError("");
    setImportingMeetingId(null);
    setModalOpened(true);
  };

  // Upload file logic for specific document index
  const handleFileUploadForIndex = async (file: File | null, index: number) => {
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

      setModalDocs((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          title: next[index].title.trim() || data.filename,
          url: data.url,
          uploadedName: data.filename,
        };
        return next;
      });

      notifications.show({
        title: "Berhasil",
        message: "Berkas berhasil diupload",
        color: "green",
      });
    } catch (e: any) {
      notifications.show({
        title: "Gagal",
        message: e?.message ?? "Gagal mengupload berkas",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatMeetingDateTime = (meeting: OfficeMeeting) => {
    const date = convertToDisplayDate(meeting.tanggal);
    const start = meeting.waktuMulai?.slice(0, 5);
    const end = meeting.waktuSelesai?.slice(0, 5);

    if (date && start && end) return `${date}, ${start}-${end}`;
    if (date && start) return `${date}, ${start}`;
    return date || "-";
  };

  const searchOfficeMeetings = async () => {
    const keyword = meetingKeyword.trim();
    if (keyword.length < 2) {
      setMeetingError("Masukkan minimal 2 karakter keyword rapat.");
      setMeetingResults([]);
      return;
    }

    setMeetingSearching(true);
    setMeetingError("");

    try {
      const response = await fetch(`/api/gojags-office/rapat?keyword=${encodeURIComponent(keyword)}`, {
        method: "GET",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Gagal mencari rapat dari GOJAGS Office");
      }

      setMeetingResults(Array.isArray(payload?.data) ? payload.data : []);
      if (!payload?.data?.length) {
        setMeetingError("Tidak ada rapat yang cocok dengan keyword tersebut.");
      }
    } catch (error: any) {
      setMeetingResults([]);
      setMeetingError(error?.message || "Gagal mencari rapat dari GOJAGS Office");
    } finally {
      setMeetingSearching(false);
    }
  };

  const importMeetingAttendance = async (meeting: OfficeMeeting) => {
    setImportingMeetingId(meeting.id);

    try {
      const title = `Daftar Hadir - ${meeting.agenda}`;
      const response = await fetch(`/api/gojags-office/rapat/${meeting.id}/presensi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Gagal mengimpor daftar hadir rapat");
      }

      setModalDocs((prev) => [
        ...prev,
        {
          title: payload.title || title,
          url: payload.url,
          docType: "upload",
          uploadedName: payload.filename || `${title}.pdf`,
        },
      ]);

      notifications.show({
        title: "Berhasil",
        message: "Daftar hadir rapat berhasil ditambahkan sebagai dokumen pendukung",
        color: "green",
      });
    } catch (error: any) {
      notifications.show({
        title: "Gagal",
        message: error?.message || "Gagal mengimpor daftar hadir rapat",
        color: "red",
      });
    } finally {
      setImportingMeetingId(null);
    }
  };

  // Submit Modal Save
  const handleSaveModal = () => {
    if (!selectedRow) return;

    // Keep uploaded evidence even when users skip the optional title field.
    const docList = modalDocs
      .filter((d) => d.url.trim() !== "")
      .map((d) => ({
        title: d.title.trim() || d.uploadedName.trim() || "Bukti Dukung Mitigasi",
        url: d.url.trim(),
      }));

    if (docList.some((document) => !isSafeAppUrl(document.url))) {
      notifications.show({
        title: "Tautan Tidak Aman",
        message: "Tautan dokumen harus menggunakan http://, https://, atau berkas internal aplikasi.",
        color: "orange",
      });
      return;
    }

    const payload = {
      keterjadiRisiko: modalKeterjadian || null,
      realisasiWaktu: convertToDisplayDate(modalWaktu) || null,
      realisasiOutput: modalOutput || null,
      residualLevelKemungkinanId: modalResidualKemungkinan ? Number(modalResidualKemungkinan) : null,
      residualLevelDampakId: modalResidualDampak ? Number(modalResidualDampak) : null,
      dokumenPendukung: docList.length > 0 ? docList[0].url : null, // legacy field fallback
      dokumenPendukungs: docList,
    };

    if (selectedRow.rencanaId === null) {
      createMutate(
        {
          resource: "rencana-penanganan",
          values: {
            ...payload,
            identifikasiRisikoId: selectedRow.identId,
          },
          successNotification: {
            message: "Realisasi pemantauan berhasil disimpan",
            type: "success" as const,
          },
          errorNotification: {
            message: "Gagal menyimpan realisasi",
            type: "error" as const,
          },
        },
        {
          onSuccess: () => {
            setModalOpened(false);
            if (refetchQuery) refetchQuery();
          },
          onError: (error: any) => {
            console.error("Create failed:", error);
          },
        }
      );
    } else {
      const origKeterjadian = selectedRow.keterjadiRisiko;
      const origWaktu = selectedRow.realisasiWaktu;
      const origOutput = selectedRow.realisasiOutput;

      setModalOpened(false);

      updateMutate(
        {
          resource: "rencana-penanganan",
          id: selectedRow.rencanaId,
          values: payload,
          mutationMode: "undoable",
          undoableTimeout: 3000,
          successNotification: {
            message: "Realisasi pemantauan berhasil disimpan",
            type: "success" as const,
          },
          errorNotification: {
            message: "Gagal memperbarui realisasi",
            type: "error" as const,
          },
        },
        {
          onSuccess: () => {
            if (refetchQuery) refetchQuery();
          },
          onError: (error: any) => {
            if (error?.message === "mutationCancelled") {
              setModalKeterjadian(origKeterjadian);
              setModalWaktu(origWaktu);
              setModalOutput(origOutput);
              setModalOpened(true);
              if (refetchQuery) refetchQuery();
            } else {
              console.error("Update failed:", error);
            }
          },
        }
      );
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
          Pemantauan Risiko diisi apabila sudah dilaksanakan RTP-nya sesuai
          Target Waktunya dan sertakan pula dokumen pendukungnya.
        </Text>
      </div>

      <Card withBorder padding="0" radius="md" style={{ overflow: "hidden" }}>
        <div className="monitoring-table-scroll">
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          className="monitoring-table"
          style={{ fontSize: 13, borderCollapse: "collapse", width: "100%", minWidth: 1320 }}
        >
          <Table.Thead>
            {/* First Row of headers */}
            <Table.Tr>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 50 }}>
                No
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center", width: 110 }}>
                Prioritas
              </Table.Th>
              <Table.Th rowSpan={2} style={{ textAlign: "center" }}>
                Rencana Tindak Penanganan
              </Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center" }}>
                Target
              </Table.Th>
              <Table.Th colSpan={4} style={{ textAlign: "center" }}>
                Realisasi
              </Table.Th>
              <Table.Th colSpan={2} style={{ textAlign: "center" }}>
                Risiko Residual
              </Table.Th>
              <Table.Th rowSpan={2} className="monitoring-sticky-action" style={{ textAlign: "center", width: 70 }}>
                Aksi
              </Table.Th>
            </Table.Tr>
            {/* Second Row of headers */}
            <Table.Tr>
              <Table.Th style={{ textAlign: "center", width: 120 }}>
                Waktu
              </Table.Th>
              <Table.Th style={{ textAlign: "center", width: 160 }}>
                Output
              </Table.Th>
              <Table.Th style={{ textAlign: "center", width: 140 }}>
                Keterjadian Risiko
              </Table.Th>
              <Table.Th style={{ textAlign: "center", width: 120 }}>
                Waktu
              </Table.Th>
              <Table.Th style={{ textAlign: "center", width: 160 }}>
                Output
              </Table.Th>
              <Table.Th style={{ textAlign: "center" }}>
                Dokumen Pendukung
              </Table.Th>
              <Table.Th style={{ textAlign: "center", width: 150 }}>
                Level Kemungkinan
              </Table.Th>
              <Table.Th style={{ textAlign: "center", width: 150 }}>
                Level Dampak
              </Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {tableRows.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={12}
                  align="center"
                  style={{
                    color: "var(--mantine-color-gray-5)",
                    padding: "20px 0",
                  }}
                >
                  {totalRows === 0
                    ? 'Belum ada Rencana Tindak Penanganan dengan Respon "Mengurangi Risiko".'
                    : "Tidak ada data pada halaman ini."}
                </Table.Td>
              </Table.Tr>
            ) : (
              tableRows.map((row) => (
                <Table.Tr key={row.identId}>
                  <Table.Td align="center">{row.no}</Table.Td>
                  <Table.Td align="center">
                    <Badge
                      color={getBadgeColor(row.prioritasWarna)}
                      variant="filled"
                      size="sm"
                    >
                      {row.prioritas}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {row.rencanaTindakPenanganan || (
                      <Text size="xs" c="dimmed">
                        Belum diisi
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td align="center">{row.targetWaktu || "-"}</Table.Td>
                  <Table.Td>{row.targetOutput || "-"}</Table.Td>
                  <Table.Td align="center">
                    {row.keterjadiRisiko ? (
                      <Badge
                        color={
                          row.keterjadiRisiko === "Terjadi" ? "red" : "green"
                        }
                        variant="light"
                      >
                        {row.keterjadiRisiko}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center" style={{ fontWeight: 600 }}>
                    {row.realisasiWaktu || "-"}
                  </Table.Td>
                  <Table.Td>{row.realisasiOutput || "-"}</Table.Td>
                  <Table.Td>
                    {row.dokumenPendukungs && row.dokumenPendukungs.length > 0 ? (
                      <Stack gap="xs">
                        {row.dokumenPendukungs.map((doc) => (
                          <Group key={doc.id} gap="xs" wrap="nowrap" style={{ wordBreak: "break-all" }}>
                            <IconFileText size={16} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                            <Text
                              component="a"
                              href={getSafeDocumentHref(doc.url) ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              c="blue"
                              style={{
                                textDecoration: "underline",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              {doc.title}
                              <IconExternalLink size={10} />
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </Table.Td>
                  <Table.Td align="center">
                    {row.residualLevelKemungkinan || "-"}
                  </Table.Td>
                  <Table.Td align="center">
                    {row.residualLevelDampak || "-"}
                  </Table.Td>
                  <Table.Td align="center" className="monitoring-sticky-action">
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
        </div>
      </Card>

      <style jsx global>{`
        .monitoring-table-scroll {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        .monitoring-table {
          table-layout: fixed;
        }

        .monitoring-table th,
        .monitoring-table td {
          overflow-wrap: anywhere;
          vertical-align: middle;
        }

        .monitoring-table .monitoring-sticky-action {
          position: sticky;
          right: 0;
          z-index: 3;
          min-width: 76px;
          background: var(--mantine-color-body);
          box-shadow: -6px 0 10px -10px var(--mantine-color-dark-9);
        }

        .monitoring-table thead .monitoring-sticky-action {
          z-index: 5;
          background: var(--mantine-color-dark-7);
        }

        @media (max-width: 768px) {
          .monitoring-table {
            min-width: 1180px !important;
          }
        }
      `}</style>

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
        styles={{ body: { maxHeight: "75vh", overflowY: "auto" } }}
      >
        <Stack gap="md">
          {selectedRow && (
            <Card withBorder padding="xs">
              <Text size="xs" fw={700} c="dimmed">
                RTP:
              </Text>
              <Text size="xs" fw={600} mt={2}>
                {selectedRow.rencanaTindakPenanganan}
              </Text>
            </Card>
          )}

          <Select
            label="Keterjadian Risiko"
            placeholder="Pilih keterjadian risiko"
            value={modalKeterjadian}
            onChange={(val) => setModalKeterjadian(val ?? "")}
            data={[
              { value: "Terjadi", label: "Terjadi" },
              { value: "Tidak Terjadi", label: "Tidak Terjadi" },
            ]}
            clearable
          />

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

          <Select label="Risiko Residual - Level Kemungkinan" placeholder="Pilih level kemungkinan residual" value={modalResidualKemungkinan} onChange={(value) => setModalResidualKemungkinan(value || "")} data={kemungkinanOptions} searchable clearable />
          <Select label="Risiko Residual - Level Dampak" placeholder="Pilih level dampak residual" value={modalResidualDampak} onChange={(value) => setModalResidualDampak(value || "")} data={dampakOptions} searchable clearable />

          <Stack gap="xs" mt="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={600}>
                Dokumen Pendukung ({modalDocs.length})
              </Text>
              <Group gap="xs">
                <Button variant="outline" size="xs" onClick={() => setModalDocs((prev) => [...prev, { title: "", url: "", docType: "link", uploadedName: "" }])}>
                  + Tambah Link
                </Button>
                <Button variant="outline" size="xs" onClick={() => setModalDocs((prev) => [...prev, { title: "", url: "", docType: "upload", uploadedName: "" }])}>
                  + Upload File
                </Button>
              </Group>
            </Group>
            <Text size="xs" c="dimmed">
              Bukti pendukung dapat berasal dari tautan apa pun yang aman atau berkas yang Anda unggah. GOJAGS Office hanya opsi tambahan untuk mengambil daftar hadir rapat.
            </Text>

            <Card withBorder padding="xs" radius="sm" style={{ background: "var(--mantine-color-default-hover)" }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700}>Opsi tambahan: GOJAGS Office</Text>
                  <Text size="xs" c="dimmed">Gunakan jika bukti berupa daftar hadir rapat.</Text>
                </div>
                <Button size="xs" variant="subtle" onClick={() => setOfficeSourceOpened((opened) => !opened)}>
                  {officeSourceOpened ? "Tutup" : "Buka opsi"}
                </Button>
              </Group>
              <Collapse in={officeSourceOpened}>
              <Stack gap="xs" mt="sm">
                <Group gap="xs" align="flex-end">
                  <TextInput
                    label="Cari Rapat"
                    placeholder="Ketik agenda rapat, contoh: mitigasi risiko"
                    value={meetingKeyword}
                    onChange={(e) => setMeetingKeyword(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchOfficeMeetings();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="sm"
                    variant="light"
                    leftSection={<IconSearch size={14} />}
                    loading={meetingSearching}
                    onClick={searchOfficeMeetings}
                  >
                    Cari
                  </Button>
                </Group>

                {meetingError && (
                  <Text size="xs" c="red">
                    {meetingError}
                  </Text>
                )}

                {meetingResults.length > 0 && (
                  <Stack gap="xs">
                    {meetingResults.map((meeting) => (
                      <Card key={meeting.id} withBorder padding="xs" radius="sm">
                        <Stack gap={4}>
                          <Group justify="space-between" align="flex-start" gap="xs">
                            <div style={{ flex: 1 }}>
                              <Text size="xs" fw={700}>
                                {meeting.agenda}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {formatMeetingDateTime(meeting)}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Pemimpin: {meeting.pemimpin} | Ruangan: {meeting.ruangan}
                              </Text>
                              <Group gap={6} mt={4}>
                                <Badge size="xs" variant="light">
                                  {meeting.status}
                                </Badge>
                                <Badge size="xs" color="gray" variant="light">
                                  {meeting.pesertaCount} peserta
                                </Badge>
                              </Group>
                            </div>
                            <Button
                              size="xs"
                              variant="filled"
                              loading={importingMeetingId === meeting.id}
                              onClick={() => importMeetingAttendance(meeting)}
                            >
                              Tambahkan Presensi
                            </Button>
                          </Group>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
              </Collapse>
            </Card>

            {modalDocs.length === 0 ? (
              <Text size="xs" c="dimmed" fs="italic" ta="center" py="md">
                Belum ada dokumen pendukung ditambahkan.
              </Text>
            ) : (
              <Stack gap="sm">
                {modalDocs.map((doc, idx) => (
                  <Card key={idx} withBorder padding="xs" radius="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="xs" fw={700} c="dimmed">
                          Dokumen #{idx + 1}
                        </Text>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() =>
                            setModalDocs((prev) => prev.filter((_, i) => i !== idx))
                          }
                          style={{ height: 20, padding: "0 4px" }}
                        >
                          Hapus
                        </Button>
                      </Group>

                      <TextInput
                        label="Judul Dokumen"
                        placeholder="Contoh: Notulensi Rapat, SK Tim, dll."
                        required
                        value={doc.title}
                        onChange={(e) => {
                          const val = e.currentTarget.value;
                          setModalDocs((prev) => {
                            const next = [...prev];
                            next[idx].title = val;
                            return next;
                          });
                        }}
                      />

                      <Stack gap={2}>
                        <Text size="xs" fw={500}>
                          Tipe Dokumen
                        </Text>
                        <SegmentedControl
                          size="xs"
                          value={doc.docType}
                          onChange={(val: string) => {
                            setModalDocs((prev) => {
                              const next = [...prev];
                              next[idx].docType = val as "link" | "upload";
                              return next;
                            });
                          }}
                          data={[
                            { label: "Link URL", value: "link" },
                            { label: "Upload Berkas", value: "upload" },
                          ]}
                        />
                      </Stack>

                      {doc.docType === "link" ? (
                        <TextInput
                          label="Tautan (Link)"
                          placeholder="https://google.com atau Google Drive"
                          value={doc.url}
                          onChange={(e) => {
                            const val = e.currentTarget.value;
                            setModalDocs((prev) => {
                              const next = [...prev];
                              next[idx].url = val;
                              return next;
                            });
                          }}
                        />
                      ) : (
                        <Stack gap="xs">
                          <FileDropUpload
                            size="sm"
                            loading={uploading}
                            currentFileName={doc.uploadedName || (doc.url ? "File Terunggah" : undefined)}
                            helperText="Klik atau tarik berkas bukti dukung ke area ini"
                            onFileSelect={(file) => handleFileUploadForIndex(file, idx)}
                          />
                          {doc.url ? (
                            <Text
                              size="xs"
                              c="blue"
                              fw={500}
                              component="a"
                              href={getSafeDocumentHref(doc.url) ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <IconFileText size={14} />
                              {doc.uploadedName || "File Terunggah"}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed" fs="italic">
                              Belum ada berkas diunggah
                            </Text>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveModal}>Simpan Realisasi</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
