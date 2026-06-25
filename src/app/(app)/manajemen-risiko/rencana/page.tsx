"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useList } from "@refinedev/core";
import Link from "next/link";
import { Title, Button, Group, Loader, Center, Stack, Text, Card } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import Handsontable from "handsontable";
import "handsontable/styles/handsontable.min.css";
import { registerAllCellTypes } from "handsontable/cellTypes";
registerAllCellTypes();

function computeBesaran(kemungkinanSkala?: number, dampakSkala?: number) {
  if (kemungkinanSkala == null || dampakSkala == null) return "";
  return String(kemungkinanSkala * dampakSkala);
}

export default function RencanaPenangananPage() {
  const hotRef = useRef<HotTableRef>(null);
  const [localData, setLocalData] = useState<any[][]>([]);
  const [saving, setSaving] = useState(false);

  const identResult = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 10000 } });
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });
  const evaluasiResult = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 10000 } });
  const rencanaResult = useList({ resource: "rencana-penanganan", pagination: { pageSize: 10000 } });
  const kemungkinanList = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const dampakList = useList({ resource: "level-dampak", pagination: { mode: "off" } });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (rencanaResult.query?.isPending ?? false) ||
    (kemungkinanList.query?.isPending ?? false) ||
    (dampakList.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const evaluasiData = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const rencanaData = useMemo(() => rencanaResult.result?.data ?? [], [rencanaResult.result?.data]);
  const refetchQuery = rencanaResult.query?.refetch;

  const kemungkinanData = useMemo(() => kemungkinanList.result?.data ?? [], [kemungkinanList.result?.data]);
  const dampakData = useMemo(() => dampakList.result?.data ?? [], [dampakList.result?.data]);

  const kemungkinanNamaList = useMemo(() => kemungkinanData.map((o: any) => o.nama), [kemungkinanData]);
  const dampakNamaList = useMemo(() => dampakData.map((o: any) => o.nama), [dampakData]);

  useEffect(() => {
    if (loading) return;
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    const evaluasiById = new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e]));
    const rencanaById = new Map(rencanaData.map((r: any) => [r.identifikasiRisikoId, r]));

    const filtered = identifikasiData.filter((r: Record<string, any>) => {
      const ev = evaluasiById.get(r.id);
      return ev?.responRisiko === "Mengurangi Risiko";
    });

    const kemungkinanById = new Map(kemungkinanData.map((k: any) => [k.id, k]));
    const dampakById = new Map(dampakData.map((d: any) => [d.id, d]));

    const mapped = filtered.map((r: Record<string, any>) => {
      const an = analisisById.get(r.id);
      const rp = rencanaById.get(r.id);

      const lk = an ? kemungkinanById.get(an.levelKemungkinanId) : undefined;
      const ld = an ? dampakById.get(an.levelDampakId) : undefined;

      const residualLK = rp?.residualLevelKemungkinanId ? kemungkinanById.get(rp.residualLevelKemungkinanId) : undefined;
      const residualLD = rp?.residualLevelDampakId ? dampakById.get(rp.residualLevelDampakId) : undefined;

      return [
        r.id,
        rp?.id ?? null,
        an?.levelRisiko?.nama ?? "",
        r.risiko,
        computeBesaran(lk?.skala, ld?.skala),
        computeBesaran(residualLK?.skala, residualLD?.skala),
        rp?.rencanaTidakPenanganan ?? "",
        rp?.targetOutput ?? "",
        rp?.targetWaktu ?? "",
        rp?.penanggungJawab ?? "",
        residualLK?.nama ?? "",
        residualLD?.nama ?? "",
        computeBesaran(residualLK?.skala, residualLD?.skala),
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, null, "", "", "", "", "", "", "", "", "", "", ""]);
    }
    setLocalData(padded);
  }, [loading, identifikasiData, analisisData, evaluasiData, rencanaData, kemungkinanData, dampakData]);

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

      const residualLKId = findId(kemungkinanData, (row[10] as string) ?? "");
      const residualLDId = findId(dampakData, (row[11] as string) ?? "");

      const payload: Record<string, any> = {};
      payload.rencanaTidakPenanganan = (row[6] as string) || null;
      payload.targetOutput = (row[7] as string) || null;
      payload.targetWaktu = (row[8] as string) || null;
      payload.penanggungJawab = (row[9] as string) || null;
      if (!isNaN(residualLKId)) payload.residualLevelKemungkinanId = residualLKId;
      else payload.residualLevelKemungkinanId = null;
      if (!isNaN(residualLDId)) payload.residualLevelDampakId = residualLDId;
      else payload.residualLevelDampakId = null;

      if (isNaN(rencanaId) || rencanaId === 0) {
        newRows.push({ index: idx, identId, payload: { ...payload, identifikasiRisikoId: identId } });
      } else {
        updateRows.push({ index: idx, id: rencanaId, payload });
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
            fetch("/api/rencana-penanganan", {
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
      notifications.show({ title: "Tersimpan", message: "Semua data berhasil disimpan", color: "green" });
      if (refetchQuery) refetchQuery();
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message ?? "Gagal menyimpan data", color: "red" });
    } finally {
      setSaving(false);
    }
  }, [refetchQuery, kemungkinanData, dampakData]);

  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Rencana ID", data: 1, type: "numeric", width: 1 },
    { title: "Prioritas", data: 2, type: "text", width: 130, readOnly: true },
    { title: "Risiko", data: 3, type: "text", width: 220, readOnly: true },
    { title: "Besaran Risiko Aktual", data: 4, type: "text", width: 160, readOnly: true },
    { title: "Besaran Risiko Residual", data: 5, type: "text", width: 160, readOnly: true },
    { title: "Rencana Tindak Penanganan", data: 6, type: "text", width: 240 },
    { title: "Target Output", data: 7, type: "text", width: 180 },
    { title: "Target Waktu", data: 8, type: "text", width: 150 },
    { title: "Penanggung Jawab", data: 9, type: "text", width: 180 },
    {
      title: "Level Kemungkinan",
      data: 10,
      type: "dropdown",
      source: kemungkinanNamaList,
      width: 170,
      strict: true,
    },
    {
      title: "Level Dampak",
      data: 11,
      type: "dropdown",
      source: dampakNamaList,
      width: 150,
      strict: true,
    },
    { title: "Besaran Risiko", data: 12, type: "text", width: 130, readOnly: true },
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
        <Title order={3}>Rencana Penanganan</Title>
        <Button onClick={saveAll} loading={saving}>
          Simpan Semua
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Hanya menampilkan risiko dengan Respon Risiko &quot;Mengurangi Risiko&quot;. Besaran Risiko Residual dan Besaran Risiko pada Risiko Residual Harapan terisi otomatis.
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
          "Target Output",
          "Target Waktu",
          "Penanggung Jawab",
          "Level Kemungkinan",
          "Level Dampak",
          "Besaran Risiko",
        ]}
        hiddenColumns={{
          columns: [0, 1],
          indicators: false,
        }}
        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Rencana ID", colspan: 1 },
            { label: "Prioritas", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Besaran Risiko", colspan: 2 },
            { label: "Rencana Penanganan Risiko", colspan: 4 },
            { label: "Risiko Residual Harapan", colspan: 3 },
          ],
        ]}
        afterChange={(changes) => {
          if (!changes) return;
          const hot = hotRef.current?.hotInstance;
          if (!hot) return;
          for (const [row, col] of changes) {
            if (col === 10 || col === 11) {
              recalcRow(hot, row, kemungkinanData, dampakData);
            }
          }
        }}
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
        cells={function (row, col) {
          const cellProperties: any = {};
          const hot = this.instance;
          const identId = hot.getDataAtCell(row, 0);
          if (identId == null) {
            cellProperties.readOnly = true;
          }
          return cellProperties;
        }}
      />
    </Stack>
  );
}

function recalcRow(hot: Handsontable, row: number, kemungkinanData: any[], dampakData: any[]) {
  const lkNama = hot.getDataAtCell(row, 10) as string;
  const ldNama = hot.getDataAtCell(row, 11) as string;
  const lk = kemungkinanData.find((o: any) => o.nama === lkNama);
  const ld = dampakData.find((o: any) => o.nama === ldNama);
  const besaran = computeBesaran(lk?.skala, ld?.skala);
  hot.setDataAtCell(row, 5, besaran, "recalc");
  hot.setDataAtCell(row, 12, besaran, "recalc");
}
