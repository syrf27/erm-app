"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import { Title, Button, Group, Loader, Center, Stack, Text, Card, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllModules } from "handsontable/registry";

if (typeof window !== "undefined") {
  registerAllModules();
}

const RESPON_OPTIONS = [
  "Mengurangi Risiko",
  "Mengalihkan Risiko",
  "Menghindari Risiko",
  "Menerima Risiko",
];

export default function EvaluasiRisikoPage() {
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
        (searchPlugin as any).query(query);
        hot.render();
      }
    }
  };

  const identResult = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 10000 } });
  const evaluasiResult = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 10000 } });
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });
  const kemungkinanResult = useList({ resource: "level-kemungkinan", pagination: { pageSize: 10000 } });
  const dampakResult = useList({ resource: "level-dampak", pagination: { pageSize: 10000 } });
  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 10000 } });
  const risikoResult = useList({ resource: "level-risiko", pagination: { pageSize: 10000 } });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (kemungkinanResult.query?.isPending ?? false) ||
    (dampakResult.query?.isPending ?? false) ||
    (matriksResult.query?.isPending ?? false) ||
    (risikoResult.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const evaluasiData = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const kemungkinanData = useMemo(() => kemungkinanResult.result?.data ?? [], [kemungkinanResult.result?.data]);
  const dampakData = useMemo(() => dampakResult.result?.data ?? [], [dampakResult.result?.data]);
  const matriksData = useMemo(() => matriksResult.result?.data ?? [], [matriksResult.result?.data]);
  const kemungkinanNamaList = useMemo(() => (kemungkinanData || []).map((o: any) => o.nama), [kemungkinanData]);
  const dampakNamaList = useMemo(() => (dampakData || []).map((o: any) => o.nama), [dampakData]);
  const risikoData = useMemo(() => risikoResult.result?.data ?? [], [risikoResult.result?.data]);
  const refetchQuery = evaluasiResult.query?.refetch;

  useEffect(() => {
    if (loading) return;
    const evaluasiById = new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e]));
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    const mapped = identifikasiData.map((r: Record<string, any>) => {
      const ev = evaluasiById.get(r.id);
      const an = analisisById.get(r.id);
      const prioritas = an?.levelRisiko?.nama ?? "";
      const resLK = kemungkinanData.find((o: any) => o.id === ev?.residualLevelKemungkinanId);
      const resLD = dampakData.find((o: any) => o.id === ev?.residualLevelDampakId);
      const resLR = ev?.residualLevelRisiko?.nama ?? "";
      const resBesaran = resLK?.skala != null && resLD?.skala != null ? resLK.skala * resLD.skala : "";
      return [
        r.id,
        ev?.id ?? null,
        r.risiko,
        resLK?.nama ?? "",
        resLD?.nama ?? "",
        resLR,
        resBesaran,
        ev?.responRisiko ?? "",
        prioritas,
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, null, "", "", "", "", "", "", ""]);
    }
    setLocalData(padded);
  }, [loading, identifikasiData, evaluasiData, analisisData]);

  const saveAll = useCallback(async () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const rows = hot.getData() as any[][];
    setSaving(true);

    const newRows: { index: number; identId: number; payload: any }[] = [];
    const updateRows: { index: number; id: number; payload: any }[] = [];

    const findId = (items: any[], nama: string) => {
      const found = items.find((o: any) => o.nama === nama);
      return found ? found.id : null;
    };

    rows.forEach((row, idx) => {
      const identId = parseInt(row[0] as string, 10);
      const evaluasiId = parseInt(row[1] as string, 10);
      if (isNaN(identId)) return;
      const respon = (row[7] as string) ?? "";
      const resLKId = findId(kemungkinanData, (row[3] as string) ?? "");
      const resLDId = findId(dampakData, (row[4] as string) ?? "");
      const resLRId = findId(risikoData, (row[5] as string) ?? "");
      if (!respon && resLKId == null && resLDId == null) return;

      const payload: Record<string, any> = {
        responRisiko: respon || null,
        residualLevelKemungkinanId: resLKId,
        residualLevelDampakId: resLDId,
        residualLevelRisikoId: resLRId,
      };

      if (isNaN(evaluasiId) || evaluasiId === 0) {
        newRows.push({ index: idx, identId, payload: { ...payload, identifikasiRisikoId: identId } });
      } else {
        updateRows.push({ index: idx, id: evaluasiId, payload });
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
            fetch("/api/evaluasi-risiko", {
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
            hot.setDataAtCell(index, 1, data.id, "saveAll");
          }
        });
      }
      if (updateRows.length > 0) {
        await Promise.all(
          updateRows.map(({ id, payload }) =>
            fetch(`/api/evaluasi-risiko/${id}`, {
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
    { title: "Evaluasi ID", data: 1, type: "numeric", width: 1 },
    { title: "Risiko", data: 2, type: "text", width: 300, readOnly: true },
    {
      title: "Level Kemungkinan",
      data: 3,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 4,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    { title: "Level Risiko", data: 5, type: "text", width: 150, readOnly: true },
    { title: "Besaran Risiko", data: 6, type: "text", width: 130, readOnly: true },
    {
      title: "Respon Risiko",
      data: 7,
      type: "dropdown",
      source: RESPON_OPTIONS,
      width: 250,
      strict: true,
    },
    { title: "Prioritas Risiko", data: 8, type: "text", width: 200, readOnly: true },
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
        <Title order={3}>Evaluasi Risiko</Title>
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
        Tetapkan Respon Risiko untuk setiap risiko. Seret kolom untuk memindahkan, tarik sudut sel untuk autofill, gunakan Ctrl+C/V untuk salin-tempel.
      </Text>
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
          "Besaran Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
        ]}
        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Evaluasi ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Risiko Residual", colspan: 4 },
            { label: "Respon Risiko", colspan: 1 },
            { label: "Prioritas Risiko", colspan: 1 },
          ],
          [
            "Ident ID",
            "Evaluasi ID",
            "",
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
            "Besaran Risiko",
            "",
            "",
          ],
        ]}
        hiddenColumns={{
          columns: [0, 1],
          indicators: false,
        }}
        rowHeaders={true}
        height="auto"
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        contextMenu={true}
        copyPaste={true}
        fillHandle={true}
        autoWrapRow={true}
        autoWrapCol={true}
        enterMoves={{ col: 0, row: 1 }}
        tabMoves={{ col: 1, row: 0 }}
        manualColumnResize={true}
        manualColumnMove={true}
        search={true}
        cells={function (row, col) {
          const cellProperties: any = {};
          const hot = this.instance;
          const identId = hot.getDataAtCell(row, 0);
          if (identId == null) {
            cellProperties.readOnly = true;
          }
          return cellProperties;
        }}
        afterChange={(changes) => {
          if (!changes) return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          for (const [row, col] of changes) {
            if (col === 3 || col === 4) {
              recalcResidualRow(hot, row, kemungkinanData, dampakData, matriksData);
            }
          }
        }}
      />
    </Stack>
  );
}

function recalcResidualRow(
  hot: Handsontable,
  row: number,
  kemungkinanData: any[],
  dampakData: any[],
  matriksData: any[]
) {
  const lkNama = hot.getDataAtCell(row, 3) as string;
  const ldNama = hot.getDataAtCell(row, 4) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  if (!lk || !ld) return;
  const besaran = lk.skala != null && ld.skala != null ? lk.skala * ld.skala : "";
  hot.setDataAtCell(row, 6, besaran, "recalc");
  const match = matriksData.find(
    (m: any) => m.levelKemungkinanId === lk.id && m.levelDampakId === ld.id
  );
  if (!match) return;
  const lrNama = match.levelRisiko?.nama;
  if (lrNama) {
    hot.setDataAtCell(row, 5, lrNama, "recalc");
  }
}
