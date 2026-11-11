"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import { Button, Loader, Center } from "@mantine/core";
import { useYear } from "@/lib/year-context";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllModules } from "handsontable/registry";
import {
  applyHandsontableSearch,
  applyProgressiveCascade,
  countIncompleteRows,
  focusNextHandsontableSearchResult,
  goToNextIncompleteRow,
  handleProgressiveBeforeChange,
  getSafeRowData,
  hasPersistedRowId,
  isColumnUnlockedForRow,
  isProgressiveColumn,
  openUnlockedDropdownOnMouseDown,
  preventLockedCellMouseDown,
  PROGRESSIVE_LOCKED_CELL_CLASS,
  progressiveLockedCellStyles,
} from "@/lib/handsontable-progressive-lock";
import { SpreadsheetPage, useSpreadsheetTableHeight } from "@/components/spreadsheet-page";

if (typeof window !== "undefined") {
  registerAllModules();
}
const RENCANA_INPUT_COLUMNS = [5, 6, 7, 8, 9];
const RENCANA_RESET_COLUMNS: Record<number, number[]> = {
  5: [6, 7, 8, 9],
  6: [7, 8, 9],
  7: [8, 9],
  8: [9],
  9: [],
};
const shouldEnforceRencanaProgression = (rowData: unknown[]) =>
  !hasPersistedRowId(rowData, 1);

function getJenisPenangananLabel(value: unknown) {
  if (value === "pencegahan" || value === "Pencegahan" || value === "mengurangi") return "Pencegahan";
  if (value === "perbaikan" || value === "Perbaikan" || value) return "Perbaikan";
  return "";
}

