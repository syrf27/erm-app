"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Group, Loader, Stack, Text, TextInput } from "@mantine/core";
import { useList } from "@refinedev/core";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-react";
import { createUniver, LocaleType } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { UniverSheetsDataValidationPlugin } from "@univerjs/sheets-data-validation";
import { UniverSheetsDataValidationUIPlugin } from "@univerjs/sheets-data-validation-ui";
import "@univerjs/sheets-data-validation/facade";
import "@univerjs/preset-sheets-core/lib/index.css";

type RiskRecord = Record<string, any>;
const headers = ["Sasaran", "Kegiatan", "Proses Bisnis", "Risiko", "Jenis Risiko", "Sumber Risiko", "Kategori", "Area Dampak", "Penyebab", "Dampak", "Tahun"];
const dropdownColumns = [0, 1, 2, 4, 5, 6, 7];
const label = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  const item = value as Record<string, unknown>;
  return String(item.nama ?? item.name ?? item.label ?? "");
};
const relation = (item: RiskRecord, key: string) => item[key] ?? item[`${key}Nama`];
function toRow(item: RiskRecord) {
  return [label(relation(item, "sasaran")), label(relation(item, "kegiatan")), label(relation(item, "prosesBisnis")), label(item.risiko), label(relation(item, "jenisRisiko")), label(relation(item, "sumberRisiko")), label(relation(item, "kategoriRisiko")), label(relation(item, "areaDampak")), label(item.penyebab), label(item.dampak), label(item.tahun)];
}
const findByName = (list: any[], name: string) => list.find((item) => item.nama === name);

