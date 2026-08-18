"use client";

import { useState, useMemo } from "react";
import { useCustom, useCreate, useDelete, useUpdate, useGetIdentity } from "@refinedev/core";
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
  Select,
  Table,
  Badge,
  ActionIcon,
  SegmentedControl,
  FileButton,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconSearch,
  IconFolder,
  IconFileText,
  IconPlus,
  IconUpload,
  IconLink,
  IconExternalLink,
  IconTrash,
  IconCalendar,
  IconPencil,
  IconSparkles,
} from "@tabler/icons-react";
import { useYear } from "@/lib/year-context";

interface RepositoryFile {
  id: string; // e.g. "manual-1" or "bukti-12"
  title: string;
  url: string;
  category: "pedoman" | "bukti_dukung" | "laporan";
  tahun: number;
  uploader: string;
  createdAt: string;
  relatedRisk?: string;
  summary?: string | null;
}

export default function RepositoryPage() {
  const { tahunDari } = useYear();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(String(tahunDari || new Date().getFullYear()));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Upload Modal State
  const [uploadOpened, setUploadOpened] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCat, setUploadCat] = useState("pedoman");
  const [uploadDocType, setUploadDocType] = useState<"link" | "upload">("link");
  const [uploadDocLink, setUploadDocLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Summary State
  const [summaryOpened, setSummaryOpened] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [summaryDocTitle, setSummaryDocTitle] = useState("");

  // Custom Delete Modal State
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);

  const handleViewSummary = async (file: RepositoryFile) => {
    setSummaryDocTitle(file.title);
    setSummaryOpened(true);

    if (file.summary && file.summary.trim().length > 0) {
      setSelectedSummary(file.summary);
      return;
    }

    setSummaryLoading(true);
    setSelectedSummary(null);

    try {
      const res = await fetch("/api/custom-repository/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Gagal meringkas dokumen");
      }

      const data = await res.json();
      setSelectedSummary(data.summary);
      refetch();
    } catch (e: any) {
      notifications.show({
        title: "Gagal Meringkas",
        message: e?.message ?? "Terjadi kesalahan saat memproses dokumen",
        color: "red",
      });
      setSummaryOpened(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Queries
  const { data: identity } = useGetIdentity<any>();
  const result = useCustom<RepositoryFile[]>({
    url: "/api/custom-repository",
    method: "get",
    config: {
      query: {
        search,
        tahun: selectedYear,
        category: selectedCategory === "all" ? "" : selectedCategory,
      },
    },
  });

  const { mutate: createMutate } = useCreate();
  const { mutate: deleteMutate } = useDelete();
  const { mutate: updateMutate } = useUpdate();

  const files = Array.isArray(result.result?.data) ? (result.result?.data as unknown as RepositoryFile[]) : [];
  const isLoading = result.query.isLoading;
  const refetch = result.query.refetch;

  // File Upload Logic
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

      if (!res.ok) throw new Error("Gagal mengunggah berkas");
      const data = await res.json();

      setUploadedFile({ name: data.filename, url: data.url });
      notifications.show({
        title: "Berhasil",
        message: "Berkas berhasil diunggah",
        color: "green",
      });
    } catch (e: any) {
      notifications.show({
        title: "Gagal",
        message: e?.message ?? "Gagal mengunggah berkas",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  // Save manual document upload or edit
  const handleSaveUpload = () => {
    if (!uploadTitle.trim()) {
      notifications.show({ title: "Validasi Gagal", message: "Judul dokumen harus diisi", color: "orange" });
      return;
    }

    const docUrl = uploadDocType === "upload" ? uploadedFile?.url : uploadDocLink;
    if (!docUrl) {
      notifications.show({ title: "Validasi Gagal", message: "Dokumen atau tautan harus disediakan", color: "orange" });
      return;
    }

    const payload = {
      title: uploadTitle.trim(),
      url: docUrl.trim(),
      category: uploadCat,
      tahun: parseInt(selectedYear, 10),
      uploader: identity?.name || identity?.email || "Administrator",
    };

    if (editingId !== null) {
      updateMutate(
        {
          resource: "repositori",
          id: editingId,
          values: {
            title: payload.title,
            url: payload.url,
            category: payload.category,
          },
          successNotification: {
            message: "Dokumen berhasil diperbarui",
            type: "success" as const,
          },
          errorNotification: {
            message: "Gagal memperbarui dokumen",
            type: "error" as const,
          },
        },
        {
          onSuccess: () => {
            setUploadOpened(false);
            setUploadTitle("");
            setUploadDocLink("");
            setUploadedFile(null);
            setEditingId(null);
            refetch();
          },
        }
      );
    } else {
      createMutate(
        {
          resource: "repositori",
          values: payload,
          successNotification: {
            message: "Dokumen berhasil ditambahkan ke repositori",
            type: "success" as const,
          },
          errorNotification: {
            message: "Gagal menambahkan dokumen",
            type: "error" as const,
          },
        },
        {
          onSuccess: () => {
            setUploadOpened(false);
            setUploadTitle("");
            setUploadDocLink("");
            setUploadedFile(null);
            refetch();
          },
        }
      );
    }
  };

  // Edit manual document
  const handleEditFile = (file: RepositoryFile) => {
    const realId = parseInt(file.id.replace("manual-", ""), 10);
    setEditingId(realId);
    setUploadTitle(file.title);
    setUploadCat(file.category);
    const isLocalUpload = file.url.startsWith("/uploads/") || file.url.startsWith("/api/uploads/");
    if (isLocalUpload) {
      setUploadDocType("upload");
      const cleanName = file.url.replace("/api/uploads/", "").replace("/uploads/", "").split("_").slice(1).join("_");
      setUploadedFile({ name: cleanName || "File Terunggah", url: file.url });
      setUploadDocLink("");
    } else {
      setUploadDocType("link");
      setUploadDocLink(file.url);
      setUploadedFile(null);
    }
    setUploadOpened(true);
  };

  // Delete manual document
  const handleDeleteFile = (idStr: string) => {
    if (!idStr.startsWith("manual-")) return;
    const realId = parseInt(idStr.replace("manual-", ""), 10);
    setFileToDelete(realId);
    setDeleteConfirmOpened(true);
  };

  const confirmDeleteFile = () => {
    if (fileToDelete === null) return;
    deleteMutate(
      {
        resource: "repositori",
        id: fileToDelete,
        successNotification: {
          message: "Dokumen berhasil dihapus",
          type: "success" as const,
        },
        errorNotification: {
          message: "Gagal menghapus dokumen",
          type: "error" as const,
        },
      },
      {
        onSuccess: () => {
          refetch();
          setDeleteConfirmOpened(false);
          setFileToDelete(null);
        },
      }
    );
  };

  // Folders layout components
  const folders = [
    { key: "all", label: "Semua Berkas", color: "blue" },
    { key: "pedoman", label: "Pedoman & Kebijakan", color: "grape" },
    { key: "bukti_dukung", label: "Bukti Dukung Mitigasi", color: "teal" },
    { key: "laporan", label: "Laporan & Risalah", color: "orange" },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Repositori Dokumen</Title>
          <Text size="xs" c="dimmed" mt={4}>
            Pusat penyimpanan, pengarsipan, dan pencarian berkas kebijakan serta bukti dukung mitigasi risiko.
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setEditingId(null);
            setUploadTitle("");
            setUploadDocLink("");
            setUploadedFile(null);
            setUploadOpened(true);
          }}
        >
          Upload Dokumen
        </Button>
      </Group>

      {/* Folders Navigation Bar */}
      <Group gap="md">
        {folders.map((f) => (
          <UnstyledButton
            key={f.key}
            onClick={() => setSelectedCategory(f.key)}
            style={{
              flex: "1 1 200px",
              padding: "16px",
              borderRadius: "8px",
              border: `1px solid ${selectedCategory === f.key ? `var(--mantine-color-${f.color}-filled)` : "var(--mantine-color-default-border)"}`,
              backgroundColor: selectedCategory === f.key ? `var(--mantine-color-${f.color}-light)` : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            <Group gap="md" wrap="nowrap">
              <ThemeIcon color={f.color} size="lg" radius="md">
                <IconFolder size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={600} c={selectedCategory === f.key ? undefined : "dimmed"}>
                  {f.label}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        ))}
      </Group>

      {/* Filters header bar */}
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between" align="flex-end" gap="md">
          <TextInput
            label="Cari Berkas"
            placeholder="Ketik judul berkas, nama uploader, atau risiko terkait..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flexGrow: 1 }}
          />

          <Select
            label="Tahun Risiko"
            value={selectedYear}
            onChange={(val) => setSelectedYear(val || String(tahunDari))}
            data={[
              { value: "2024", label: "Tahun 2024" },
              { value: "2025", label: "Tahun 2025" },
              { value: "2026", label: "Tahun 2026" },
            ]}
            style={{ width: 150 }}
          />
        </Group>
      </Card>

      {/* Documents Explorer Table */}
      <Card withBorder padding="0" radius="md" style={{ overflow: "hidden" }}>
        {isLoading ? (
          <Center h={200}>
            <Loader />
          </Center>
        ) : files.length === 0 ? (
          <Center h={200}>
            <Stack gap="xs" align="center">
              <IconFileText size={40} color="var(--mantine-color-gray-4)" />
              <Text size="sm" c="dimmed">
                Tidak ada berkas ditemukan di repositori untuk tahun/kategori ini.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40, textAlign: "center" }}>No</Table.Th>
                <Table.Th>Nama Dokumen / Berkas</Table.Th>
                <Table.Th style={{ width: 150 }}>Kategori</Table.Th>
                <Table.Th>Tautan Risiko Terkait</Table.Th>
                <Table.Th style={{ width: 140 }}>Tanggal Upload</Table.Th>
                <Table.Th style={{ width: 130 }}>Uploader</Table.Th>
                <Table.Th style={{ width: 90, textAlign: "center" }}>Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {files.map((file: RepositoryFile, idx: number) => (
                <Table.Tr key={file.id}>
                  <Table.Td align="center">{idx + 1}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <IconFileText size={18} color="var(--mantine-color-blue-5)" style={{ flexShrink: 0 }} />
                      <div>
                        <Text size="sm" fw={600}>
                          {file.title}
                        </Text>
                        <Text
                          size="xs"
                          c="blue"
                          component="a"
                          href={file.url.startsWith("/uploads/") ? file.url.replace("/uploads/", "/api/uploads/") : file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "underline" }}
                        >
                          Buka Link/Berkas
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        file.category === "pedoman"
                          ? "grape"
                          : file.category === "bukti_dukung"
                          ? "teal"
                          : "orange"
                      }
                      variant="light"
                    >
                      {file.category === "pedoman"
                        ? "Pedoman"
                        : file.category === "bukti_dukung"
                        ? "Mitigasi"
                        : "Laporan"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {file.relatedRisk ? (
                      <Text size="xs" c="dimmed">
                        {file.relatedRisk}
                      </Text>
                    ) : (
                      <Text size="xs" c="gray.4" fs="italic">
                        Umum (Kebijakan/Pedoman)
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <IconCalendar size={14} color="#868e96" />
                      <Text size="xs">
                        {new Date(file.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={500}>
                      {file.uploader}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="center" wrap="nowrap">
                      <ActionIcon
                        component="a"
                        href={file.url.startsWith("/uploads/") ? file.url.replace("/uploads/", "/api/uploads/") : file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="blue"
                        variant="subtle"
                        title="Buka Dokumen"
                      >
                        <IconExternalLink size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="grape"
                        variant="subtle"
                        onClick={() => handleViewSummary(file)}
                        title="Lihat Ringkasan AI"
                      >
                        <IconSparkles size={16} />
                      </ActionIcon>
                      {(() => {
                        const isCreator = file.id.startsWith("manual-") && (
                          file.uploader === identity?.name ||
                          file.uploader === identity?.email ||
                          identity?.role?.name?.toLowerCase() === "admin" ||
                          identity?.roleName?.toLowerCase() === "admin"
                        );
                        if (!isCreator) return null;

                        return (
                          <>
                            <ActionIcon
                              color="yellow"
                              variant="subtle"
                              onClick={() => handleEditFile(file)}
                              title="Edit Dokumen"
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => handleDeleteFile(file.id)}
                              title="Hapus Dokumen"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </>
                        );
                      })()}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Manual Upload Modal */}
      <Modal opened={uploadOpened} onClose={() => setUploadOpened(false)} title={editingId !== null ? "Edit Dokumen" : "Unggah Dokumen Baru"} radius="md">
        <Stack gap="md">
          <TextInput
            label="Judul Dokumen"
            placeholder="Contoh: Pedoman Manajemen Risiko Pusdiklat"
            required
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.currentTarget.value)}
          />

          <Select
            label="Folder Kategori"
            value={uploadCat}
            onChange={(val) => setUploadCat(val || "pedoman")}
            data={[
              { value: "pedoman", label: "Pedoman & Kebijakan" },
              { value: "laporan", label: "Laporan & Risalah" },
            ]}
          />

          <Stack gap={2}>
            <Text size="xs" fw={500}>
              Metode Input Dokumen
            </Text>
            <SegmentedControl
              value={uploadDocType}
              onChange={(val: any) => setUploadDocType(val)}
              data={[
                { label: "Tautan Link", value: "link" },
                { label: "Upload Berkas", value: "upload" },
              ]}
            />
          </Stack>

          {uploadDocType === "link" ? (
            <TextInput
              label="Tautan (Link)"
              placeholder="https://drive.google.com/..."
              value={uploadDocLink}
              onChange={(e) => setUploadDocLink(e.currentTarget.value)}
              rightSection={<IconLink size={16} color="#adb5bd" />}
            />
          ) : (
            <Stack gap="xs">
              <Text size="xs" fw={500} c="dimmed">
                Pilih berkas kebijakan/pedoman untuk diunggah
              </Text>
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
            <Button variant="default" onClick={() => setUploadOpened(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveUpload}>Simpan Berkas</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Document Summary Modal */}
      <Modal opened={summaryOpened} onClose={() => setSummaryOpened(false)} title="Ringkasan Dokumen AI" size="lg" radius="md">
        <Stack gap="md">
          <Text fw={600} size="sm">{summaryDocTitle}</Text>
          {summaryLoading ? (
            <Center h={150}>
              <Stack align="center" gap="sm">
                <Loader size="md" color="grape" />
                <Text size="xs" c="dimmed">Sedang membaca dan menganalisis berkas menggunakan AI...</Text>
              </Stack>
            </Center>
          ) : (
            <Card withBorder padding="md" radius="md" style={{ lineHeight: 1.6, fontSize: 13.5 }}>
              <div style={{ wordBreak: "break-word" }}>
                {renderMarkdownToReact(selectedSummary || "")}
              </div>
            </Card>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSummaryOpened(false)}>Tutup</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        opened={deleteConfirmOpened} 
        onClose={() => setDeleteConfirmOpened(false)} 
        title={<Text fw={600} size="md">Konfirmasi Hapus</Text>}
        centered
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Apakah Anda yakin ingin menghapus dokumen ini dari repositori? Tindakan ini tidak dapat dibatalkan.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setDeleteConfirmOpened(false)}>
              Batal
            </Button>
            <Button color="red" onClick={confirmDeleteFile}>
              Hapus Dokumen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// Custom Markdown formatter to render headers, lists, bold text, and tables cleanly in light/dark themes
function renderMarkdownToReact(text: string) {
  if (!text) return "Ringkasan kosong.";
  
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // 1. Table Detection
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      
      if (tableLines.length >= 2) {
        // Extract headers
        const headerCells = tableLines[0]
          .split("|")
          .map(c => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          
        // Skip separator line (tableLines[1])
        const bodyLines = tableLines.slice(2);
        
        elements.push(
          <div key={`table-${i}`} style={{ overflowX: "auto", marginTop: 12, marginBottom: 12 }}>
            <Table withTableBorder withColumnBorders highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {headerCells.map((cell, idx) => (
                    <Table.Th key={idx} style={{ padding: "6px 10px" }}>
                      {parseInlineBold(cell)}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bodyLines.map((bLine, rIdx) => {
                  const cells = bLine
                    .split("|")
                    .map(c => c.trim())
                    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                  return (
                    <Table.Tr key={rIdx}>
                      {cells.map((cell, cIdx) => (
                        <Table.Td key={cIdx} style={{ padding: "6px 10px" }}>
                          {parseInlineBold(cell)}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </div>
        );
        continue;
      }
    }
    
    // 2. Horizontal Rule
    if (line.trim() === "---") {
      elements.push(<hr key={i} style={{ border: 0, borderTop: "1px solid var(--mantine-color-default-border)", margin: "12px 0" }} />);
      i++;
      continue;
    }
    
    // 3. Headings (### or ## or #)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = parseInlineBold(headingMatch[2]);
      const fontSize = level === 1 ? 19 : level === 2 ? 16 : level === 3 ? 14.5 : 13.5;
      elements.push(
        <Text key={i} fw={700} style={{ fontSize, marginTop: 14, marginBottom: 8, display: "block" }}>
          {content}
        </Text>
      );
      i++;
      continue;
    }
    
    // 4. Unordered list (* or -)
    const listMatch = line.match(/^(\s*)[*\-]\s+(.*)$/);
    if (listMatch) {
      const indentSpace = listMatch[1].length;
      const indent = indentSpace * 8 + 14;
      const content = parseInlineBold(listMatch[2]);
      elements.push(
        <div key={i} style={{ paddingLeft: indent, textIndent: -10, marginBottom: 4, display: "block" }}>
          • {content}
        </div>
      );
      i++;
      continue;
    }

    // 5. Ordered list (1. or 2.)
    const orderedListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedListMatch) {
      const indentSpace = orderedListMatch[1].length;
      const indent = indentSpace * 8 + 18;
      const num = orderedListMatch[2];
      const content = parseInlineBold(orderedListMatch[3]);
      elements.push(
        <div key={i} style={{ paddingLeft: indent, textIndent: -14, marginBottom: 4, display: "block" }}>
          {num}. {content}
        </div>
      );
      i++;
      continue;
    }
    
    // Default Paragraph line
    elements.push(
      <div key={i} style={{ minHeight: line.trim() === "" ? 8 : "auto", marginBottom: 6, display: "block" }}>
        {parseInlineBold(line)}
      </div>
    );
    i++;
  }
  
  return elements;
}

function parseInlineBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Inline helper for layout
function ThemeIcon({ children, color, size, radius }: any) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size === "lg" ? 36 : 28,
        height: size === "lg" ? 36 : 28,
        borderRadius: radius === "md" ? "6px" : "3px",
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-filled)`,
      }}
    >
      {children}
    </div>
  );
}
