"use client";

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
import { useList } from "@refinedev/core";
import {
  Title,
  Button,
  Group,
  Loader,
  Center,
  Stack,
  Text,
  TextInput,
  Modal,
  Badge,
  Table,
  ActionIcon,
  Tooltip,
  FileButton,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSearch, IconDatabase, IconPlus, IconDownload, IconUpload } from "@tabler/icons-react";
import { useYear } from "@/lib/year-context";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllModules } from "handsontable/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  getSafeRowData,
  openUnlockedDropdownOnMouseDown,
  preventLockedCellMouseDown,
} from "@/lib/handsontable-progressive-lock";

if (typeof window !== "undefined") {
  registerAllModules();
}

const PROGRESSIVE_INPUT_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FIRST_PROGRESSIVE_COLUMN = PROGRESSIVE_INPUT_COLUMNS[0];
const SYSTEM_CHANGE_SOURCES = new Set(["loadData", "auto", "saveAll", "progressive-reset"]);

const isFilledCellValue = (value: unknown) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const isProgressiveColumn = (col: number) => PROGRESSIVE_INPUT_COLUMNS.includes(col);
const isCellChange = (
  change: Handsontable.CellChange | null
): change is Handsontable.CellChange => Array.isArray(change);

const isColumnUnlockedForRow = (rowData: unknown[], col: number) => {
  if (!isProgressiveColumn(col)) return true;
  if (col === FIRST_PROGRESSIVE_COLUMN) return true;

  for (const previousCol of PROGRESSIVE_INPUT_COLUMNS) {
    if (previousCol >= col) break;
    if (!isFilledCellValue(rowData[previousCol])) return false;
  }

  return true;
};

const getColumnsAfter = (col: number) =>
  PROGRESSIVE_INPUT_COLUMNS.filter((inputCol) => inputCol > col);

const getFirstUnlockedEmptyColumn = (rowData: unknown[]) =>
  PROGRESSIVE_INPUT_COLUMNS.find(
    (col) => isColumnUnlockedForRow(rowData, col) && !isFilledCellValue(rowData[col])
  );

interface BankModalProps {
  opened: boolean;
  onClose: () => void;
  tahun: number;
  onImport: () => void;
}

