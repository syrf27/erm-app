"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Title,
  TextInput,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  Loader,
  Center,
  Text,
  ActionIcon,
  Tooltip,
  Card,
  NumberInput,
  Notification,
} from "@mantine/core";
import { IconSearch, IconPlus, IconCheck } from "@tabler/icons-react";
import { useYear } from "@/lib/year-context";
import { notifications } from "@mantine/notifications";
import { sanitizeHtml } from "@/lib/sanitize";

interface RiskResult {
  id: number;
  risiko: string;
  penyebab: string | null;
  dampak: string | null;
  tahun: number;
  jenis_risiko_id: number;
  jenis_risiko_nama: string;
  sumber_risiko_id: number;
  sumber_risiko_nama: string;
  kategori_risiko_id: number;
  kategori_risiko_nama: string;
  area_dampak_id: number;
  area_dampak_nama: string;
  sasaran_id: number | null;
  sasaran_nama: string | null;
  kegiatan_id: number | null;
  kegiatan_nama: string | null;
  proses_bisnis_id: number | null;
  proses_bisnis_nama: string | null;
  unit_kerja_id: number | null;
  unit_kerja_nama: string | null;
  similarity: number;
}

export default function BankRisikoPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RiskResult[]>([]);
  const [searchMethod, setSearchMethod] = useState<string>("");
  const [semanticUnavailableReason, setSemanticUnavailableReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [imported, setImported] = useState<Set<number>>(new Set());
  const [limit, setLimit] = useState(20);
  const { tahunDari, tahunSampai } = useYear();

  const fetchInitialRisks = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (tahunDari === tahunSampai) {
        params.set("tahun", String(tahunDari));
      }

      const res = await fetch(`/api/bank-risiko/search?${params.toString()}`);
      const data = await res.json();
      if (data.error) {
        notifications.show({
          title: "Error",
          message: data.error,
          color: "red",
        });
        return;
      }
      setResults(data.results || []);
      setSearchMethod(data.method || "browse");
      setSemanticUnavailableReason("");
    } catch (e: any) {
      notifications.show({
        title: "Error",
        message: "Gagal memuat data bank risiko",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [limit, tahunDari, tahunSampai]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      await fetchInitialRisks();
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/bank-risiko/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          limit,
          tahun: tahunDari === tahunSampai ? tahunDari : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        notifications.show({
          title: "Error",
          message: data.error,
          color: "red",
        });
        return;
      }
      setResults(data.results || []);
      setSearchMethod(data.method || "text");
      setSemanticUnavailableReason(data.semanticUnavailableReason || "");
    } catch (e: any) {
      notifications.show({
        title: "Error",
        message: "Gagal mencari risiko",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [query, limit, tahunDari, tahunSampai, fetchInitialRisks]);

  useEffect(() => {
    if (!query.trim()) {
      fetchInitialRisks();
    }
  }, [query, fetchInitialRisks]);

  const handleImport = useCallback(
    async (risk: RiskResult) => {
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
          sasaranId: risk.sasaran_id,
          kegiatanId: risk.kegiatan_id,
          prosesBisnisId: risk.proses_bisnis_id,
          unitKerjaId: risk.unit_kerja_id,
          tahun: tahunDari,
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

        setImported((prev) => new Set(prev).add(risk.id));
        notifications.show({
          title: "Berhasil",
          message: `Risiko "${risk.risiko.substring(0, 50)}..." berhasil ditambahkan ke Identifikasi Risiko`,
          color: "green",
        });
      } catch (e: any) {
        notifications.show({
          title: "Gagal",
          message: e?.message ?? "Gagal mengimpor risiko",
          color: "red",
        });
      } finally {
        setImporting(null);
      }
    },
    [tahunDari]
  );

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return "green";
    if (score >= 0.6) return "yellow";
    if (score >= 0.4) return "orange";
    return "gray";
  };

  const getSearchFallbackMessage = () => {
    switch (semanticUnavailableReason) {
      case "embedding_auth_failed":
        return " - GEMINI_API_KEY tidak valid, pencarian semantik dinonaktifkan sementara";
      case "embedding_failed":
        return " - layanan embedding gagal, fallback ke pencarian teks";
      case "no_embeddings":
        return " - data embedding belum tersedia";
      case "pgvector_unavailable":
        return " - pgvector belum tersedia, install untuk pencarian semantik";
      default:
        return "";
    }
  };

  return (
    <Stack>
      <Title order={3}>Bank Risiko</Title>
      <Text size="sm" c="dimmed">
        Cari risiko yang sudah tercatat di database. Gunakan pencarian semantik
        untuk menemukan risiko berdasarkan makna, bukan hanya kata kunci.
      </Text>

      <Card withBorder>
        <Group align="end">
          <TextInput
            label="Cari Risiko"
            placeholder="Ketik kata kunci atau deskripsi risiko..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            style={{ flex: 1 }}
            leftSection={<IconSearch size={16} />}
          />
          <NumberInput
            label="Limit"
            value={limit}
            onChange={(v) => setLimit(Number(v) || 20)}
            min={5}
            max={100}
            w={100}
          />
          <Button onClick={handleSearch} loading={loading} mt="xs">
            Cari
          </Button>
        </Group>
      </Card>

      {searchMethod && searched && (
        <Text size="xs" c="dimmed">
          Metode pencarian:{" "}
          <Badge
            size="xs"
            color={searchMethod === "semantic" ? "green" : "gray"}
            variant="light"
          >
            {searchMethod === "semantic"
              ? "Semantik (AI)"
              : searchMethod === "browse"
                ? "Data awal"
                : "Teks (ILIKE)"}
          </Badge>
          {searchMethod === "text" &&
            getSearchFallbackMessage()}
        </Text>
      )}

      {loading && (
        <Center h={200}>
          <Loader />
        </Center>
      )}

      {!loading && searched && results.length === 0 && (
        <Center h={200}>
          <Text c="dimmed">
            Tidak ada hasil untuk &quot;{query}&quot;
          </Text>
        </Center>
      )}

      {!loading && results.length > 0 && (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Risiko</Table.Th>
              <Table.Th>Jenis</Table.Th>
              <Table.Th>Sumber</Table.Th>
              <Table.Th>Kategori</Table.Th>
              <Table.Th>Area Dampak</Table.Th>
              <Table.Th>Penyebab</Table.Th>
              <Table.Th>Dampak</Table.Th>
              {searchMethod === "semantic" && (
                <Table.Th w={100}>Skor</Table.Th>
              )}
              <Table.Th w={80}>Aksi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((r) => {
              const isImported = imported.has(r.id);
              return (
                <Table.Tr key={r.id}>
                  <Table.Td maw={300}>
                    <Text size="sm" lineClamp={2}>
                      {sanitizeHtml(r.risiko)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="light">
                      {sanitizeHtml(r.jenis_risiko_nama)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{sanitizeHtml(r.sumber_risiko_nama)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{sanitizeHtml(r.kategori_risiko_nama)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{sanitizeHtml(r.area_dampak_nama)}</Text>
                  </Table.Td>
                  <Table.Td maw={200}>
                    <Text size="xs" lineClamp={2}>
                      {sanitizeHtml(r.penyebab || "-")}
                    </Text>
                  </Table.Td>
                  <Table.Td maw={200}>
                    <Text size="xs" lineClamp={2}>
                      {sanitizeHtml(r.dampak || "-")}
                    </Text>
                  </Table.Td>
                  {searchMethod === "semantic" && (
                    <Table.Td>
                      <Badge
                        size="xs"
                        color={getSimilarityColor(r.similarity)}
                        variant="filled"
                      >
                        {(r.similarity * 100).toFixed(0)}%
                      </Badge>
                    </Table.Td>
                  )}
                  <Table.Td>
                    {isImported ? (
                      <Tooltip label="Sudah ditambahkan">
                        <ActionIcon color="green" variant="light" size="sm">
                          <IconCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip label="Tambah ke Identifikasi Risiko">
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
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
