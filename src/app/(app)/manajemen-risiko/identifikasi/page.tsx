"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import { Title, Button, Group, Loader, Center, Stack, Text, TextInput } from "@mantine/core";
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

  const jenisList = useList({ resource: "jenis-risiko", pagination: { mode: "off" } });
  const sumberList = useList({ resource: "sumber-risiko", pagination: { mode: "off" } });
  const kategoriList = useList({ resource: "kategori-risiko", pagination: { mode: "off" } });
  const areaList = useList({ resource: "area-dampak", pagination: { mode: "off" } });

  const loading =
    (listQuery?.isPending ?? false) ||
    (jenisList.query?.isPending ?? false) ||
    (sumberList.query?.isPending ?? false) ||
    (kategoriList.query?.isPending ?? false) ||
    (areaList.query?.isPending ?? false);

  const existingData = useMemo(() => existingResult?.data ?? [], [existingResult?.data]);
  const refetchQuery = listQuery?.refetch;

  const jenisData = useMemo(() => jenisList.result?.data ?? [], [jenisList.result?.data]);
  const sumberData = useMemo(() => sumberList.result?.data ?? [], [sumberList.result?.data]);
  const kategoriData = useMemo(() => kategoriList.result?.data ?? [], [kategoriList.result?.data]);
  const areaData = useMemo(() => areaList.result?.data ?? [], [areaList.result?.data]);

  const jenisNamaList = useMemo(() => jenisData.map((o: any) => o.nama), [jenisData]);
  const sumberNamaList = useMemo(() => sumberData.map((o: any) => o.nama), [sumberData]);
  const kategoriNamaList = useMemo(() => kategoriData.map((o: any) => o.nama), [kategoriData]);
  const areaNamaList = useMemo(() => areaData.map((o: any) => o.nama), [areaData]);

  useEffect(() => {
    if (loading) return;
    const records = existingData as any[];
    const mapped = records.map((r: any) => {
      const jr = jenisData.find((o: any) => o.id === r.jenisRisikoId);
      const sr = sumberData.find((o: any) => o.id === r.sumberRisikoId);
      const kr = kategoriData.find((o: any) => o.id === r.kategoriRisikoId);
      const ad = areaData.find((o: any) => o.id === r.areaDampakId);
      return [
        r.id,
        r.risiko,
        jr?.nama ?? "",
        sr?.nama ?? "",
        kr?.nama ?? "",
        ad?.nama ?? "",
        r.penyebab ?? "",
        r.dampak ?? "",
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, "", "", "", "", "", "", ""]);
    }
    setLocalData(padded);
  }, [loading, existingData, jenisData, sumberData, kategoriData, areaData]);

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
      const risiko = (row[1] as string) ?? "";
      if (!risiko) return;

      const jenisRisikoId = findId(jenisData, (row[2] as string) ?? "");
      const sumberRisikoId = findId(sumberData, (row[3] as string) ?? "");
      const kategoriRisikoId = findId(kategoriData, (row[4] as string) ?? "");
      const areaDampakId = findId(areaData, (row[5] as string) ?? "");

      if (isNaN(jenisRisikoId) || isNaN(sumberRisikoId) || isNaN(kategoriRisikoId) || isNaN(areaDampakId)) {
        return;
      }

      const payload = {
        risiko,
        jenisRisikoId,
        sumberRisikoId,
        kategoriRisikoId,
        areaDampakId,
        penyebab: (row[6] as string) || null,
        dampak: (row[7] as string) || null,
      };

      if (isNaN(id) || id === 0 || id === null) {
        newRows.push({ index: idx, payload });
      } else {
        updateRows.push({ index: idx, id, payload });
      }
    });

    if (newRows.length === 0 && updateRows.length === 0) {
      notifications.show({ title: "Tidak Ada Data", message: "Tidak ada baris yang perlu disimpan", color: "orange" });
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
                throw new Error(err?.error ?? `Gagal menyimpan baris ${index + 1}`);
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
      notifications.show({ title: "Tersimpan", message: "Semua data berhasil disimpan", color: "green" });
      if (refetchQuery) refetchQuery();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal menyimpan data", color: "red" });
    } finally {
      setSaving(false);
    }
  }, [refetchQuery, jenisData, sumberData, kategoriData, areaData]);

  const columns: Handsontable.ColumnSettings[] = [
    { title: "ID", data: 0, type: "numeric", width: 1 },
    { title: "Risiko", data: 1, type: "text", width: 200 },
    {
      title: "Jenis Risiko",
      data: 2,
      type: "dropdown",
      source: jenisNamaList,
      width: 150,
      strict: true,
    },
    {
      title: "Sumber Risiko",
      data: 3,
      type: "dropdown",
      source: sumberNamaList,
      width: 150,
      strict: true,
    },
    {
      title: "Kategori",
      data: 4,
      type: "dropdown",
      source: kategoriNamaList,
      width: 150,
      strict: true,
    },
    {
      title: "Area Dampak",
      data: 5,
      type: "dropdown",
      source: areaNamaList,
      width: 150,
      strict: true,
    },
    { title: "Penyebab", data: 6, type: "text", width: 200 },
    { title: "Dampak", data: 7, type: "text", width: 200 },
  ];

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
        Isi data langsung di sel. Baris baru otomatis tersedia. Seret kolom untuk memindahkan, tarik sudut sel untuk autofill, gunakan Ctrl+C/V untuk salin-tempel.
      </Text>
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        colHeaders={[
          "ID",
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
