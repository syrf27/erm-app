"use client";

import { useEffect, useMemo, useRef } from "react";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { useList } from "@refinedev/core";
import { createUniver, LocaleType } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";

type RiskRecord = Record<string, unknown>;

const headers = [
  "Sasaran", "Kegiatan", "Proses Bisnis", "Risiko", "Jenis Risiko",
  "Sumber Risiko", "Kategori", "Area Dampak", "Penyebab", "Dampak", "Tahun",
];

function label(value: unknown, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return String(item.nama ?? item.name ?? item.label ?? item.id ?? fallback);
  }
  return fallback;
}

function toRow(item: RiskRecord) {
  return [
    label(item.sasaran ?? item.sasaranNama),
    label(item.kegiatan ?? item.kegiatanNama),
    label(item.prosesBisnis ?? item.prosesBisnisNama),
    label(item.risiko),
    label(item.jenisRisiko ?? item.jenisRisikoNama),
    label(item.sumberRisiko ?? item.sumberRisikoNama),
    label(item.kategoriRisiko ?? item.kategoriRisikoNama),
    label(item.areaDampak ?? item.areaDampakNama),
    label(item.penyebab),
    label(item.dampak),
    label(item.tahun),
  ];
}

export function UniverIdentifikasiPoc() {
  const containerRef = useRef<HTMLDivElement>(null);
  const records = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 1000 } });
  const rows = useMemo(() => (records.result?.data ?? []).map((item) => toRow(item as RiskRecord)), [records.result?.data]);

  useEffect(() => {
    if (!containerRef.current || records.query?.isPending) return;
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS },
      presets: [UniverSheetsCorePreset({
        container: containerRef.current,
        header: true,
        toolbar: true,
        formulaBar: true,
        footer: { sheetBar: true, menus: true, zoomSlider: true },
      })],
    });

    const workbook = univerAPI.createWorkbook({ id: "identifikasi-poc", name: "Identifikasi Risiko" });
    const sheet = workbook.getActiveSheet();
    const values = [headers, ...rows];
    sheet.getRange(`A1:K${Math.max(values.length, 2)}`).setValues(values);
    sheet.getRange("A1:K1").setFontWeight("bold").setBackgroundColor("#e8f1fb");
    sheet.getRange(`A1:K${Math.max(values.length, 2)}`).setWrap(true);
    sheet.setColumnWidths(0, 11, 180);
    sheet.setColumnWidth(3, 280);
    sheet.setColumnWidths(8, 2, 220);
    sheet.setFrozenRows(1);
    return () => {
      queueMicrotask(() => univer.dispose());
    };
  }, [records.query?.isPending, rows]);

  if (records.query?.isPending) return <Loader />;
  return (
    <Stack gap="md">
      <Alert color="blue" title="Percobaan tampilan spreadsheet Univer">
        Menu ini adalah POC untuk membandingkan pengalaman Excel-like. Copy-paste, autofill, formula bar, toolbar, freeze header, dan navigasi keyboard tersedia dari Univer. Menu Identifikasi utama tetap aman dan belum diganti.
      </Alert>
      <Box ref={containerRef} style={{ height: "720px", width: "100%", border: "1px solid var(--mantine-color-default-border)" }} />
      <Text size="sm" c="dimmed">Data di atas masih mode percobaan dan belum terhubung ke tombol Simpan utama.</Text>
    </Stack>
  );
}
