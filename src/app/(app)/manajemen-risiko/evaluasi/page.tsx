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

const EVALUASI_INPUT_COLUMNS = [3, 4, 7, 8];
const EVALUASI_RESET_COLUMNS: Record<number, number[]> = {
  3: [4, 5, 6, 7, 8],
  4: [5, 6, 7, 8],
  7: [8],
  8: [],
};

const RESPON_OPTIONS = [
  "Mengurangi Risiko",
  "Mengalihkan Risiko",
  "Menghindari Risiko",
  "Menerima Risiko",
];

const isReducingResponse = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "mengurangi risiko" || normalized === "mengurangi";
};

const toPositiveInteger = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

export default function EvaluasiRisikoPage() {
  const hotRef = useRef<HotTableRef>(null);
  const autoPriorityByIdentIdRef = useRef<Map<number, number>>(new Map());
  const savedPriorityByIdentIdRef = useRef<Map<number, number | null>>(new Map());
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
  const evaluasiResult = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 1000 } });
  const kemungkinanResult = useList({ resource: "level-kemungkinan", pagination: { pageSize: 10000 } });
  const dampakResult = useList({ resource: "level-dampak", pagination: { pageSize: 10000 } });
  const matriksResult = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 10000 } });
  const risikoResult = useList({ resource: "level-risiko", pagination: { pageSize: 10000 } });
  const seleraResult = useList({ resource: "selera-risiko", pagination: { pageSize: 10000 } });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (kemungkinanResult.query?.isPending ?? false) ||
    (dampakResult.query?.isPending ?? false) ||
    (matriksResult.query?.isPending ?? false) ||
    (risikoResult.query?.isPending ?? false) ||
    (seleraResult.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const currentYear = new Date().getFullYear();
  const filteredIdentifikasiData = useMemo(() => {
    return identifikasiData;
  }, [identifikasiData]);
  const evaluasiData = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const kemungkinanData = useMemo(() => kemungkinanResult.result?.data ?? [], [kemungkinanResult.result?.data]);
  const dampakData = useMemo(() => dampakResult.result?.data ?? [], [dampakResult.result?.data]);
  const matriksData = useMemo(() => matriksResult.result?.data ?? [], [matriksResult.result?.data]);
  const kemungkinanNamaList = useMemo(() => (kemungkinanData || []).map((o: any) => o.nama), [kemungkinanData]);
  const dampakNamaList = useMemo(() => (dampakData || []).map((o: any) => o.nama), [dampakData]);
  const risikoData = useMemo(() => risikoResult.result?.data ?? [], [risikoResult.result?.data]);
  const seleraData = useMemo(() => seleraResult.result?.data ?? [], [seleraResult.result?.data]);
  const seleraRisikoNilai = useMemo(() => {
    const sorted = [...seleraData].sort((a: any, b: any) => Number(b.id) - Number(a.id));
    const latestValue = Number(sorted[0]?.nilai);
    return Number.isFinite(latestValue) ? latestValue : null;
  }, [seleraData]);
  const refetchQuery = evaluasiResult.query?.refetch;

  const recomputeVisiblePriorities = useCallback(
    (hot: Handsontable.Core) => {
      const rows = hot.getData() as any[][];
      const candidates = rows
        .map((row, index) => {
          const identId = Number(row[0]);
          const residualBesaran = Number(row[6]);
          const response = row[7];
          const needsPriority =
            Number.isFinite(identId) &&
            Number.isFinite(residualBesaran) &&
            seleraRisikoNilai !== null &&
            residualBesaran > seleraRisikoNilai &&
            isReducingResponse(response);

          return { index, identId, residualBesaran, needsPriority };
        })
        .filter((item) => item.needsPriority)
        .sort((a, b) => {
          if (b.residualBesaran !== a.residualBesaran) return b.residualBesaran - a.residualBesaran;
          return b.identId - a.identId;
        });

      const autoPriorityByIdentId = new Map<number, number>();
      candidates.forEach((item, index) => {
        autoPriorityByIdentId.set(item.identId, index + 1);
      });
      autoPriorityByIdentIdRef.current = autoPriorityByIdentId;

      rows.forEach((row, index) => {
        const identId = Number(row[0]);
        if (!Number.isFinite(identId)) return;

        const autoPriority = autoPriorityByIdentId.get(identId);
        const currentPriority = toPositiveInteger(row[8]);

        if (!autoPriority) {
          if (row[8] !== "") hot.setDataAtCell(index, 8, "", "priority-auto");
          return;
        }

        if (currentPriority === null) {
          hot.setDataAtCell(index, 8, autoPriority, "priority-auto");
        }
      });
    },
    [seleraRisikoNilai]
  );

  useEffect(() => {
    if (loading) return;
    const evaluasiById = new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e]));
    const withSort = filteredIdentifikasiData.map((r: Record<string, any>) => {
      const ev = evaluasiById.get(r.id);
      const areaDampakId = r.areaDampak?.id ?? 0;
      const kategoriRisikoId = r.kategoriRisiko?.id ?? 0;
      const resLK = kemungkinanData.find((o: any) => o.id === ev?.residualLevelKemungkinanId);
      const resLD = dampakData.find((o: any) => o.id === ev?.residualLevelDampakId);
      const resLR = ev?.residualLevelRisiko?.nama ?? "";
      const resBesaran = resLK?.skala != null && resLD?.skala != null ? resLK.skala * resLD.skala : "";
      const residualBesaran = typeof resBesaran === "number" ? resBesaran : 0;
      const responseLabel =
        ev?.responRisiko === "mengurangi" ? "Mengurangi Risiko" :
        ev?.responRisiko === "mentransfer" ? "Mengalihkan Risiko" :
        ev?.responRisiko === "menghindari" ? "Menghindari Risiko" :
        ev?.responRisiko === "menerima" ? "Menerima Risiko" :
        (ev?.responRisiko ?? "");
      const needsPriority =
        seleraRisikoNilai !== null &&
        residualBesaran > seleraRisikoNilai &&
        isReducingResponse(responseLabel);
      return {
        id: r.id,
        row: [
          r.id,
          ev?.id ?? null,
          r.risiko,
          resLK?.nama ?? "",
          resLD?.nama ?? "",
          resLR,
          resBesaran,
          responseLabel,
          "",
        ],
        residualBesaran,
        savedPriority: toPositiveInteger(ev?.prioritasRisiko),
        needsPriority,
        areaDampakId,
        kategoriRisikoId,
      };
    });

    const autoPriorityByIdentId = new Map<number, number>();
    withSort
      .filter((item) => item.needsPriority)
      .sort((a, b) => {
        if (b.residualBesaran !== a.residualBesaran) return b.residualBesaran - a.residualBesaran;
        if (b.areaDampakId !== a.areaDampakId) return b.areaDampakId - a.areaDampakId;
        if (b.kategoriRisikoId !== a.kategoriRisikoId) return b.kategoriRisikoId - a.kategoriRisikoId;
        return b.id - a.id;
      })
      .forEach((item, index) => {
        autoPriorityByIdentId.set(item.id, index + 1);
      });
    autoPriorityByIdentIdRef.current = autoPriorityByIdentId;
    savedPriorityByIdentIdRef.current = new Map(
      withSort.map((item) => [item.id, item.savedPriority])
    );

    for (const item of withSort) {
      const autoPriority = autoPriorityByIdentId.get(item.id);
      item.row[8] = item.needsPriority ? item.savedPriority ?? autoPriority ?? "" : "";
    }

    withSort.sort((a, b) => {
      if (a.needsPriority !== b.needsPriority) return a.needsPriority ? -1 : 1;
      const aPriority = toPositiveInteger(a.row[8]) ?? Number.MAX_SAFE_INTEGER;
      const bPriority = toPositiveInteger(b.row[8]) ?? Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (b.residualBesaran !== a.residualBesaran) return b.residualBesaran - a.residualBesaran;
      return b.id - a.id;
    });

    const mapped = withSort.map(m => m.row);
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, null, "", "", "", "", "", "", ""]);
    }
    setLocalData(padded);
  }, [loading, filteredIdentifikasiData, evaluasiData, kemungkinanData, dampakData, seleraRisikoNilai]);

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
      const canUseColumn = (col: number) =>
        isColumnUnlockedForRow(row, EVALUASI_INPUT_COLUMNS, col);
      const respon = canUseColumn(7) ? (row[7] as string) ?? "" : "";
      const residualBesaran = Number(row[6]);
      const autoPriority = autoPriorityByIdentIdRef.current.get(identId);
      const savedPriority = savedPriorityByIdentIdRef.current.get(identId);
      const currentPriority = toPositiveInteger(row[8]);
      const needsPriority =
        seleraRisikoNilai !== null &&
        Number.isFinite(residualBesaran) &&
        residualBesaran > seleraRisikoNilai &&
        isReducingResponse(respon);
      const resLKId = findId(kemungkinanData, (row[3] as string) ?? "");
      const resLDId = canUseColumn(4)
        ? findId(dampakData, (row[4] as string) ?? "")
        : null;
      const resLRId = canUseColumn(4)
        ? findId(risikoData, (row[5] as string) ?? "")
        : null;
      if (!respon && resLKId == null && resLDId == null) return;

      const payload: Record<string, any> = {
        responRisiko: respon === "Mengurangi Risiko" ? "mengurangi" :
                      respon === "Mengalihkan Risiko" ? "mentransfer" :
                      respon === "Menghindari Risiko" ? "menghindari" :
                      respon === "Menerima Risiko" ? "menerima" :
                      (respon || null),
        residualLevelKemungkinanId: resLKId,
        residualLevelDampakId: resLDId,
        residualLevelRisikoId: resLRId,
      };
      if (needsPriority && currentPriority !== null && currentPriority !== autoPriority) {
        payload.prioritasRisiko = currentPriority;
      } else if (savedPriority !== undefined && savedPriority !== null) {
        payload.prioritasRisiko = null;
      }

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
  }, [refetchQuery, kemungkinanData, dampakData, risikoData, seleraRisikoNilai]);

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
    { title: "Prioritas Risiko", data: 8, type: "numeric", width: 200, allowInvalid: false },
  ];

  const getCellMeta = useCallback((row: number, col: number) => {
    const rowData = getSafeRowData(hotRef.current?.hotInstance, localData, row);
    const identId = rowData[0];
    const isEmptySourceRow = identId == null;
    const residualBesaran = Number(rowData[6]);
    const isPriorityColumn = col === 8;
    const isPriorityEditable =
      isPriorityColumn &&
      seleraRisikoNilai !== null &&
      Number.isFinite(residualBesaran) &&
      residualBesaran > seleraRisikoNilai &&
      isReducingResponse(rowData[7]);
    const isLocked =
      !isEmptySourceRow &&
      isProgressiveColumn(EVALUASI_INPUT_COLUMNS, col) &&
      !isColumnUnlockedForRow(rowData, EVALUASI_INPUT_COLUMNS, col);

    return {
      readOnly:
        isEmptySourceRow ||
        col === 0 ||
        col === 1 ||
        col === 2 ||
        col === 5 ||
        col === 6 ||
        (isPriorityColumn && !isPriorityEditable) ||
        isLocked,
      className: isLocked ? PROGRESSIVE_LOCKED_CELL_CLASS : undefined,
    };
  }, [localData, seleraRisikoNilai]);

  const handleBeforeChange = useCallback(
    (changes: (Handsontable.CellChange | null)[] | null, source?: Handsontable.ChangeSource) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;
      handleProgressiveBeforeChange(hot, changes, EVALUASI_INPUT_COLUMNS, source);
      if (!changes) return;

      for (const change of changes) {
        if (!change) continue;
        const [row, col] = change;
        if (typeof row !== "number" || col !== 8) continue;

        const rowData = hot.getDataAtRow(row) as unknown[];
        const residualBesaran = Number(rowData[6]);
        const canEditPriority =
          seleraRisikoNilai !== null &&
          Number.isFinite(residualBesaran) &&
          residualBesaran > seleraRisikoNilai &&
          isReducingResponse(rowData[7]);

        if (!canEditPriority) {
          change[3] = hot.getDataAtCell(row, 8);
        }
      }
    },
    [seleraRisikoNilai]
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
            { label: "Ident ID", colspan: 1, rowspan: 2 },
            { label: "Evaluasi ID", colspan: 1, rowspan: 2 },
            { label: "Risiko", colspan: 1, rowspan: 2 },
            { label: "Risiko Residual", colspan: 4 },
            { label: "Respon Risiko", colspan: 1, rowspan: 2 },
            { label: "Prioritas Risiko", colspan: 1, rowspan: 2 },
          ],
          [
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
            "Besaran Risiko",
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
        cells={getCellMeta}
        beforeChange={handleBeforeChange}
        beforeOnCellMouseDown={(event, coords) => {
          preventLockedCellMouseDown(event, coords, hotRef.current?.hotInstance, EVALUASI_INPUT_COLUMNS);
          openUnlockedDropdownOnMouseDown(event, hotRef.current?.hotInstance, coords, EVALUASI_INPUT_COLUMNS);
        }}
        afterChange={(changes, source) => {
          if (!changes) return;
          if (String(source) === "priority-auto") return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          applyProgressiveCascade(hot, changes, EVALUASI_INPUT_COLUMNS, EVALUASI_RESET_COLUMNS, source);
          for (const [row, col] of changes) {
            if (col === 3 || col === 4) {
              recalcResidualRow(hot, row, kemungkinanData, dampakData, matriksData);
            }
          }
          if (changes.some(([, col]) => col === 3 || col === 4 || col === 7)) {
            window.setTimeout(() => recomputeVisiblePriorities(hot), 0);
          }
          hot.render();
        }}
      />
      <style jsx global>{progressiveLockedCellStyles}</style>
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
