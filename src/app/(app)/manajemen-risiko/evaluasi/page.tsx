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

  const identResult = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 10000 } });
  const evaluasiResult = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 10000 } });
  const analisisResult = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });

  const loading =
    (identResult.query?.isPending ?? false) ||
    (evaluasiResult.query?.isPending ?? false) ||
    (analisisResult.query?.isPending ?? false);

  const identifikasiData = useMemo(() => identResult.result?.data ?? [], [identResult.result?.data]);
  const evaluasiData = useMemo(() => evaluasiResult.result?.data ?? [], [evaluasiResult.result?.data]);
  const analisisData = useMemo(() => analisisResult.result?.data ?? [], [analisisResult.result?.data]);
  const refetchQuery = evaluasiResult.query?.refetch;

  useEffect(() => {
    if (loading) return;
    const evaluasiById = new Map(evaluasiData.map((e: any) => [e.identifikasiRisikoId, e]));
    const analisisById = new Map(analisisData.map((a: any) => [a.identifikasiRisikoId, a]));
    const mapped = identifikasiData.map((r: Record<string, any>) => {
      const ev = evaluasiById.get(r.id);
      const an = analisisById.get(r.id);
      const prioritas = an?.levelRisiko?.nama ?? "";
      return [
        r.id,
        ev?.id ?? null,
        r.risiko,
        ev?.responRisiko ?? "",
        prioritas,
      ];
    });
    const padded = [...mapped];
    while (padded.length < 30) {
      padded.push([null, null, "", "", ""]);
    }
    setLocalData(padded);
  }, [loading, identifikasiData, evaluasiData, analisisData]);

  const saveAll = useCallback(async () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    const rows = hot.getData() as any[][];
    setSaving(true);

    const newRows: { index: number; identId: number; respon: string }[] = [];
    const updateRows: { index: number; id: number; respon: string }[] = [];

    rows.forEach((row, idx) => {
      const identId = parseInt(row[0] as string, 10);
      const evaluasiId = parseInt(row[1] as string, 10);
      if (isNaN(identId)) return;
      const respon = (row[3] as string) ?? "";
      if (!respon) return;

      if (isNaN(evaluasiId) || evaluasiId === 0) {
        newRows.push({ index: idx, identId, respon });
      } else {
        updateRows.push({ index: idx, id: evaluasiId, respon });
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
          newRows.map(({ index, identId, respon }) =>
            fetch("/api/evaluasi-risiko", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifikasiRisikoId: identId, responRisiko: respon }),
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
          updateRows.map(({ id, respon }) =>
            fetch(`/api/evaluasi-risiko/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ responRisiko: respon }),
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
  }, [refetchQuery]);

  const columns: Handsontable.ColumnSettings[] = [
    { title: "Ident ID", data: 0, type: "numeric", width: 1 },
    { title: "Evaluasi ID", data: 1, type: "numeric", width: 1 },
    { title: "Risiko", data: 2, type: "text", width: 300, readOnly: true },
    {
      title: "Respon Risiko",
      data: 3,
      type: "dropdown",
      source: RESPON_OPTIONS,
      width: 250,
      strict: true,
    },
    { title: "Prioritas Risiko", data: 4, type: "text", width: 200, readOnly: true },
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
        <Title order={3}>Evaluasi Risiko</Title>
        <Button onClick={saveAll} loading={saving}>
          Simpan Semua
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        Tetapkan Respon Risiko untuk setiap risiko. Prioritas Risiko terisi otomatis dari hasil analisis. Klik &quot;Simpan Semua&quot; untuk menyimpan.
      </Text>
      <HotTable
        ref={hotRef}
        data={localData}
        columns={columns}
        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
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