const BankRisikoModal = memo(function BankRisikoModal({
  opened,
  onClose,
  tahun,
  onImport,
}: BankModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchMethod, setSearchMethod] = useState("");
  const [semanticUnavailableReason, setSemanticUnavailableReason] = useState("");
  const [importing, setImporting] = useState<number | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/bank-risiko/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 15, tahun }),
      });
      const data = await res.json();
      if (data.error) {
        notifications.show({ title: "Error", message: data.error, color: "red" });
        return;
      }
      setResults(data.results || []);
      setSearchMethod(data.method || "text");
      setSemanticUnavailableReason(data.semanticUnavailableReason || "");
    } catch {
      notifications.show({ title: "Error", message: "Gagal mencari risiko", color: "red" });
    } finally {
      setLoading(false);
    }
  }, [query, tahun]);

  const getSearchFallbackMessage = () => {
    switch (semanticUnavailableReason) {
      case "embedding_auth_failed":
        return " - GEMINI_API_KEY tidak valid";
      case "embedding_failed":
        return " - layanan embedding gagal";
      case "no_embeddings":
        return " - data embedding belum tersedia";
      case "pgvector_unavailable":
        return " - pgvector belum tersedia";
      default:
        return "";
    }
  };

  const handleImport = useCallback(
    async (risk: any) => {
      setImporting(risk.id);
      try {
        const payload = {
          risiko: risk.risiko,
          jenisRisikoId: risk.jenis_risiko_id,
          sumberRisikoId: risk.sumber_risiko_id,
          kategoriRisikoId: risk.kategori_risiko_id,
          areaDampakId: risk.area_dampak_id,
          penyebab: risk.penyebab,
          dampak: risk.dampak,
          ...(risk.sasaran_id != null && { sasaranId: risk.sasaran_id }),
          ...(risk.kegiatan_id != null && { kegiatanId: risk.kegiatan_id }),
          ...(risk.proses_bisnis_id != null && { prosesBisnisId: risk.proses_bisnis_id }),
          ...(risk.unit_kerja_id != null && { unitKerjaId: risk.unit_kerja_id }),
          tahun,
        };
        const res = await fetch("/api/identifikasi-risiko", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? "Gagal mengimpor risiko");
        }
        notifications.show({
          title: "Berhasil",
          message: "Risiko berhasil ditambahkan ke tabel",
          color: "green",
        });
        onClose();
        onImport();
      } catch (e: any) {
        notifications.show({ title: "Gagal", message: e?.message ?? "Gagal mengimpor risiko", color: "red" });
      } finally {
        setImporting(null);
      }
    },
    [tahun, onClose, onImport]
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Cari dari Bank Risiko" size="xl">
      <Stack>
        <Text size="sm" c="dimmed">
          Cari risiko yang sudah tercatat untuk ditambahkan ke tabel identifikasi.
        </Text>
        <Group>
          <TextInput
            placeholder="Ketik kata kunci risiko..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            style={{ flex: 1 }}
            leftSection={<IconSearch size={16} />}
          />
          <Button onClick={handleSearch} loading={loading}>
            Cari
          </Button>
        </Group>

        {searchMethod && searched && (
          <Text size="xs" c="dimmed">
            Metode:{" "}
            <Badge
              size="xs"
              color={searchMethod === "semantic" ? "green" : "gray"}
              variant="light"
            >
              {searchMethod === "semantic" ? "Semantik" : "Teks"}
            </Badge>
            {searchMethod === "text" && getSearchFallbackMessage()}
          </Text>
        )}

        {loading && <Center h={150}><Loader /></Center>}

        {!loading && searched && results.length === 0 && (
          <Center h={100}><Text c="dimmed">Tidak ada hasil untuk "{query}"</Text></Center>
        )}

        {!loading && results.length > 0 && (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Risiko</Table.Th>
                <Table.Th>Jenis</Table.Th>
                <Table.Th>Kategori</Table.Th>
                {searchMethod === "semantic" && <Table.Th w={80}>Skor</Table.Th>}
                <Table.Th w={60}>Aksi</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {results.map((r: any) => (
                <Table.Tr key={r.id}>
                  <Table.Td maw={300}>
                    <Text size="sm" lineClamp={2}>{sanitizeHtml(r.risiko)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="light">{sanitizeHtml(r.jenis_risiko_nama)}</Badge>
                  </Table.Td>
                  <Table.Td><Text size="xs">{sanitizeHtml(r.kategori_risiko_nama)}</Text></Table.Td>
                  {searchMethod === "semantic" && (
                    <Table.Td>
                      <Badge
                        size="xs"
                        color={
                          r.similarity >= 0.8 ? "green" : r.similarity >= 0.6 ? "yellow" : "gray"
                        }
                        variant="filled"
                      >
                        {(r.similarity * 100).toFixed(0)}%
                      </Badge>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Tooltip label="Tambah ke tabel">
                      <ActionIcon
                        color="blue"
                        variant="light"
                        size="sm"
                        loading={importing === r.id}
                        onClick={() => handleImport(r)}
                      >
                        <IconPlus size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Modal>
  );
});

export default function IdentifikasiRisikoPage() {
  const hotRef = useRef<HotTableRef>(null);
  const [localData, setLocalData] = useState<any[][]>([]);
  const [saving, setSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { tahunDari, tahunSampai } = useYear();
  const currentYear = new Date().getFullYear();

  const [bankOpened, { open: openBank, close: closeBank }] = useDisclosure(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    created: number;
    updated: number;
    failed: number;
    details: { row: number; status: string; risiko: string; error?: string }[];
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearchChange = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const hot = hotRef.current?.hotInstance;
      if (hot) {
        const searchPlugin = hot.getPlugin("search");
        const query = searchInputRef.current?.value || "";
        if (searchPlugin) {
          (searchPlugin as any).query(query);
        }
      }
    }, 150);
  };

  const { result: existingResult, query: listQuery } = useList({
    resource: "identifikasi-risiko",
    pagination: { pageSize: 1000 },
    filters: [
      {
        field: "tahun",
        operator: "gte",
        value: tahunDari,
      },
      {
        field: "tahun",
        operator: "lte",
        value: tahunSampai,
      },
    ],
  });

  const jenisList = useList({
    resource: "jenis-risiko",
    pagination: { mode: "off" },
  });
  const sumberList = useList({
    resource: "sumber-risiko",
    pagination: { mode: "off" },
  });
  const kategoriList = useList({
    resource: "kategori-risiko",
    pagination: { mode: "off" },
  });
  const areaList = useList({
    resource: "area-dampak",
    pagination: { mode: "off" },
  });
  const unitKerjaList = useList({
    resource: "unit-kerja",
    pagination: { mode: "off" },
  });
  const teamList = useList({
    resource: "teams",
    pagination: { mode: "off" },
  });
  const sasaranList = useList({
    resource: "sasaran",
    pagination: { mode: "off" },
  });
  const kegiatanList = useList({
    resource: "kegiatan",
    pagination: { mode: "off" },
  });
  const prosesBisnisList = useList({
    resource: "proses-bisnis",
    pagination: { mode: "off" },
  });

  const loading =
    (listQuery?.isPending ?? false) ||
    (jenisList.query?.isPending ?? false) ||
    (sumberList.query?.isPending ?? false) ||
    (kategoriList.query?.isPending ?? false) ||
    (areaList.query?.isPending ?? false) ||
    (unitKerjaList.query?.isPending ?? false) ||
    (teamList.query?.isPending ?? false) ||
    (sasaranList.query?.isPending ?? false) ||
    (kegiatanList.query?.isPending ?? false) ||
    (prosesBisnisList.query?.isPending ?? false);

  const existingData = useMemo(
    () => existingResult?.data ?? [],
    [existingResult?.data]
  );
  const refetchQuery = listQuery?.refetch;

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(
        `/api/import/identifikasi-risiko/template?tahunDari=${tahunDari}&tahunSampai=${tahunSampai}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengunduh template");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Template_Import_Identifikasi_Risiko_${
        tahunDari === tahunSampai ? tahunDari : `${tahunDari}-${tahunSampai}`
      }.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      notifications.show({
        title: "Berhasil",
        message: "Template berhasil diunduh (berisi data tahun terpilih)",
        color: "green",
      });
    } catch (e: any) {
      notifications.show({
        title: "Gagal",
        message: e?.message ?? "Gagal mengunduh template",
        color: "red",
      });
    }
  };

  const handleImportExcel = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tahunDari", String(tahunDari));
      const res = await fetch("/api/import/identifikasi-risiko", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengimport file");
      }
      setImportResult(data);
      if (refetchQuery) refetchQuery();
    } catch (e: any) {
      notifications.show({
        title: "Gagal",
        message: e?.message ?? "Gagal mengimport file",
        color: "red",
      });
    } finally {
      setImporting(false);
    }
  };

  const filteredData = useMemo(() => {
    return existingData;
  }, [existingData]);

  const jenisData = useMemo(
    () => jenisList?.result?.data ?? [],
    [jenisList?.result?.data]
  );
  const sumberData = useMemo(
    () => sumberList?.result?.data ?? [],
    [sumberList?.result?.data]
  );
  const kategoriData = useMemo(
    () => kategoriList?.result?.data ?? [],
    [kategoriList?.result?.data]
  );
  const areaData = useMemo(
    () => areaList?.result?.data ?? [],
    [areaList?.result?.data]
  );
  const unitKerjaData = useMemo(
    () => unitKerjaList?.result?.data ?? [],
    [unitKerjaList?.result?.data]
  );
  const teamData = useMemo(
    () => teamList?.result?.data ?? [],
    [teamList?.result?.data]
  );
  const sasaranData = useMemo(
    () => sasaranList?.result?.data ?? [],
    [sasaranList?.result?.data]
  );
  const kegiatanData = useMemo(
    () => kegiatanList?.result?.data ?? [],
    [kegiatanList?.result?.data]
  );
  const prosesBisnisData = useMemo(
    () => prosesBisnisList?.result?.data ?? [],
    [prosesBisnisList?.result?.data]
  );

  const jenisNamaList = useMemo(
    () => (jenisData || []).map((o: any) => o.nama),
    [jenisData]
  );
  const sumberNamaList = useMemo(
    () => (sumberData || []).map((o: any) => o.nama),
    [sumberData]
  );
  const kategoriNamaList = useMemo(
    () => (kategoriData || []).map((o: any) => o.nama),
    [kategoriData]
  );
  const areaNamaList = useMemo(
    () => (areaData || []).map((o: any) => o.nama),
    [areaData]
  );
  const unitKerjaNamaList = useMemo(
    () => (unitKerjaData || []).map((o: any) => o.nama),
    [unitKerjaData]
  );
  const teamNamaList = useMemo(
    () => (teamData || []).map((o: any) => o.nama),
    [teamData]
  );
  const sasaranNamaList = useMemo(
    () => (sasaranData || []).map((o: any) => o.nama),
    [sasaranData]
  );
  const kegiatanNamaList = useMemo(
    () => (kegiatanData || []).map((o: any) => o.nama),
    [kegiatanData]
  );
  const prosesBisnisNamaList = useMemo(
    () => (prosesBisnisData || []).map((o: any) => o.nama),
    [prosesBisnisData]
  );

  useEffect(() => {
    if (loading) return;
    const records = filteredData as any[];
    const mapped = records.map((r: any) => {
      const jr = jenisData.find((o: any) => o.id === r.jenisRisikoId);
      const sr = sumberData.find((o: any) => o.id === r.sumberRisikoId);
      const kr = kategoriData.find((o: any) => o.id === r.kategoriRisikoId);
      const ad = areaData.find((o: any) => o.id === r.areaDampakId);
      const uk = (unitKerjaData || []).find((o: any) => o.id === r.unitKerjaId);
      const tim = (teamData || []).find((o: any) => o.id === r.teamId);
      const kg = (kegiatanData || []).find((o: any) => o.id === r.kegiatanId);
      const sasaran = r.sasaranId
        ? (sasaranData || []).find((o: any) => o.id === r.sasaranId)
        : kg?.sasaranId
        ? (sasaranData || []).find((o: any) => o.id === kg.sasaranId)
        : null;
      const prosesBisnis = r.prosesBisnisId
        ? (prosesBisnisData || []).find((o: any) => o.id === r.prosesBisnisId)
        : kg?.id
        ? (prosesBisnisData || []).find((o: any) => o.kegiatanId === kg.id)
        : null;
      return [
        r.id,
        sasaran?.nama ?? "",
        kg?.nama ?? "",
        prosesBisnis?.nama ?? "",
        r.risiko,
        jr?.nama ?? "",
        sr?.nama ?? "",
        kr?.nama ?? "",
        ad?.nama ?? "",
        r.penyebab ?? "",
        r.dampak ?? "",
        r.tahun ?? currentYear,
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, "", "", "", "", "", "", "", "", "", "", currentYear]);
    }
    setLocalData(padded);
  }, [
    loading,
    filteredData,
    jenisData,
    sumberData,
    kategoriData,
    areaData,
    unitKerjaData,
    teamData,
    sasaranData,
    kegiatanData,
    prosesBisnisData,
  ]);

  const saveAll = useCallback(async () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const rows = hot.getData() as any[][];
    setSaving(true);

    const newRows: { index: number; payload: any }[] = [];
    const updateRows: { index: number; id: number; payload: any }[] = [];

    const findId = (items: any[], nama: string) => {
      const found = items.find((o: any) => o.nama === nama);
      return found ? found.id : NaN;
    };

    rows.forEach((row, idx) => {
      const id = parseInt(row[0] as string, 10);
      const sasaranName = (row[1] as string) ?? "";
      const kegiatanName = (row[2] as string) ?? "";
      const prosesBisnisName = (row[3] as string) ?? "";
      const risiko = (row[4] as string) ?? "";
      if (!risiko) return;

      const jenisRisikoId = findId(jenisData, (row[5] as string) ?? "");
      const sumberRisikoId = findId(sumberData, (row[6] as string) ?? "");
      const kategoriRisikoId = findId(kategoriData, (row[7] as string) ?? "");
      const areaDampakId = findId(areaData, (row[8] as string) ?? "");

      if (
        isNaN(jenisRisikoId) ||
        isNaN(sumberRisikoId) ||
        isNaN(kategoriRisikoId) ||
        isNaN(areaDampakId)
      ) {
        return;
      }

      const selectedSasaran = sasaranName
        ? (sasaranData || []).find((o: any) => o.nama === sasaranName)
        : null;
      const selectedProsesBisnis = prosesBisnisName
        ? (prosesBisnisData || []).find((pb: any) => {
            if (pb.nama !== prosesBisnisName) return false;
            if (!selectedSasaran) return true;
            const kegiatan = (kegiatanData || []).find(
              (kg: any) => kg.id === pb.kegiatanId
            );
            return kegiatan?.sasaranId === selectedSasaran.id;
          }) ??
          (prosesBisnisData || []).find(
            (pb: any) => pb.nama === prosesBisnisName
          )
        : null;
      const selectedKegiatan = kegiatanName
        ? (kegiatanData || []).find(
            (o: any) =>
              o.nama === kegiatanName &&
              (!selectedSasaran || o.sasaranId === selectedSasaran.id)
          ) ?? (kegiatanData || []).find((o: any) => o.nama === kegiatanName)
        : selectedProsesBisnis?.kegiatanId
        ? (kegiatanData || []).find(
            (o: any) => o.id === selectedProsesBisnis.kegiatanId
          )
        : null;
      const tahun = parseInt(row[11] as string, 10) || currentYear;
      const unitKerjaId = selectedKegiatan?.unitKerjaId ?? null;
      const kegiatanId =
        selectedKegiatan?.id ?? selectedProsesBisnis?.kegiatanId ?? null;
      const sasaranId =
        selectedSasaran?.id ?? selectedKegiatan?.sasaranId ?? null;
      const prosesBisnisId = selectedProsesBisnis?.id ?? null;

      // Kolom FK opsional dikirim hanya jika ada nilainya - schema validasi
      // menolak null untuk field opsional.
      const payload = {
        risiko,
        jenisRisikoId,
        sumberRisikoId,
        kategoriRisikoId,
        areaDampakId,
        ...(sasaranId !== null && { sasaranId }),
        ...(unitKerjaId !== null && { unitKerjaId }),
        ...(kegiatanId !== null && { kegiatanId }),
        ...(prosesBisnisId !== null && { prosesBisnisId }),
        penyebab: (row[9] as string) || null,
        dampak: (row[10] as string) || null,
        tahun,
      };

      if (isNaN(id) || id === 0 || id === null) {
        newRows.push({ index: idx, payload });
      } else {
        updateRows.push({ index: idx, id, payload });
      }
    });

    if (newRows.length === 0 && updateRows.length === 0) {
      notifications.show({
        title: "Tidak Ada Data",
        message: "Tidak ada baris yang perlu disimpan",
        color: "orange",
      });
      setSaving(false);
      return;
    }

    try {
      if (newRows.length > 0) {
        const results = await Promise.all(
          newRows.map(({ index, payload }) =>
            fetch("/api/identifikasi-risiko", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).then(async (res) => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                  err?.error ?? `Gagal menyimpan baris ${index + 1}`
                );
              }
              return res.json().then((data) => ({ index, data }));
            })
          )
        );
        results.forEach(({ index, data }) => {
          if (data?.id && hot) {
            hot.setDataAtCell(index, 0, data.id, "saveAll");
          }
        });
      }
      if (updateRows.length > 0) {
        await Promise.all(
          updateRows.map(({ id, payload }) =>
            fetch(`/api/identifikasi-risiko/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).then(async (res) => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? `Gagal memperbarui ID ${id}`);
              }
            })
          )
        );
      }
      notifications.show({
        title: "Tersimpan",
        message: "Semua data berhasil disimpan",
        color: "green",
      });
      if (refetchQuery) refetchQuery();
    } catch (e: any) {
      notifications.show({
        title: "Gagal",
        message: e?.message ?? "Gagal menyimpan data",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }, [
    refetchQuery,
    jenisData,
    sumberData,
    kategoriData,
    areaData,
    unitKerjaData,
    sasaranData,
    kegiatanData,
    prosesBisnisData,
  ]);

  const columns: Handsontable.ColumnSettings[] = useMemo(
    () => [
      { title: "ID", data: 0, type: "numeric", width: 1 },
      {
        title: "Sasaran",
        data: 1,
        type: "autocomplete",
        source: sasaranNamaList || [],
        width: 180,
        strict: false,
        filter: false,
        visibleRows: 8,
      },
      {
        title: "Kegiatan",
        data: 2,
        type: "autocomplete",
        source: kegiatanNamaList || [],
        width: 180,
        strict: false,
        filter: false,
        visibleRows: 8,
      },
      {
        title: "Proses Bisnis",
        data: 3,
        type: "autocomplete",
        source: prosesBisnisNamaList || [],
        width: 180,
        strict: false,
        filter: false,
        visibleRows: 8,
      },
      { title: "Risiko", data: 4, type: "text", width: 220 },
      {
        title: "Jenis Risiko",
        data: 5,
        type: "autocomplete",
        source: jenisNamaList || [],
        width: 150,
        strict: true,
        filter: false,
        visibleRows: 8,
        allowInvalid: false,
      },
      {
        title: "Sumber Risiko",
        data: 6,
        type: "autocomplete",
        source: sumberNamaList || [],
        width: 150,
        strict: true,
        filter: false,
        visibleRows: 8,
        allowInvalid: false,
      },
      {
        title: "Kategori",
        data: 7,
        type: "autocomplete",
        source: kategoriNamaList || [],
        width: 150,
        strict: true,
        filter: false,
        visibleRows: 8,
        allowInvalid: false,
      },
      {
        title: "Area Dampak",
        data: 8,
        type: "autocomplete",
        source: areaNamaList || [],
        width: 150,
        strict: true,
        filter: false,
        visibleRows: 8,
        allowInvalid: false,
      },
      { title: "Penyebab", data: 9, type: "text", width: 200 },
      { title: "Dampak", data: 10, type: "text", width: 200 },
      { title: "Tahun", data: 11, type: "numeric", width: 1 },
    ],
    [
      jenisNamaList,
      sumberNamaList,
      kategoriNamaList,
      areaNamaList,
      unitKerjaNamaList,
      teamNamaList,
      sasaranNamaList,
      kegiatanNamaList,
      prosesBisnisNamaList,
    ]
  );

  const applyProgressiveCascade = useCallback(
    (
      hot: Handsontable.Core,
      changes: Handsontable.CellChange[],
      source?: Handsontable.ChangeSource
    ) => {
      if (!changes || SYSTEM_CHANGE_SOURCES.has(String(source))) return;

      const changedRowsToFocus = new Set<number>();
      const changedColsByRow = new Map<number, Set<number>>();

      for (const change of changes) {
        if (!isCellChange(change)) continue;
        const [row, col] = change;
        if (typeof row !== "number" || typeof col !== "number") continue;
        const changedCols = changedColsByRow.get(row) ?? new Set<number>();
        changedCols.add(col);
        changedColsByRow.set(row, changedCols);
      }

      for (const change of changes) {
        if (!isCellChange(change)) continue;
        const [row, col, oldValue, newValue] = change;
        if (typeof row !== "number" || typeof col !== "number") continue;
        if (!isProgressiveColumn(col)) continue;
        if (oldValue === newValue) continue;

        const changedCols = changedColsByRow.get(row);
        for (const downstreamCol of getColumnsAfter(col)) {
          if (changedCols?.has(downstreamCol)) continue;
          if (isFilledCellValue(hot.getDataAtCell(row, downstreamCol))) {
            hot.setDataAtCell(row, downstreamCol, "", "progressive-reset");
          }
        }

        if (isFilledCellValue(newValue)) {
          changedRowsToFocus.add(row);
        }
      }

      if (changes.length !== 1 || changedRowsToFocus.size === 0) return;

      window.setTimeout(() => {
        const targetRow = changedRowsToFocus.values().next().value;
        if (typeof targetRow !== "number") return;
        const rowData = hot.getDataAtRow(targetRow) as unknown[];
        const nextCol = getFirstUnlockedEmptyColumn(rowData);
        if (typeof nextCol === "number") {
          hot.selectCell(targetRow, nextCol);
        }
      }, 0);
    },
    []
  );

  const handleBeforeChange = useCallback(
    (changes: (Handsontable.CellChange | null)[] | null, source?: Handsontable.ChangeSource) => {
      const hot = hotRef.current?.hotInstance;
      if (!changes || !hot || SYSTEM_CHANGE_SOURCES.has(String(source))) return;

      const shadowRows = new Map<number, unknown[]>();

      const getShadowRow = (row: number) => {
        if (!shadowRows.has(row)) {
          shadowRows.set(row, [...(hot.getDataAtRow(row) as unknown[])]);
        }
        return shadowRows.get(row)!;
      };

      changes
        .filter(isCellChange)
        .map((change, index) => ({ change, index }))
        .sort((a, b) => {
          const rowDiff = Number(a.change[0]) - Number(b.change[0]);
          if (rowDiff !== 0) return rowDiff;
          return Number(a.change[1]) - Number(b.change[1]);
        })
        .forEach(({ change }) => {
          const [row, col, , newValue] = change;
          if (typeof row !== "number" || typeof col !== "number") return;

          const shadowRow = getShadowRow(row);
          const isAllowed = isColumnUnlockedForRow(shadowRow, col);

          if (!isAllowed) {
            change[3] = hot.getDataAtCell(row, col);
            return;
          }

          shadowRow[col] = newValue;
        });
    },
    []
  );

  const getCellMeta = useCallback(
    (row: number, col: number) => {
      const rowData = getSafeRowData(hotRef.current?.hotInstance, localData, row);
      const isLocked = isProgressiveColumn(col) && !isColumnUnlockedForRow(rowData, col);
      const isSystemColumn = col === 0 || col === 11;

      return {
        readOnly: isSystemColumn || isLocked,
        className: isLocked ? "rm-progressive-locked-cell" : undefined,
      };
    },
    [localData]
  );

  if (loading || !isMounted) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Identifikasi Risiko</Title>
        <Group>
          <Button
            variant="light"
            leftSection={<IconDatabase size={16} />}
            onClick={openBank}
          >
            Cari dari Bank Risiko
          </Button>
          <Button
            variant="light"
            color="indigo"
            leftSection={<IconDownload size={16} />}
            onClick={handleDownloadTemplate}
          >
            Unduh Template
          </Button>
          <FileButton accept=".xlsx,.xlsm,.xls,.xlsb,.csv" onChange={handleImportExcel}>
            {(props) => (
              <Button
                {...props}
                variant="light"
                color="green"
                leftSection={<IconUpload size={16} />}
                loading={importing}
              >
                Import Excel
              </Button>
            )}
          </FileButton>
          <TextInput
            placeholder="Cari & Tandai Sel..."
            size="xs"
            ref={searchInputRef}
            onChange={handleSearchChange}
            style={{ width: 220 }}
          />
          <Button onClick={saveAll} loading={saving}>
            Simpan Semua
          </Button>
        </Group>
      </Group>
      <Text size="sm" c="dimmed">
        Isi data langsung di sel. Baris baru otomatis tersedia. Seret kolom
        untuk memindahkan, tarik sudut sel untuk autofill, gunakan Ctrl+C/V
        untuk salin-tempel.
      </Text>
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        cells={getCellMeta}
        colHeaders={[
          "ID",
          "Sasaran",
          "Kegiatan",
          "Proses Bisnis",
          "Risiko",
          "Jenis Risiko",
          "Sumber Risiko",
          "Kategori",
          "Area Dampak",
          "Penyebab",
          "Dampak",
        ]}
        hiddenColumns={{
          columns: [0],
          indicators: false,
        }}
        afterChange={(changes, source) => {
          if (!changes || source === "loadData" || source === "auto") return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;

          applyProgressiveCascade(hot, changes, source);

          for (const [row, col, , newValue] of changes) {
            if (col === 2 && newValue) {
              const currentSasaranName = hot.getDataAtCell(row, 1) as string;
              const currentSasaran = currentSasaranName
                ? (sasaranData || []).find(
                    (o: any) => o.nama === currentSasaranName
                  )
                : null;
              const kegiatan =
                (kegiatanData || []).find(
                  (o: any) =>
                    o.nama === newValue &&
                    (!currentSasaran || o.sasaranId === currentSasaran.id)
                ) ?? (kegiatanData || []).find((o: any) => o.nama === newValue);
              if (!kegiatan) continue;

              const sasaran = (sasaranData || []).find(
                (o: any) => o.id === kegiatan.sasaranId
              );
              const prosesBisnis = (prosesBisnisData || []).find(
                (o: any) => o.kegiatanId === kegiatan.id
              );

              if (sasaran?.nama)
                hot.setDataAtCell(row, 1, sasaran.nama, "auto");
              if (prosesBisnis?.nama)
                hot.setDataAtCell(row, 3, prosesBisnis.nama, "auto");
            }

            if (col === 3 && newValue) {
              const prosesBisnis = (prosesBisnisData || []).find(
                (o: any) => o.nama === newValue
              );
              const kegiatan = prosesBisnis?.kegiatanId
                ? (kegiatanData || []).find(
                    (o: any) => o.id === prosesBisnis.kegiatanId
                  )
                : null;
              const sasaran = kegiatan?.sasaranId
                ? (sasaranData || []).find(
                    (o: any) => o.id === kegiatan.sasaranId
                  )
                : null;

              if (kegiatan?.nama)
                hot.setDataAtCell(row, 2, kegiatan.nama, "auto");
              if (sasaran?.nama)
                hot.setDataAtCell(row, 1, sasaran.nama, "auto");
            }
          }
          hot.render();
        }}
        beforeChange={handleBeforeChange}
        beforeOnCellMouseDown={(event, coords) => {
          preventLockedCellMouseDown(event, coords, hotRef.current?.hotInstance, PROGRESSIVE_INPUT_COLUMNS);
          openUnlockedDropdownOnMouseDown(event, hotRef.current?.hotInstance, coords, PROGRESSIVE_INPUT_COLUMNS);
        }}
        rowHeaders={true}
        height="auto"
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        contextMenu={true}
        copyPaste={true}
        fillHandle={true}
        minSpareRows={1}
        autoWrapRow={true}
        autoWrapCol={true}
        enterMoves={{ col: 0, row: 1 }}
        tabMoves={{ col: 1, row: 0 }}
        manualColumnResize={true}
        manualColumnMove={true}
        search={true}
/>

      <style jsx global>{`
        .handsontable td.rm-progressive-locked-cell {
          color: var(--ht-locked-text, #667085) !important;
          cursor: not-allowed;
          background:
            repeating-linear-gradient(
              -45deg,
              var(--ht-locked-stripe-a, rgba(148, 163, 184, 0.08)),
              var(--ht-locked-stripe-a, rgba(148, 163, 184, 0.08)) 6px,
              var(--ht-locked-stripe-b, rgba(148, 163, 184, 0.16)) 6px,
              var(--ht-locked-stripe-b, rgba(148, 163, 184, 0.16)) 12px
            ),
            linear-gradient(
              var(--ht-locked-bg, #f6f8fb),
              var(--ht-locked-bg, #f6f8fb)
            ) !important;
        }

        .handsontable td.rm-progressive-locked-cell .htAutocompleteArrow {
          opacity: 0.45;
        }
      `}</style>

      <BankRisikoModal
        opened={bankOpened}
        onClose={closeBank}
        tahun={tahunDari}
        onImport={() => refetchQuery?.()}
      />

      <Modal
        opened={importResult !== null}
        onClose={() => setImportResult(null)}
        title="Hasil Import Excel"
        size="lg"
      >
        <Stack gap="sm">
          <Group gap="xs">
            <Badge color="green">{importResult?.created} dibuat</Badge>
            <Badge color="blue">{importResult?.updated} diperbarui</Badge>
            <Badge color="red">{importResult?.failed} gagal</Badge>
            <Badge variant="light" color="gray">
              {importResult?.total} total baris
            </Badge>
          </Group>
          {importResult && importResult.details.length > 0 && (
            <ScrollArea.Autosize mah={360} type="hover">
              <Table striped withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 60 }}>Baris</Table.Th>
                    <Table.Th style={{ width: 90 }}>Status</Table.Th>
                    <Table.Th>Risiko</Table.Th>
                    <Table.Th style={{ width: "40%" }}>Keterangan</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {importResult.details.map((d) => (
                    <Table.Tr key={d.row}>
                      <Table.Td>{d.row}</Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          color={
                            d.status === "created"
                              ? "green"
                              : d.status === "updated"
                              ? "blue"
                              : "red"
                          }
                        >
                          {d.status === "created"
                            ? "Baru"
                            : d.status === "updated"
                            ? "Diperbarui"
                            : "Gagal"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{d.risiko || "-"}</Table.Td>
                      <Table.Td c={d.error ? "red" : "dimmed"}>
                        {d.error || "OK"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setImportResult(null)}>
              Tutup
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