export function UniverIdentifikasiPoc() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<any>(null);
  const records = useList({ resource: "identifikasi-risiko", pagination: { pageSize: 1000 } });
  const sasaran = useList({ resource: "sasaran", pagination: { mode: "off" } });
  const kegiatan = useList({ resource: "kegiatan", pagination: { mode: "off" } });
  const prosesBisnis = useList({ resource: "proses-bisnis", pagination: { mode: "off" } });
  const jenisRisiko = useList({ resource: "jenis-risiko", pagination: { mode: "off" } });
  const sumberRisiko = useList({ resource: "sumber-risiko", pagination: { mode: "off" } });
  const kategoriRisiko = useList({ resource: "kategori-risiko", pagination: { mode: "off" } });
  const areaDampak = useList({ resource: "area-dampak", pagination: { mode: "off" } });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const data = useMemo(() => (records.result?.data ?? []) as RiskRecord[], [records.result?.data]);
  const rows = useMemo(() => data.map(toRow), [data]);
  const loading = records.query?.isPending;

  const applySearch = (value: string) => {
    setSearch(value);
    const sheet = sheetRef.current;
    if (!sheet) return;
    const needle = value.trim().toLowerCase();
    data.forEach((_, index) => {
      const row = sheet.getRange(`A${index + 2}:K${index + 2}`).getValues()[0] ?? [];
      const matched = !needle || row.some((cell: unknown) => String(cell ?? "").toLowerCase().includes(needle));
      sheet.setRowHeight(index + 1, matched ? 34 : 0);
    });
  };

  const save = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    setSaving(true);
    try {
      const values = sheet.getRange(`A2:K${Math.max(data.length + 1, 2)}`).getValues() as unknown[][];
      const creates: any[] = [], updates: any[] = [];
      const lists = {
        sasaran: (sasaran.result?.data ?? []) as any[], kegiatan: (kegiatan.result?.data ?? []) as any[], prosesBisnis: (prosesBisnis.result?.data ?? []) as any[],
        jenisRisiko: (jenisRisiko.result?.data ?? []) as any[], sumberRisiko: (sumberRisiko.result?.data ?? []) as any[], kategoriRisiko: (kategoriRisiko.result?.data ?? []) as any[], areaDampak: (areaDampak.result?.data ?? []) as any[],
      };
      for (let index = 0; index < values.length; index++) {
        const row = values[index];
        const risiko = String(row[3] ?? "").trim();
        if (!risiko) continue;
        if (data[index]?.id && JSON.stringify(row) === JSON.stringify(rows[index])) continue;
        const selectedSasaran = findByName(lists.sasaran, String(row[0] ?? ""));
        const selectedKegiatan = findByName(lists.kegiatan, String(row[1] ?? ""));
        const selectedProses = findByName(lists.prosesBisnis, String(row[2] ?? ""));
        const required: [string, any][] = [["Jenis Risiko", findByName(lists.jenisRisiko, String(row[4] ?? ""))], ["Sumber Risiko", findByName(lists.sumberRisiko, String(row[5] ?? ""))], ["Kategori", findByName(lists.kategoriRisiko, String(row[6] ?? ""))], ["Area Dampak", findByName(lists.areaDampak, String(row[7] ?? ""))]];
        const missing = required.find(([, value]) => !value);
        if (missing) throw new Error(`Kolom ${missing[0]} pada baris ${index + 1} belum valid`);
        const payload = {
          risiko, jenisRisikoId: required[0][1].id, sumberRisikoId: required[1][1].id, kategoriRisikoId: required[2][1].id, areaDampakId: required[3][1].id,
          ...(selectedSasaran?.id ? { sasaranId: selectedSasaran.id } : {}), ...(selectedKegiatan?.id ? { kegiatanId: selectedKegiatan.id, unitKerjaId: selectedKegiatan.unitKerjaId } : {}), ...(selectedProses?.id ? { prosesBisnisId: selectedProses.id } : {}),
          penyebab: String(row[8] ?? "") || null, dampak: String(row[9] ?? "") || null, tahun: Number(row[10]) || new Date().getFullYear(),
        };
        if (data[index]?.id) updates.push({ id: data[index].id, data: payload }); else creates.push({ data: payload });
      }
      if (!creates.length && !updates.length) { notifications.show({ title: "Tidak ada data", message: "Tidak ada baris yang perlu disimpan", color: "orange" }); return; }
      const response = await fetch("/api/identifikasi-risiko/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creates, updates }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error ?? "Gagal menyimpan data");
      notifications.show({ title: "Tersimpan", message: "Data Univer berhasil disimpan ke database", color: "green" });
      await records.query?.refetch?.();
    } catch (error: any) { notifications.show({ title: "Gagal menyimpan", message: error?.message ?? "Periksa kembali data", color: "red" }); } finally { setSaving(false); }
  };

  useEffect(() => {
    if (!containerRef.current || loading) return;
    const { univer, univerAPI } = createUniver({ locale: LocaleType.EN_US, locales: { [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS }, presets: [UniverSheetsCorePreset({ container: containerRef.current, header: true, toolbar: true, formulaBar: true, footer: { sheetBar: true, menus: true, zoomSlider: true } })], plugins: [UniverSheetsDataValidationPlugin, UniverSheetsDataValidationUIPlugin] });
    const workbook = univerAPI.createWorkbook({ id: "identifikasi-poc", name: "Identifikasi Risiko" });
    const sheet = workbook.getActiveSheet();
    sheetRef.current = sheet;
    const values = [headers, ...rows, Array(headers.length).fill("")];
    sheet.getRange(`A1:K${values.length}`).setValues(values);
    sheet.getRange("A1:K1").setFontWeight("bold").setBackgroundColor("#e8f1fb"); sheet.getRange(`A1:K${values.length}`).setWrap(true);
    sheet.setColumnWidths(0, 11, 180); sheet.setColumnWidth(3, 280); sheet.setColumnWidths(8, 2, 220); sheet.setFrozenRows(1);
    const optionLists = [(sasaran.result?.data ?? []).map((x: any) => x.nama), (kegiatan.result?.data ?? []).map((x: any) => x.nama), (prosesBisnis.result?.data ?? []).map((x: any) => x.nama), [], (jenisRisiko.result?.data ?? []).map((x: any) => x.nama), (sumberRisiko.result?.data ?? []).map((x: any) => x.nama), (kategoriRisiko.result?.data ?? []).map((x: any) => x.nama), (areaDampak.result?.data ?? []).map((x: any) => x.nama)];
    dropdownColumns.forEach((column) => { const options = optionLists[column]; if (!options?.length) return; const letter = String.fromCharCode(65 + column); sheet.getRange(`${letter}2:${letter}${values.length}`).setDataValidation(univerAPI.newDataValidation().requireValueInList(options, false, true).setOptions({ showDropDown: true, showErrorMessage: true, error: "Pilih nilai dari daftar." }).build()); });
    return () => { sheetRef.current = null; queueMicrotask(() => univer.dispose()); };
  }, [loading, rows, sasaran.result?.data, kegiatan.result?.data, prosesBisnis.result?.data, jenisRisiko.result?.data, sumberRisiko.result?.data, kategoriRisiko.result?.data, areaDampak.result?.data]);

  if (loading) return <Loader />;
  return <Stack gap="md"><Alert color="blue" title="Univer — Identifikasi Risiko">Spreadsheet Excel-like dengan dropdown referensi dan penyimpanan ke database. Gunakan pencarian di atas atau Ctrl/Cmd+F untuk pencarian native Univer.</Alert><Group justify="space-between" align="end"><TextInput leftSection={<IconSearch size={16} />} label="Cari di tabel" placeholder="Risiko, kegiatan, kategori..." value={search} onChange={(event) => applySearch(event.currentTarget.value)} style={{ flex: 1 }} /><Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} onClick={save}>Simpan ke Database</Button></Group><Box ref={containerRef} style={{ height: "720px", width: "100%", border: "1px solid var(--mantine-color-default-border)" }} /><Text size="sm" c="dimmed">Dropdown tersedia pada Sasaran, Kegiatan, Proses Bisnis, Jenis Risiko, Sumber Risiko, Kategori, dan Area Dampak.</Text></Stack>;
}
