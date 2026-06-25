"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import { Title, Button, Group, Loader, Center, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllCellTypes } from "handsontable/cellTypes";
registerAllCellTypes();

export default function AnalisisRisikoPage() {
  const hotRef = useRef<HotTableRef>(null);
  const [localData, setLocalData] = useState<any[][]>([]);
  const [saving, setSaving] = useState(false);

  const identResult = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 10000 } });
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });

  const levelKemungkinanList = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const levelDampakList = useList({ resource: "level-dampak", pagination: { mode: "off" } });
  const levelRisikoList = useList({ resource: "level-risiko", pagination: { mode: "off" } });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (levelKemungkinanList.query?.isPending ?? false) ||
    (levelDampakList.query?.isPending ?? false) ||
    (levelRisikoList.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const refetchQuery = analisisResult.query?.refetch;

  const kemungkinanData = useMemo(() => levelKemungkinanList.result?.data ?? [], [levelKemungkinanList.result?.data]);
  const dampakData = useMemo(() => levelDampakList.result?.data ?? [], [levelDampakList.result?.data]);
  const risikoData = useMemo(() => levelRisikoList.result?.data ?? [], [levelRisikoList.result?.data]);

  const kemungkinanNamaList = useMemo(() => kemungkinanData.map((o: any) => o.nama), [kemungkinanData]);
  const dampakNamaList = useMemo(() => dampakData.map((o: any) => o.nama), [dampakData]);
  const risikoNamaList = useMemo(() => risikoData.map((o: any) => o.nama), [risikoData]);

  useEffect(() => {
    if (loading) return;
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    const mapped = identifikasiData.map((r: Record<string, any>) => {
      const a = analisisById.get(r.id);
      const lk = kemungkinanData.find((o: any) => o.id === a?.levelKemungkinanId);
      const ld = dampakData.find((o: any) => o.id === a?.levelDampakId);
      const lr = risikoData.find((o: any) => o.id === a?.levelRisikoId);
      return [
        r.id,
        a?.id ?? null,
        r.risiko,
        lk?.nama ?? "",
        ld?.nama ?? "",
        lr?.nama ?? "",
        a?.pengendalianUraian ?? "",
        a?.pengendalianEfektivitas ?? "",
      ];
    });
    setLocalData(mapped);
  }, [loading, identifikasiData, analisisData, kemungkinanData, dampakData, risikoData]);

  const saveAll = useCallback(async () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const rows = hot.getData() as any[][];
    setSaving(true);

    const newRows: { index: number; identId: number; payload: any }[] = [];
    const updateRows: { index: number; id: number; payload: any }[] = [];

    const findId = (items: any[], nama: string) => {
      const found = items.find((o: any) => o.nama === nama);
      return found ? found.id : NaN;
    };

    rows.forEach((row, idx) => {
      const identId = parseInt(row[0] as string, 10);
      const analisisId = parseInt(row[1] as string, 10);
      if (isNaN(identId)) return;

      const levelKemungkinanId = findId(kemungkinanData, (row[3] as string) ?? "");
      const levelDampakId = findId(dampakData, (row[4] as string) ?? "");
      const levelRisikoId = findId(risikoData, (row[5] as string) ?? "");

      const payload: Record<string, any> = {};
      if (!isNaN(levelKemungkinanId)) payload.levelKemungkinanId = levelKemungkinanId;
      if (!isNaN(levelDampakId)) payload.levelDampakId = levelDampakId;
      if (!isNaN(levelRisikoId)) payload.levelRisikoId = levelRisikoId;
      payload.pengendalianUraian = (row[6] as string) || null;
      payload.pengendalianEfektivitas = (row[7] as string) || null;

      if (isNaN(analisisId) || analisisId === 0) {
        newRows.push({ index: idx, identId, payload: { ...payload, identifikasiRisikoId: identId } });
      } else {
        updateRows.push({ index: idx, id: analisisId, payload });
      }
    });

    if (newRows.length === 0 && updateRows.length === 0) {
      notifications.show({ title: "Tidak Ada Data", message: "Tidak ada perubahan yang perlu disimpan", color: "orange" });
      setSaving(false);
      return;
    }

    try {
      if (newRows.length > 0) {
        const results = await Promise.all(
          newRows.map(({ index, identId, payload }) =>
            fetch("/api/analisis-risiko", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).then(async (res) => {
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? `Gagal menyimpan baris ${index + 1}`);
              }
              return res.json().then((data) => ({ index, identId, data }));
            })
          )
        );
        results.forEach(({ index, data }) => {
          if (data?.id && hot) {
            hot.setDataAtCell(index, 1, data.id, "saveAll");
          }
        });
      }
      if (updateRows.length > 0) {
        await Promise.all(
          updateRows.map(({ id, payload }) =>
            fetch(`/api/analisis-risiko/${id}`, {
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
  }, [refetchQuery, kemungkinanData, dampakData, risikoData]);

  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Analisis ID", data: 1, type: "numeric", width: 1 },
    { title: "Risiko", data: 2, type: "text", width: 250, readOnly: true },
    {
      title: "Level Kemungkinan",
      data: 3,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 180,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 4,
      type: "dropdown",
      source: dampakNamaList,
      width: 180,
      strict: true,
    },
    {
      title: "Level Risiko",
      data: 5,
      type: "dropdown",
      source: risikoNamaList,
      width: 180,
      strict: true,
    },
    { title: "Uraian", data: 6, type: "text", width: 250 },
    { title: "Efektivitas", data: 7, type: "text", width: 200 },
  ];

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Analisis Risiko</Title>
        <Button onClick={saveAll} loading={saving}>
          Simpan Semua
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Isi level risiko untuk setiap risiko yang teridentifikasi. Klik &quot;Simpan Semua&quot; untuk menyimpan.
      </Text>
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        colHeaders={[
          "Ident ID",
          "Analisis ID",
          "Risiko",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
          "Uraian",
          "Efektivitas",
        ]}
        hiddenColumns={{
          columns: [0, 1],
          indicators: false,
        }}
        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Analisis ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Level Kemungkinan", colspan: 1 },
            { label: "Level Dampak", colspan: 1 },
            { label: "Level Risiko", colspan: 1 },
            {
              label: "Pengendalian yang Pernah Dilakukan",
              colspan: 2,
            },
          ],
        ]}
        rowHeaders={true}
        height="auto"
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        contextMenu={true}
        autoWrapRow={true}
        autoWrapCol={true}
        fillHandle={false}
        enterMoves={{ col: 0, row: 1 }}
        tabMoves={{ col: 1, row: 0 }}
      />
    </Stack>
  );
}
