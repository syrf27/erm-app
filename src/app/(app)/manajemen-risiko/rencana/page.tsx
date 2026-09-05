"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import {
  Title,
  Button,
  Group,
  Loader,
  Center,
  Stack,
  Text,
  Card,
  TextInput,
} from "@mantine/core";
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

const RENCANA_INPUT_COLUMNS = [6, 7, 8, 9, 10, 11, 12];
const RENCANA_RESET_COLUMNS: Record<number, number[]> = {
  6: [5, 7, 8, 9, 10, 11, 12, 13, 14],
  7: [5, 8, 9, 10, 11, 12, 13, 14],
  8: [5, 9, 10, 11, 12, 13, 14],
  9: [5, 10, 11, 12, 13, 14],
  10: [5, 11, 12, 13, 14],
  11: [5, 12, 13, 14],
  12: [5, 13, 14],
};

function computeBesaran(kemungkinanSkala?: number, dampakSkala?: number) {
  if (kemungkinanSkala == null || dampakSkala == null) return "";
  return String(kemungkinanSkala * dampakSkala);
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

export default function RencanaPenangananPage() {
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
    pagination: { mode: "off" },
  });
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
    (teamList.query?.isPending ?? false) ||
    (matriksList.query?.isPending ?? false);

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

  const kemungkinanNamaList = useMemo(
    () => kemungkinanData.map((o: any) => o.nama),
    [kemungkinanData]
  );
  const dampakNamaList = useMemo(
    () => dampakData.map((o: any) => o.nama),
    [dampakData]
  );

  const kemungkinanDataRef = useRef(kemungkinanData);
  const dampakDataRef = useRef(dampakData);
  const matriksDataRef = useRef(matriksData);

  useEffect(() => {
    kemungkinanDataRef.current = kemungkinanData;
    dampakDataRef.current = dampakData;
    matriksDataRef.current = matriksData;
  }, [kemungkinanData, dampakData, matriksData]);

  useEffect(() => {
    if (loading) return;
    const analisisById = new Map(
      analisisData.map((a: any) => [a.identifikasiRisikoId, a])
    );
    const evaluasiById = new Map(
      evaluasiData.map((e: any) => [e.identifikasiRisikoId, e])
    );
    const rencanaById = new Map(
      rencanaData.map((r: any) => [r.identifikasiRisikoId, r])
    );

    const filtered = filteredIdentifikasiData.filter((r: Record<string, any>) => {
      const ev = evaluasiById.get(r.id);
      return ev?.responRisiko === "mengurangi" || ev?.responRisiko === "Mengurangi Risiko";
    });

    const kemungkinanById = new Map(kemungkinanData.map((k: any) => [k.id, k]));
    const dampakById = new Map(dampakData.map((d: any) => [d.id, d]));

    const mapped = filtered.map((r: Record<string, any>) => {
      const an = analisisById.get(r.id);
      const rp = rencanaById.get(r.id);

      const lk = an ? kemungkinanById.get(an.levelKemungkinanId) : undefined;
      const ld = an ? dampakById.get(an.levelDampakId) : undefined;

      const residualLK = rp?.residualLevelKemungkinanId
        ? kemungkinanById.get(rp.residualLevelKemungkinanId)
        : undefined;
      const residualLD = rp?.residualLevelDampakId
        ? dampakById.get(rp.residualLevelDampakId)
        : undefined;

      return [
        r.id,
        rp?.id ?? null,
        an?.levelRisiko?.nama ?? "",
        r.risiko,
        computeBesaran(lk?.skala, ld?.skala),
        computeBesaran(residualLK?.skala, residualLD?.skala),
        rp?.rencanaTidakPenanganan ?? "",
        rp?.jenisPenanganan === "mengurangi" ? "Mengurangi Risiko" :
        rp?.jenisPenanganan === "mentransfer" ? "Mengalihkan Risiko" :
        rp?.jenisPenanganan === "menghindari" ? "Menghindari Risiko" :
        rp?.jenisPenanganan === "menerima" ? "Menerima Risiko" :
        (rp?.jenisPenanganan ?? ""),
        rp?.targetOutput ?? "",
        rp?.targetWaktu ?? "",
        rp?.penanggungJawab ?? "",
        residualLK?.nama ?? "",
        residualLD?.nama ?? "",
        getLevelRisikoFromBesaran(computeBesaran(residualLK?.skala, residualLD?.skala)),
        computeBesaran(residualLK?.skala, residualLD?.skala),
      ];
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
        "",
        "",
        "",
        "",
        "",
      ]);
    }
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
      const canUseColumn = (col: number) =>
        isColumnUnlockedForRow(row, RENCANA_INPUT_COLUMNS, col);

      const residualLKId = canUseColumn(11)
        ? findId(kemungkinanData, (row[11] as string) ?? "")
        : NaN;
      const residualLDId = canUseColumn(12)
        ? findId(dampakData, (row[12] as string) ?? "")
        : NaN;

      const rtp = (row[6] as string) || "";
      const jenis = canUseColumn(7) ? (row[7] as string) || "" : "";
      const out = canUseColumn(8) ? (row[8] as string) || "" : "";
      const waktu = canUseColumn(9) ? (row[9] as string) || "" : "";
      const pic = canUseColumn(10) ? (row[10] as string) || "" : "";

      // Skip new rows that have no inputs entered
      if ((isNaN(rencanaId) || rencanaId === 0) &&
          !rtp && !jenis && !out && !waktu && !pic &&
          isNaN(residualLKId) && isNaN(residualLDId)) {
        return;
      }

      const payload: Record<string, any> = {};
      const jenisPen = jenis;
      payload.rencanaTidakPenanganan = rtp || null;
      payload.jenisPenanganan = jenisPen === "Mengurangi Risiko" ? "mengurangi" :
                                jenisPen === "Mengalihkan Risiko" ? "mentransfer" :
                                jenisPen === "Menghindari Risiko" ? "menghindari" :
                                jenisPen === "Menerima Risiko" ? "menerima" :
                                (jenisPen || null);
      payload.targetOutput = out || null;
      payload.targetWaktu = waktu || null;
      payload.penanggungJawab = pic || null;
      if (!isNaN(residualLKId))
        payload.residualLevelKemungkinanId = residualLKId;
      else payload.residualLevelKemungkinanId = null;
      if (!isNaN(residualLDId)) payload.residualLevelDampakId = residualLDId;
      else payload.residualLevelDampakId = null;

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
      if (newRows.length > 0) {
        const results = await Promise.all(
          newRows.map(({ index, identId, payload }) =>
            fetch("/api/rencana-penanganan", {
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
            hot.setDataAtCell(index, 1, data.id, "saveAll");
          }
        });
      }
      if (updateRows.length > 0) {
        await Promise.all(
          updateRows.map(({ id, payload }) =>
            fetch(`/api/rencana-penanganan/${id}`, {
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
  }, [refetchQuery, kemungkinanData, dampakData]);

  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Rencana ID", data: 1, type: "numeric", width: 1 },
    { title: "Prioritas", data: 2, type: "text", width: 130, readOnly: true },
    { title: "Risiko", data: 3, type: "text", width: 220, readOnly: true },
    {
      title: "Besaran Risiko Aktual",
      data: 4,
      type: "text",
      width: 120,
      readOnly: true,
    },
    {
      title: "Besaran Risiko Residual",
      data: 5,
      type: "text",
      width: 120,
      readOnly: true,
    },
    { title: "Rencana Tindak Penanganan", data: 6, type: "text", width: 240 },
    {
      title: "Jenis Penanganan",
      data: 7,
      type: "dropdown",
      source: [
        "Mengurangi Risiko",
        "Mengalihkan Risiko",
        "Menghindari Risiko",
        "Menerima Risiko",
      ],
      width: 180,
      strict: true,
    },
    { title: "Target Output", data: 8, type: "text", width: 180 },
    {
      title: "Target Waktu",
      data: 9,
      type: "date",
      dateFormat: "DD-MM-YYYY",
      correctFormat: true,
      width: 150,
    },
    {
      title: "Penanggung Jawab",
      data: 10,
      type: "dropdown",
      source: teamNamaList,
      width: 180,
      strict: true,
    },
    {
      title: "Level Kemungkinan",
      data: 11,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 12,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    {
      title: "Level Risiko",
      data: 13,
      type: "text",
      width: 140,
      readOnly: true,
    },
    {
      title: "Besaran Risiko",
      data: 14,
      type: "text",
      width: 130,
      readOnly: true,
    },
  ];

  const getCellMeta = useCallback((row: number, col: number) => {
    const rowData = getSafeRowData(hotRef.current?.hotInstance, localData, row);
    const identId = rowData[0];
    const isEmptySourceRow = identId == null;
    const isLocked =
      !isEmptySourceRow &&
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
        col === 5 ||
        col === 13 ||
        col === 14 ||
        isLocked,
      className: isLocked ? PROGRESSIVE_LOCKED_CELL_CLASS : undefined,
    };
  }, [localData]);

  const handleBeforeChange = useCallback(
    (changes: (Handsontable.CellChange | null)[] | null, source?: Handsontable.ChangeSource) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;
      handleProgressiveBeforeChange(hot, changes, RENCANA_INPUT_COLUMNS, source);
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
        <Title order={3}>Rencana Penanganan</Title>
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
        Hanya menampilkan risiko dengan Respon Risiko &quot;Mengurangi
        Risiko&quot;. Seret kolom untuk memindahkan, tarik sudut sel untuk
        autofill, gunakan Ctrl+C/V untuk salin-tempel.
      </Text>
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        colHeaders={[
          "Ident ID",
          "Rencana ID",
          "Prioritas",
          "Risiko",
          "Besaran Risiko Aktual",
          "Besaran Risiko Residual",
          "Rencana Tindak Penanganan",
          "Jenis Penanganan",
          "Target Output",
          "Target Waktu",
          "Penanggung Jawab",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
          "Besaran Risiko",
        ]}
        hiddenColumns={{
          columns: [0, 1],
          indicators: false,
        }}
        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1, rowspan: 2 },
            { label: "Rencana ID", colspan: 1, rowspan: 2 },
            { label: "Prioritas", colspan: 1, rowspan: 2 },
            { label: "Risiko", colspan: 1, rowspan: 2 },
            { label: "Besaran Risiko", colspan: 2 },
            { label: "Rencana Penanganan Risiko", colspan: 5 },
            { label: "Risiko Residual Harapan", colspan: 4 },
          ],
          [
            "Aktual",
            "Residual Harapan",
            "Rencana Tindak Penanganan",
            "Jenis Penanganan",
            "Target Output",
            "Target Waktu",
            "Penanggung Jawab",
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
            "Besaran Risiko",
          ],
        ]}
        afterChange={(changes, source) => {
          if (!changes) return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          applyProgressiveCascade(hot, changes, RENCANA_INPUT_COLUMNS, RENCANA_RESET_COLUMNS, source);
          for (const [row, col] of changes) {
            if (col === 11 || col === 12) {
              recalcRow(hot, row, kemungkinanDataRef.current, dampakDataRef.current, matriksDataRef.current);
            }
          }
          hot.render();
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
          preventLockedCellMouseDown(event, coords, hotRef.current?.hotInstance, RENCANA_INPUT_COLUMNS);
          openUnlockedDropdownOnMouseDown(event, hotRef.current?.hotInstance, coords, RENCANA_INPUT_COLUMNS);
        }}
      />
      <style jsx global>{progressiveLockedCellStyles}</style>
    </Stack>
  );
}

function recalcRow(
  hot: Handsontable,
  row: number,
  kemungkinanData: any[],
  dampakData: any[],
  matriksData: any[]
) {
  const lkNama = hot.getDataAtCell(row, 11) as string;
  const ldNama = hot.getDataAtCell(row, 12) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  const besaran = computeBesaran(lk?.skala, ld?.skala);
  const levelRisiko = getLevelRisikoFromBesaran(besaran);
  hot.setDataAtCell(row, 5, besaran, "recalc");
  hot.setDataAtCell(row, 13, levelRisiko, "recalc");
  hot.setDataAtCell(row, 14, besaran, "recalc");
}
