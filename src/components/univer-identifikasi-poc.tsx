"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Group, Loader, Stack, Text, TextInput } from "@mantine/core";
import { useList } from "@refinedev/core";
import { notifications } from "@mantine/notifications";
import { useYear } from "@/lib/year-context";
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
const normalizeRow = (row: unknown[] = []) => headers.map((_, index) => String(row[index] ?? "").trim());
type SearchMatch = { row: number; column: number };

export function UniverIdentifikasiPoc() {
  const { tahunDari, tahunSampai } = useYear();
  return <UniverIdentifikasiSheet key={`${tahunDari}-${tahunSampai}`} tahunDari={tahunDari} tahunSampai={tahunSampai} />;
}

function UniverIdentifikasiSheet({ tahunDari, tahunSampai }: { tahunDari: number; tahunSampai: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<any>(null);
  const univerRef = useRef<{ dispose: () => void } | null>(null);
  const savedRowsRef = useRef<string[][]>([]);
  const rowIdsRef = useRef<(number | undefined)[]>([]);
  const records = useList({
    resource: "identifikasi-risiko",
    pagination: { pageSize: 1000 },
    filters: [
      { field: "tahun", operator: "gte", value: tahunDari },
      { field: "tahun", operator: "lte", value: tahunSampai },
    ],
  });
  const sasaran = useList({ resource: "sasaran", pagination: { mode: "off" } });
  const kegiatan = useList({ resource: "kegiatan", pagination: { mode: "off" } });
  const prosesBisnis = useList({ resource: "proses-bisnis", pagination: { mode: "off" } });
  const jenisRisiko = useList({ resource: "jenis-risiko", pagination: { mode: "off" } });
  const sumberRisiko = useList({ resource: "sumber-risiko", pagination: { mode: "off" } });
  const kategoriRisiko = useList({ resource: "kategori-risiko", pagination: { mode: "off" } });
  const areaDampak = useList({ resource: "area-dampak", pagination: { mode: "off" } });
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [sheetReady, setSheetReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const data = useMemo(() => (records.result?.data ?? []) as RiskRecord[], [records.result?.data]);
  const rows = useMemo(() => data.map(toRow), [data]);
  const loading = records.query?.isPending;

  const goToMatch = (match: SearchMatch) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const cell = sheet.getRange(`${String.fromCharCode(65 + match.column)}${match.row + 1}`);
    sheet.setActiveRange(cell);
    sheet.scrollToCell(match.row, match.column);
  };

  useEffect(() => {
    if (!search.trim() || !sheetReady || !sheetRef.current) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const timer = window.setTimeout(() => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const lastRow = Math.max(sheet.getLastRow(), savedRowsRef.current.length + 1);
      const values = sheet.getRange(`A2:K${lastRow + 1}`).getValues() as unknown[][];
      const needle = search.trim().toLocaleLowerCase();
      const found: SearchMatch[] = [];
      values.forEach((row, index) => row.forEach((cell, column) => {
        if (column < headers.length && String(cell ?? "").toLocaleLowerCase().includes(needle)) {
          found.push({ row: index + 1, column });
        }
      }));
      setMatches(found);
      setMatchIndex(0);
      if (found[0]) goToMatch(found[0]);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, sheetReady]);

  useEffect(() => {
    const onFind = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onFind, true);
    return () => window.removeEventListener("keydown", onFind, true);
  }, []);

  const nextMatch = (direction: number) => {
    if (!matches.length) return;
    const next = (matchIndex + direction + matches.length) % matches.length;
    setMatchIndex(next);
    goToMatch(matches[next]);
  };

  const save = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    setSaving(true);
    setSaveProgress(0);
    try {
      const lastRow = Math.max(sheet.getLastRow(), savedRowsRef.current.length + 1);
      const values = sheet.getRange(`A2:K${lastRow + 1}`).getValues() as unknown[][];
      const pending: { kind: "create" | "update"; index: number; item: any; row: string[] }[] = [];
      const lists = {
        sasaran: (sasaran.result?.data ?? []) as any[], kegiatan: (kegiatan.result?.data ?? []) as any[], prosesBisnis: (prosesBisnis.result?.data ?? []) as any[],
        jenisRisiko: (jenisRisiko.result?.data ?? []) as any[], sumberRisiko: (sumberRisiko.result?.data ?? []) as any[], kategoriRisiko: (kategoriRisiko.result?.data ?? []) as any[], areaDampak: (areaDampak.result?.data ?? []) as any[],
      };
      for (let index = 0; index < values.length; index++) {
        const row = normalizeRow(values[index]);
        const risiko = row[3];
        const id = rowIdsRef.current[index];
        if (!risiko) {
          if (id) throw new Error(`Risiko pada baris ${index + 1} wajib diisi. Penghapusan risiko gunakan fitur arsip/hapus.`);
          continue;
        }
        if (id && row.every((value, column) => value === savedRowsRef.current[index]?.[column])) continue;
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
        pending.push({ kind: id ? "update" : "create", index, item: id ? { id, data: payload } : { data: payload }, row });
      }
      if (!pending.length) { notifications.show({ title: "Tidak ada perubahan", message: "Tidak ada baris yang perlu disimpan", color: "blue" }); return; }
      for (let offset = 0; offset < pending.length; offset += 25) {
        const chunk = pending.slice(offset, offset + 25);
        const response = await fetch("/api/identifikasi-risiko/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creates: chunk.filter((entry) => entry.kind === "create").map((entry) => entry.item), updates: chunk.filter((entry) => entry.kind === "update").map((entry) => entry.item) }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error ?? "Gagal menyimpan data");
        const created = chunk.filter((entry) => entry.kind === "create");
        if (created.length && (!Array.isArray(result.created) || result.created.length !== created.length || result.created.some((item: any) => !item?.id))) {
          throw new Error("Simpan berhasil tetapi ID baris baru tidak diterima. Muat ulang halaman sebelum menyimpan lagi.");
        }
        let createdIndex = 0;
        chunk.forEach((entry) => {
          if (entry.kind === "create") rowIdsRef.current[entry.index] = result.created?.[createdIndex++]?.id;
          savedRowsRef.current[entry.index] = entry.row;
        });
        setSaveProgress(Math.min(offset + chunk.length, pending.length));
      }
      notifications.show({ title: "Tersimpan", message: `${pending.length} baris berhasil disimpan ke database`, color: "green" });
    } catch (error: any) { notifications.show({ title: "Gagal menyimpan", message: error?.message ?? "Periksa kembali data", color: "red" }); } finally { setSaving(false); setSaveProgress(0); }
  };

  useEffect(() => {
    if (!containerRef.current || loading || univerRef.current || [sasaran, kegiatan, prosesBisnis, jenisRisiko, sumberRisiko, kategoriRisiko, areaDampak].some((query) => query.query?.isPending)) return;
    const { univer, univerAPI } = createUniver({ locale: LocaleType.EN_US, locales: { [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS }, presets: [UniverSheetsCorePreset({ container: containerRef.current, header: true, toolbar: true, formulaBar: true, footer: { sheetBar: true, menus: true, zoomSlider: true } })], plugins: [UniverSheetsDataValidationPlugin, UniverSheetsDataValidationUIPlugin] });
    univerRef.current = univer;
    const workbook = univerAPI.createWorkbook({ id: "identifikasi-poc", name: "Identifikasi Risiko" });
    const sheet = workbook.getActiveSheet();
    sheetRef.current = sheet;
    savedRowsRef.current = rows.map(normalizeRow);
    rowIdsRef.current = data.map((item) => item.id);
    const values = [headers, ...rows, [...Array(headers.length - 1).fill(""), String(tahunDari)]];
    // Univer defaults to a larger grid. Show only the filtered records and one draft row.
    sheet.setRowCount(values.length);
    sheet.setColumnCount(headers.length);
    sheet.getRange(`A1:K${values.length}`).setValues(values);
    sheet.getRange("A1:K1").setFontWeight("bold").setBackgroundColor("#e8f1fb");
    sheet.getRange(`A1:K${values.length}`).setWrap(true);
    [320, 320, 370, 500, 180, 190, 260, 250, 380, 380, 110].forEach((width, index) => sheet.setColumnWidth(index, width));
    sheet.setRowHeight(0, 40);
    sheet.setFrozenRows(1);
    const optionLists = [(sasaran.result?.data ?? []).map((x: any) => x.nama), (kegiatan.result?.data ?? []).map((x: any) => x.nama), (prosesBisnis.result?.data ?? []).map((x: any) => x.nama), [], (jenisRisiko.result?.data ?? []).map((x: any) => x.nama), (sumberRisiko.result?.data ?? []).map((x: any) => x.nama), (kategoriRisiko.result?.data ?? []).map((x: any) => x.nama), (areaDampak.result?.data ?? []).map((x: any) => x.nama)];
    dropdownColumns.forEach((column) => { const options = optionLists[column]; if (!options?.length) return; const letter = String.fromCharCode(65 + column); sheet.getRange(`${letter}2:${letter}${values.length}`).setDataValidation(univerAPI.newDataValidation().requireValueInList(options, false, true).setOptions({ showDropDown: true, showErrorMessage: true, error: "Pilih nilai dari daftar." }).build()); });
    sheet.autoResizeRows(1, values.length - 1);
    setSheetReady(true);
  }, [loading, rows, tahunDari, sasaran.result?.data, kegiatan.result?.data, prosesBisnis.result?.data, jenisRisiko.result?.data, sumberRisiko.result?.data, kategoriRisiko.result?.data, areaDampak.result?.data]);

  useEffect(() => () => {
    sheetRef.current = null;
    univerRef.current?.dispose();
    univerRef.current = null;
  }, []);

  if (loading) return <Loader />;
  return <Stack gap="md"><Alert color="blue" title="Univer — Identifikasi Risiko">Cari isi tabel dengan kolom pencarian atau Ctrl/Cmd+F. Hasil pencarian akan ditandai dan tabel berpindah ke sel yang cocok.</Alert><Group justify="space-between" align="end"><TextInput ref={searchInputRef} leftSection={<IconSearch size={16} />} label="Cari di tabel" placeholder="Risiko, kegiatan, kategori..." value={search} onChange={(event) => setSearch(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); nextMatch(event.shiftKey ? -1 : 1); } }} style={{ flex: 1 }} /><Button variant="default" disabled={!matches.length} onClick={() => nextMatch(-1)}>Sebelumnya</Button><Button variant="default" disabled={!matches.length} onClick={() => nextMatch(1)}>Berikutnya</Button><Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} disabled={!sheetReady} onClick={save}>{saving && saveProgress ? `Tersimpan ${saveProgress} baris...` : "Simpan ke Database"}</Button></Group><Text size="sm" c="dimmed">Periode risiko {tahunDari === tahunSampai ? tahunDari : `${tahunDari}–${tahunSampai}`} · {data.length} risiko · 1 baris kosong untuk data baru</Text>{search.trim() && <Text size="sm" c="dimmed">{matches.length ? `Hasil ${matchIndex + 1} dari ${matches.length} sel` : "Tidak ada hasil yang cocok"}</Text>}<Box ref={containerRef} style={{ height: "720px", width: "100%", border: "1px solid var(--mantine-color-default-border)" }} /><Text size="sm" c="dimmed">Dropdown tersedia pada Sasaran, Kegiatan, Proses Bisnis, Jenis Risiko, Sumber Risiko, Kategori, dan Area Dampak.</Text></Stack>;
}
