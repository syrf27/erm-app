"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import { Title, Button, Group, Loader, Center, Stack, Text, Card, TextInput } from "@mantine/core";
import { useYear } from "@/lib/year-context";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllModules } from "handsontable/registry";
import {
  applyProgressiveCascade,
  handleProgressiveBeforeChange,
  getSafeRowData,
  isColumnUnlockedForRow,
  isProgressiveColumn,
  openUnlockedDropdownOnMouseDown,
  preventLockedCellMouseDown,
  PROGRESSIVE_LOCKED_CELL_CLASS,
  progressiveLockedCellStyles,
} from "@/lib/handsontable-progressive-lock";

if (typeof window !== "undefined") {
  registerAllModules();
}

const ANALISIS_INPUT_COLUMNS = [3, 4, 7, 8];
const ANALISIS_RESET_COLUMNS: Record<number, number[]> = {
  3: [4, 5, 6, 7, 8],
  4: [5, 6, 7, 8],
  7: [8],
  8: [],
};

export default function AnalisisRisikoPage() {
  const hotRef = useRef<HotTableRef>(null);
  const [localData, setLocalData] = useState<any[][]>([]);
  const [saving, setSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const { tahunDari, tahunSampai } = useYear();

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

   const identResult = useList({
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
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 1000 } });

  const levelKemungkinanList = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const levelDampakList = useList({ resource: "level-dampak", pagination: { mode: "off" } });
  const levelRisikoList = useList({ resource: "level-risiko", pagination: { mode: "off" } });
  const matriksList = useList({ resource: "matriks-analisis-risiko", pagination: { mode: "off" } });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (levelKemungkinanList.query?.isPending ?? false) ||
    (levelDampakList.query?.isPending ?? false) ||
    (levelRisikoList.query?.isPending ?? false) ||
    (matriksList.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const refetchQuery = analisisResult.query?.refetch;

  const currentYear = new Date().getFullYear();
  const filteredIdentifikasiData = useMemo(() => {
    return identifikasiData;
  }, [identifikasiData]);

  const kemungkinanData = useMemo(() => levelKemungkinanList.result?.data ?? [], [levelKemungkinanList.result?.data]);
  const dampakData = useMemo(() => levelDampakList.result?.data ?? [], [levelDampakList.result?.data]);
  const risikoData = useMemo(() => levelRisikoList.result?.data ?? [], [levelRisikoList.result?.data]);
  const matriksData = useMemo(() => matriksList.result?.data ?? [], [matriksList.result?.data]);

  const kemungkinanDataRef = useRef(kemungkinanData);
  const dampakDataRef = useRef(dampakData);
  const matriksDataRef = useRef(matriksData);

  useEffect(() => {
    kemungkinanDataRef.current = kemungkinanData;
    dampakDataRef.current = dampakData;
    matriksDataRef.current = matriksData;
  }, [kemungkinanData, dampakData, matriksData]);

  const kemungkinanNamaList = useMemo(() => kemungkinanData.map((o: any) => o.nama), [kemungkinanData]);
  const dampakNamaList = useMemo(() => dampakData.map((o: any) => o.nama), [dampakData]);
  const risikoNamaList = useMemo(() => risikoData.map((o: any) => o.nama), [risikoData]);

  useEffect(() => {
    if (loading) return;
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    console.log("useEffect load mapping - matriksData length:", matriksData.length);
    if (matriksData.length > 0) {
      console.log("matriksData first element:", matriksData[0]);
    }
    const mapped = filteredIdentifikasiData.map((r: Record<string, any>) => {
      const a = analisisById.get(r.id);
      const lk = kemungkinanData.find((o: any) => o.id === a?.levelKemungkinanId);
      const ld = dampakData.find((o: any) => o.id === a?.levelDampakId);
      const besaran = lk?.skala != null && ld?.skala != null ? lk.skala * ld.skala : "";
      const lrNama = besaran !== "" ? getLevelRisikoFromBesaran(besaran) : "";

      return [
        r.id,
        a?.id ?? null,
        r.risiko,
        lk?.nama ?? "",
        ld?.nama ?? "",
        lrNama,
        besaran,
        a?.pengendalianUraian ?? "",
        a?.pengendalianEfektivitas ?? "",
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, null, "", "", "", "", "", "", ""]);
    }
    setLocalData(padded);
  }, [loading, filteredIdentifikasiData, analisisData, kemungkinanData, dampakData, risikoData, matriksData]);

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
      const canUseColumn = (col: number) =>
        isColumnUnlockedForRow(row, ANALISIS_INPUT_COLUMNS, col);

      const levelKemungkinanId = findId(kemungkinanData, (row[3] as string) ?? "");
      const levelDampakId = canUseColumn(4)
        ? findId(dampakData, (row[4] as string) ?? "")
        : NaN;
      const levelRisikoId = canUseColumn(4)
        ? findId(risikoData, (row[5] as string) ?? "")
        : NaN;

      const payload: Record<string, any> = {};
      if (!isNaN(levelKemungkinanId)) payload.levelKemungkinanId = levelKemungkinanId;
      if (!isNaN(levelDampakId)) payload.levelDampakId = levelDampakId;
      if (!isNaN(levelRisikoId)) payload.levelRisikoId = levelRisikoId;
      payload.pengendalianUraian = canUseColumn(7) ? (row[7] as string) || null : null;
      payload.pengendalianEfektivitas = canUseColumn(8) ? (row[8] as string) || null : null;

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
      readOnly: true,
    },
    { title: "Besaran Risiko", data: 6, type: "text", width: 130, readOnly: true },
    { title: "Uraian", data: 7, type: "text", width: 250 },
    {
      title: "Keefektifan",
      data: 8,
      type: "dropdown",
      source: ["efektif", "kurang efektif", "tidak efektif"],
      width: 160,
      strict: false,
    },
  ];

  const getCellMeta = useCallback((row: number, col: number) => {
    const rowData = getSafeRowData(hotRef.current?.hotInstance, localData, row);
    const identId = rowData[0];
    const isEmptySourceRow = identId == null;
    const isLocked =
      !isEmptySourceRow &&
      isProgressiveColumn(ANALISIS_INPUT_COLUMNS, col) &&
      !isColumnUnlockedForRow(rowData, ANALISIS_INPUT_COLUMNS, col);

    return {
      readOnly: isEmptySourceRow || col === 0 || col === 1 || col === 2 || col === 5 || col === 6 || isLocked,
      className: isLocked ? PROGRESSIVE_LOCKED_CELL_CLASS : undefined,
    };
  }, [localData]);

  const handleBeforeChange = useCallback(
    (changes: (Handsontable.CellChange | null)[] | null, source?: Handsontable.ChangeSource) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;
      handleProgressiveBeforeChange(hot, changes, ANALISIS_INPUT_COLUMNS, source);
    },
    []
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
        <Title order={3}>Analisis Risiko</Title>
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
        Isi level risiko untuk setiap risiko yang teridentifikasi. Seret kolom untuk memindahkan, tarik sudut sel untuk autofill, gunakan Ctrl+C/V untuk salin-tempel.
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
          "Besaran Risiko",
          "Uraian",
          "Keefektifan",
        ]}
        hiddenColumns={{
          columns: [0, 1],
          indicators: false,
        }}
        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1, rowspan: 2 },
            { label: "Analisis ID", colspan: 1, rowspan: 2 },
            { label: "Risiko", colspan: 1, rowspan: 2 },
            { label: "Risiko Aktual", colspan: 4 },
            { label: "Pengendalian yang Pernah Dilakukan", colspan: 2 },
          ],
          [
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
            "Besaran Risiko",
            "Uraian",
            "Keefektifan",
          ],
        ]}
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
        cells={getCellMeta}
        beforeChange={handleBeforeChange}
        beforeOnCellMouseDown={(event, coords) => {
          preventLockedCellMouseDown(event, coords, hotRef.current?.hotInstance, ANALISIS_INPUT_COLUMNS);
          openUnlockedDropdownOnMouseDown(event, hotRef.current?.hotInstance, coords, ANALISIS_INPUT_COLUMNS);
        }}
        afterChange={(changes, source) => {
          if (!changes) return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          applyProgressiveCascade(hot, changes, ANALISIS_INPUT_COLUMNS, ANALISIS_RESET_COLUMNS, source);
          for (const [row, col] of changes) {
            if (col === 3 || col === 4) {
              recalcAnalisisRow(hot, row, kemungkinanDataRef.current, dampakDataRef.current, matriksDataRef.current);
            }
          }
          hot.render();
        }}
      />
      <style jsx global>{progressiveLockedCellStyles}</style>
    </Stack>
  );
}

function getLevelRisikoFromBesaran(besaran: number | string): string {
  const score = typeof besaran === "string" ? parseInt(besaran, 10) : besaran;
  if (isNaN(score) || score <= 0) return "";
  if (score >= 1 && score <= 5) return "Sangat Rendah";
  if (score >= 6 && score <= 10) return "Rendah";
  if (score >= 11 && score <= 14) return "Sedang";
  if (score >= 15 && score <= 19) return "Tinggi";
  return "Sangat Tinggi"; // 20 - 25
}

function recalcAnalisisRow(
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

  if (besaran !== "") {
    const lrNama = getLevelRisikoFromBesaran(besaran);
    hot.setDataAtCell(row, 5, lrNama, "recalc");
  }
}
