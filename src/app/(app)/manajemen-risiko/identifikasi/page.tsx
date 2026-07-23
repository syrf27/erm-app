"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
} from "@mantine/core";
import { useYear } from "@/lib/year-context";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllModules } from "handsontable/registry";

if (typeof window !== "undefined") {
  registerAllModules();
}

export default function IdentifikasiRisikoPage() {
  const hotRef = useRef<HotTableRef>(null);
  const [localData, setLocalData] = useState<any[][]>([]);
  const [saving, setSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const { tahunDari, tahunSampai } = useYear();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchVal(query);
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      const searchPlugin = hot.getPlugin("search");
      if (searchPlugin) {
        // Query search and trigger render
        (searchPlugin as any).query(query);
        hot.render();
      }
    }
  };

  const { result: existingResult, query: listQuery } = useList({
    resource: "identifikasi-risiko",
    pagination: { pageSize: 10000 },
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
    (sasaranList.query?.isPending ?? false) ||
    (kegiatanList.query?.isPending ?? false) ||
    (prosesBisnisList.query?.isPending ?? false);

  const existingData = useMemo(
    () => existingResult?.data ?? [],
    [existingResult?.data]
  );
  const refetchQuery = listQuery?.refetch;

  const filteredData = useMemo(() => {
    return existingData.filter((r: any) => {
      const t = r.tahun ?? currentYear;
      return t >= tahunDari && t <= tahunSampai;
    });
  }, [existingData, tahunDari, tahunSampai]);

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
        uk?.nama ?? "",
        r.tahun ?? currentYear,
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, "", "", "", "", "", "", "", "", "", "", "", currentYear]);
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
      const unitKerjaId = row[11]
        ? (unitKerjaData || []).find((o: any) => o.nama === row[11])?.id
        : selectedKegiatan?.unitKerjaId ?? null;
      const kegiatanId =
        selectedKegiatan?.id ?? selectedProsesBisnis?.kegiatanId ?? null;
      const sasaranId =
        selectedSasaran?.id ?? selectedKegiatan?.sasaranId ?? null;
      const prosesBisnisId = selectedProsesBisnis?.id ?? null;

      const payload = {
        risiko,
        jenisRisikoId,
        sumberRisikoId,
        kategoriRisikoId,
        areaDampakId,
        sasaranId,
        unitKerjaId,
        kegiatanId,
        prosesBisnisId,
        penyebab: (row[9] as string) || null,
        dampak: (row[10] as string) || null,
        tahun: (row[12] as number) || currentYear,
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
      {
        title: "Unit Kerja",
        data: 11,
        type: "autocomplete",
        source: unitKerjaNamaList || [],
        width: 150,
        strict: false,
        filter: false,
        visibleRows: 8,
      },
      { title: "Tahun", data: 12, type: "numeric", width: 1 },
    ],
    [
      jenisNamaList,
      sumberNamaList,
      kategoriNamaList,
      areaNamaList,
      unitKerjaNamaList,
      sasaranNamaList,
      kegiatanNamaList,
      prosesBisnisNamaList,
    ]
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
          <TextInput
            placeholder="Cari & Tandai Sel..."
            size="xs"
            value={searchVal}
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
          "Unit Kerja",
        ]}
        hiddenColumns={{
          columns: [0, 12],
          indicators: false,
        }}
        afterChange={(changes, source) => {
          if (!changes || source === "loadData" || source === "auto") return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;

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
    </Stack>
  );
}