export default function RencanaPenangananPage() {
  const hotRef = useRef<HotTableRef>(null);
  const initialRowsRef = useRef<any[][]>([]);
  const dirtyRowsRef = useRef<Set<number>>(new Set());
  const [localData, setLocalData] = useState<any[][]>([]);
  const [saving, setSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [dirtyCount, setDirtyCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const tableHeight = useSpreadsheetTableHeight();
  const { tahunDari, tahunSampai } = useYear();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateIncompleteCount = useCallback(() => {
    setIncompleteCount(
      countIncompleteRows(hotRef.current?.hotInstance, RENCANA_INPUT_COLUMNS)
    );
  }, []);

  // Hitung ulang jumlah baris belum lengkap setiap kali data tabel berubah.
  useEffect(() => {
    const timer = window.setTimeout(updateIncompleteCount, 0);
    return () => window.clearTimeout(timer);
  }, [localData, updateIncompleteCount]);

  const handleGoToNextIncomplete = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const next = goToNextIncompleteRow(hot, RENCANA_INPUT_COLUMNS);
    if (!next) {
      notifications.show({
        title: "Data Lengkap",
        message: "Tidak ada baris yang belum lengkap",
        color: "green",
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchVal(query);
    applyHandsontableSearch(hotRef.current?.hotInstance, query);
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
  const analisisResult = useList({
    resource: "analisis-risiko",
    pagination: { pageSize: 1000 },
  });
  const evaluasiResult = useList({
    resource: "evaluasi-risiko",
    pagination: { pageSize: 1000 },
  });
  const rencanaResult = useList({
    resource: "rencana-penanganan",
    pagination: { pageSize: 1000 },
  });
  const kemungkinanList = useList({
    resource: "level-kemungkinan",
    pagination: { mode: "off" },
  });
  const dampakList = useList({
    resource: "level-dampak",
    pagination: { mode: "off" },
  });
  const matriksList = useList({
    resource: "matriks-analisis-risiko",
    // Muat seluruh 25 kombinasi matriks, bukan hanya halaman awal.
    pagination: { pageSize: 1000 },
  });
  const seleraResult = useList({ resource: "selera-risiko", pagination: { mode: "off" } });
  const teamList = useList({
    resource: "teams",
    pagination: { mode: "off" },
  });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (rencanaResult.query?.isPending ?? false) ||
    (kemungkinanList.query?.isPending ?? false) ||
    (dampakList.query?.isPending ?? false) ||
    (matriksList.query?.isPending ?? false) ||
    (teamList.query?.isPending ?? false) ||
    (seleraResult.query?.isPending ?? false);

  const identifikasiData = useMemo(
    () => identResult.result?.data ?? [],
    [identResult.result?.data]
  );
  const teamData = useMemo(
    () => teamList.result?.data ?? [],
    [teamList.result?.data]
  );
  const teamNamaList = useMemo(
    () => teamData.map((t: any) => t.nama),
    [teamData]
  );

  const currentYear = new Date().getFullYear();
  const filteredIdentifikasiData = useMemo(() => {
    return identifikasiData;
  }, [identifikasiData]);

  const analisisData = useMemo(
    () => analisisResult.result?.data ?? [],
    [analisisResult.result?.data]
  );
  const evaluasiData = useMemo(
    () => evaluasiResult.result?.data ?? [],
    [evaluasiResult.result?.data]
  );
  const rencanaData = useMemo(
    () => rencanaResult.result?.data ?? [],
    [rencanaResult.result?.data]
  );
  const refetchQuery = rencanaResult.query?.refetch;

  const kemungkinanData = useMemo(
    () => kemungkinanList.result?.data ?? [],
    [kemungkinanList.result?.data]
  );
  const dampakData = useMemo(
    () => dampakList.result?.data ?? [],
    [dampakList.result?.data]
  );
  const matriksData = useMemo(
    () => matriksList.result?.data ?? [],
    [matriksList.result?.data]
  );
  const seleraRisikoNilai = useMemo(() => {
    const rows = seleraResult.result?.data ?? [];
    const latest = [...rows].sort((a: any, b: any) => Number(b.id) - Number(a.id))[0];
    const value = Number((latest as any)?.nilai);
    return Number.isFinite(value) ? value : null;
  }, [seleraResult.result?.data]);

  useEffect(() => {
    if (loading) return;
    const analisisById = new Map(
      analisisData.map((a: any) => [Number(a.identifikasiRisikoId), a])
    );
    const evaluasiById = new Map(
      evaluasiData.map((e: any) => [Number(e.identifikasiRisikoId), e])
    );
    const rencanaById = new Map(
      rencanaData.map((r: any) => [Number(r.identifikasiRisikoId), r])
    );

    const kemungkinanById = new Map(kemungkinanData.map((k: any) => [Number(k.id), k]));
    const dampakById = new Map(dampakData.map((d: any) => [Number(d.id), d]));

    const filtered = filteredIdentifikasiData.filter((r: Record<string, any>) => {
      const riskId = Number(r.id);
      const ev = evaluasiById.get(riskId);
      const rp = rencanaById.get(riskId);
      const effectiveResidualSource = ev?.residualLevelKemungkinanId && ev?.residualLevelDampakId
        ? ev
        : rp;
      const effectiveResidualLk = kemungkinanById.get(Number(effectiveResidualSource?.residualLevelKemungkinanId));
      const effectiveResidualLd = dampakById.get(Number(effectiveResidualSource?.residualLevelDampakId));
      const residual = Number(matriksData.find(
        (item: any) => Number(item.levelKemungkinanId) === Number(effectiveResidualLk?.id) && Number(item.levelDampakId) === Number(effectiveResidualLd?.id)
      )?.besaran ?? 0);
      // RTP yang sudah tercatat pada register resmi tetap harus ditampilkan.
      // Filter otomatis hanya menentukan kandidat baru yang belum memiliki RTP.
      if (rencanaById.has(Number(r.id))) return true;
      return (
        (ev?.responRisiko === "mengurangi" || ev?.responRisiko === "Mengurangi Risiko") &&
        seleraRisikoNilai !== null &&
        residual > seleraRisikoNilai
      );
    });

    const mapped = filtered.map((r: Record<string, any>) => {
      const riskId = Number(r.id);
      const ev = evaluasiById.get(riskId);
      const rp = rencanaById.get(riskId);
      const residualSource = ev?.residualLevelKemungkinanId && ev?.residualLevelDampakId
        ? ev
        : rp;
      const residualLK = residualSource?.residualLevelKemungkinanId
        ? kemungkinanById.get(Number(residualSource.residualLevelKemungkinanId))
        : undefined;
      const residualLD = residualSource?.residualLevelDampakId
        ? dampakById.get(Number(residualSource.residualLevelDampakId))
        : undefined;

      return [
        r.id,
        rp?.id ?? null,
        ev?.prioritasRisiko ?? "",
        r.risiko,
        matriksData.find(
          (item: any) => Number(item.levelKemungkinanId) === Number(residualLK?.id) && Number(item.levelDampakId) === Number(residualLD?.id)
        )?.besaran ?? "",
        rp?.rencanaTidakPenanganan ?? "",
        getJenisPenangananLabel(rp?.jenisPenanganan),
        rp?.targetOutput ?? "",
        rp?.targetWaktu ?? "",
        rp?.penanggungJawab ?? "",
      ];
    });
    const actualRiskRank = [...mapped]
      .sort((a, b) => Number(b[4] || 0) - Number(a[4] || 0))
      .reduce((ranks, row, index) => ranks.set(Number(row[0]), index + 1), new Map<number, number>());
    mapped.forEach((row) => {
      if (!Number.isFinite(Number(row[2])) || Number(row[2]) <= 0) {
        row[2] = actualRiskRank.get(Number(row[0])) ?? "";
      }
    });
    mapped.sort((a, b) => {
      const aPriority = Number(a[2]);
      const bPriority = Number(b[2]);
      const aHasPriority = Number.isFinite(aPriority) && aPriority > 0;
      const bHasPriority = Number.isFinite(bPriority) && bPriority > 0;
      if (aHasPriority !== bHasPriority) return aHasPriority ? -1 : 1;
      if (aHasPriority && aPriority !== bPriority) return aPriority - bPriority;
      return Number(a[0]) - Number(b[0]);
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([
        null,
        null,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
    initialRowsRef.current = padded.map((row) => [...row]);
    setLocalData(padded);
  }, [
    loading,
    filteredIdentifikasiData,
    analisisData,
    evaluasiData,
    rencanaData,
    kemungkinanData,
    dampakData,
    matriksData,
    seleraRisikoNilai,
  ]);

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
      const rencanaId = parseInt(row[1] as string, 10);
      if (isNaN(identId)) return;
      const initialRow = initialRowsRef.current[idx];
      if (Number.isInteger(rencanaId) && rencanaId > 0 && !dirtyRowsRef.current.has(idx)) return;
      if (Number.isInteger(rencanaId) && rencanaId > 0 && initialRow && JSON.stringify(row) === JSON.stringify(initialRow)) return;
      const isExistingRow = Number.isInteger(rencanaId) && rencanaId > 0;
      const canUseColumn = (col: number) =>
        isExistingRow || isColumnUnlockedForRow(row, RENCANA_INPUT_COLUMNS, col);

      const rtp = (row[5] as string) || "";
      const jenis = canUseColumn(6) ? (row[6] as string) || "" : "";
      const out = canUseColumn(7) ? (row[7] as string) || "" : "";
      const waktu = canUseColumn(8) ? (row[8] as string) || "" : "";
      const pic = canUseColumn(9) ? (row[9] as string) || "" : "";

      // Skip new rows that have no inputs entered
      if ((isNaN(rencanaId) || rencanaId === 0) &&
          !rtp && !jenis && !out && !waktu && !pic) {
        return;
      }

      const payload: Record<string, any> = {};
      const jenisPen = jenis;
      payload.rencanaTidakPenanganan = rtp || null;
      payload.jenisPenanganan = jenisPen === "Pencegahan" ? "pencegahan" :
                                jenisPen === "Perbaikan" ? "perbaikan" :
                                (jenisPen || null);
      payload.targetOutput = out || null;
      payload.targetWaktu = waktu || null;
      payload.penanggungJawab = pic || null;

      if (isNaN(rencanaId) || rencanaId === 0) {
        newRows.push({
          index: idx,
          identId,
          payload: { ...payload, identifikasiRisikoId: identId },
        });
      } else {
        updateRows.push({ index: idx, id: rencanaId, payload });
      }
    });

    if (newRows.length === 0 && updateRows.length === 0) {
      notifications.show({
        title: "Tidak Ada Data",
        message: "Tidak ada perubahan yang perlu disimpan",
        color: "orange",
      });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/rencana-penanganan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creates: newRows.map(({ payload }) => ({ data: payload })),
          updates: updateRows.map(({ id, payload }) => ({ id, data: payload })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Gagal menyimpan perubahan");
      }
      const result = await res.json();
      result.created?.forEach((item: any, index: number) => {
        const row = newRows[index]?.index;
        if (item?.id && row !== undefined) {
          hot.setDataAtCell(row, 1, item.id, "saveAll");
          initialRowsRef.current[row] = [rows[row][0], item.id, ...rows[row].slice(2)];
        }
      });
      updateRows.forEach(({ index }) => {
        initialRowsRef.current[index] = [...rows[index]];
      });
      dirtyRowsRef.current.clear();
      setDirtyCount(0);
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
  }, [refetchQuery, kemungkinanData, dampakData]);

  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Rencana ID", data: 1, type: "numeric", width: 1 },
    { title: "Prioritas", data: 2, type: "text", width: 130, readOnly: true },
    { title: "Risiko", data: 3, type: "text", width: 220, readOnly: true },
    {
      title: "Besaran Risiko Residual Saat Ini",
      data: 4,
      type: "text",
      width: 120,
      readOnly: true,
    },
    { title: "Rencana Tindak Penanganan", data: 5, type: "text", width: 240 },
    {
      title: "Jenis Penanganan",
      data: 6,
      type: "dropdown",
      source: [
        "Pencegahan",
        "Perbaikan",
      ],
      width: 180,
      strict: true,
    },
    { title: "Target Output", data: 7, type: "text", width: 180 },
    {
      title: "Target Waktu",
      data: 8,
      type: "date",
      dateFormat: "DD-MM-YYYY",
      correctFormat: true,
      width: 150,
    },
    {
      title: "Penanggung Jawab",
      data: 9,
      type: "dropdown",
      source: teamNamaList,
      width: 180,
      strict: true,
    },
  ];

  const getCellMeta = useCallback((row: number, col: number) => {
    const rowData = getSafeRowData(hotRef.current?.hotInstance, localData, row);
    const identId = rowData[0];
    const isEmptySourceRow = identId == null;
    const isLocked =
      !isEmptySourceRow &&
      shouldEnforceRencanaProgression(rowData) &&
      isProgressiveColumn(RENCANA_INPUT_COLUMNS, col) &&
      !isColumnUnlockedForRow(rowData, RENCANA_INPUT_COLUMNS, col);

    return {
      readOnly:
        isEmptySourceRow ||
        col === 0 ||
        col === 1 ||
        col === 2 ||
        col === 3 ||
        col === 4 ||
        isLocked,
      className: isLocked ? PROGRESSIVE_LOCKED_CELL_CLASS : undefined,
    };
  }, [localData]);

  const handleBeforeChange = useCallback(
    (changes: (Handsontable.CellChange | null)[] | null, source?: Handsontable.ChangeSource) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;
      handleProgressiveBeforeChange(
        hot,
        changes,
        RENCANA_INPUT_COLUMNS,
        source,
        shouldEnforceRencanaProgression
      );
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
    <SpreadsheetPage
      title="Rencana Penanganan"
      description="Menampilkan risiko dengan respons Mengurangi Risiko dan residual di atas selera risiko. Risiko lain cukup dipantau."
      dirtyCount={dirtyCount}
      saving={saving}
      onSave={saveAll}
      searchValue={searchVal}
      onSearchChange={handleSearchChange}
      onSearchKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        focusNextHandsontableSearchResult(hotRef.current?.hotInstance, searchVal);
      }}
      actions={
        <Button
          variant="light"
          color="orange"
          disabled={incompleteCount === 0}
          onClick={handleGoToNextIncomplete}
        >
          Lanjutkan Data Belum Lengkap ({incompleteCount})
        </Button>
      }
    >
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        colHeaders={true}
        hiddenColumns={{
          columns: [0, 1],
          indicators: false,
        }}
        afterChange={(changes, source) => {
          if (!changes) return;
          if (!["loadData", "auto", "recalc", "saveAll", "progressive-reset"].includes(String(source))) {
            changes.forEach(([row]) => {
              if (typeof row === "number") dirtyRowsRef.current.add(row);
            });
            setDirtyCount(dirtyRowsRef.current.size);
          }
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          applyProgressiveCascade(
            hot,
            changes,
            RENCANA_INPUT_COLUMNS,
            RENCANA_RESET_COLUMNS,
            source,
            shouldEnforceRencanaProgression
          );
          hot.render();
          updateIncompleteCount();
        }}
        rowHeaders={true}
        height={tableHeight ?? 400}
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
          preventLockedCellMouseDown(
            event,
            coords,
            hotRef.current?.hotInstance,
            RENCANA_INPUT_COLUMNS,
            shouldEnforceRencanaProgression
          );
          openUnlockedDropdownOnMouseDown(
            event,
            hotRef.current?.hotInstance,
            coords,
            RENCANA_INPUT_COLUMNS,
            shouldEnforceRencanaProgression
          );
        }}
      />
      <style jsx global>{progressiveLockedCellStyles}</style>
    </SpreadsheetPage>
  );
}
