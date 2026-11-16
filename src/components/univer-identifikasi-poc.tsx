"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Box, Button, FileButton, Group, Loader, Modal, SegmentedControl, Select, Stack, Table, Text, Textarea, TextInput } from "@mantine/core";
import { useList } from "@refinedev/core";
import { notifications } from "@mantine/notifications";
import { useYear } from "@/lib/year-context";
import { IconArchive, IconDatabase, IconDeviceFloppy, IconDownload, IconPlus, IconSearch, IconSparkles, IconUpload } from "@tabler/icons-react";
import { useGetIdentity } from "@refinedev/core";
import { hasClientPermission, isAdminIdentity } from "@/lib/client-permissions";
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
function toRow(item: RiskRecord, lists: Record<string, any[]>) {
  const byId = (key: string, id: unknown) => lists[key]?.find((entry) => entry.id === id);
  const proses = item.prosesBisnis ?? byId("prosesBisnis", item.prosesBisnisId);
  const kegiatan = item.kegiatan ?? byId("kegiatan", item.kegiatanId) ?? byId("kegiatan", proses?.kegiatanId);
  const sasaran = item.sasaran ?? byId("sasaran", item.sasaranId) ?? byId("sasaran", kegiatan?.sasaranId);
  const related = (key: string, idKey: string) => label(item[key] ?? byId(key, item[idKey]));
  return [label(sasaran), label(kegiatan), label(proses), label(item.risiko), related("jenisRisiko", "jenisRisikoId"), related("sumberRisiko", "sumberRisikoId"), related("kategoriRisiko", "kategoriRisikoId"), related("areaDampak", "areaDampakId"), label(item.penyebab), label(item.dampak), label(item.tahun)];
}
const findByName = (list: any[], name: string) => list.find((item) => item.nama === name);
const normalizeRow = (row: unknown[] = []) => headers.map((_, index) => String(row[index] ?? "").trim());
type SearchMatch = { row: number; column: number };

export function UniverIdentifikasiPoc() {
  const { tahunDari, tahunSampai } = useYear();
  const [revision, setRevision] = useState(0);
  return <UniverIdentifikasiSheet key={`${tahunDari}-${tahunSampai}-${revision}`} tahunDari={tahunDari} tahunSampai={tahunSampai} onReload={() => setRevision((value) => value + 1)} />;
}

function UniverIdentifikasiSheet({ tahunDari, tahunSampai, onReload }: { tahunDari: number; tahunSampai: number; onReload: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<any>(null);
  const univerRef = useRef<{ dispose: () => void } | null>(null);
  const savedRowsRef = useRef<string[][]>([]);
  const rowIdsRef = useRef<(number | undefined)[]>([]);
  const validationRulesRef = useRef<Record<number, any>>({});
  const records = useList({
    resource: "identifikasi-risiko",
    pagination: { pageSize: 1000 },
    filters: [
      { field: "tahun", operator: "gte", value: tahunDari },
      { field: "tahun", operator: "lte", value: tahunSampai },
    ],
  });
  // The API defaults to ten records if pagination parameters are omitted.
  const sasaran = useList({ resource: "sasaran", pagination: { pageSize: 1000 } });
  const kegiatan = useList({ resource: "kegiatan", pagination: { pageSize: 1000 } });
  const prosesBisnis = useList({ resource: "proses-bisnis", pagination: { pageSize: 1000 } });
  const jenisRisiko = useList({ resource: "jenis-risiko", pagination: { pageSize: 1000 } });
  const sumberRisiko = useList({ resource: "sumber-risiko", pagination: { pageSize: 1000 } });
  const kategoriRisiko = useList({ resource: "kategori-risiko", pagination: { pageSize: 1000 } });
  const areaDampak = useList({ resource: "area-dampak", pagination: { pageSize: 1000 } });
  const levelKemungkinan = useList({ resource: "level-kemungkinan", pagination: { pageSize: 1000 } });
  const levelDampak = useList({ resource: "level-dampak", pagination: { pageSize: 1000 } });
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [sheetReady, setSheetReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [view, setView] = useState("active");
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const [bankResults, setBankResults] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMethod, setBankMethod] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistDescription, setAssistDescription] = useState("");
  const [assistSuggestion, setAssistSuggestion] = useState<any>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistWorkflowLoading, setAssistWorkflowLoading] = useState(false);
  const [assistLikelihood, setAssistLikelihood] = useState("");
  const [assistImpact, setAssistImpact] = useState("");
  const [assistControl, setAssistControl] = useState("");
  const [assistEffectiveness, setAssistEffectiveness] = useState<string | null>(null);
  const [assistResponse, setAssistResponse] = useState("mengurangi");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveItem, setArchiveItem] = useState<any>(null);
  const [archiveAction, setArchiveAction] = useState("archive");
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState("");
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const { data: identity } = useGetIdentity<any>();
  const canArchive = hasClientPermission(identity, "identifikasi-risiko:delete");
  const isAdmin = isAdminIdentity(identity);
  const data = useMemo(() => (records.result?.data ?? []) as RiskRecord[], [records.result?.data]);
  const referenceLists = useMemo(() => ({
    sasaran: (sasaran.result?.data ?? []) as any[], kegiatan: (kegiatan.result?.data ?? []) as any[], prosesBisnis: (prosesBisnis.result?.data ?? []) as any[],
    jenisRisiko: (jenisRisiko.result?.data ?? []) as any[], sumberRisiko: (sumberRisiko.result?.data ?? []) as any[], kategoriRisiko: (kategoriRisiko.result?.data ?? []) as any[], areaDampak: (areaDampak.result?.data ?? []) as any[],
  }), [sasaran.result?.data, kegiatan.result?.data, prosesBisnis.result?.data, jenisRisiko.result?.data, sumberRisiko.result?.data, kategoriRisiko.result?.data, areaDampak.result?.data]);
  const rows = useMemo(() => data.map((item) => toRow(item, referenceLists)), [data, referenceLists]);
  const loading = records.query?.isPending;
  const archived = useList({ resource: "identifikasi-risiko/archive", pagination: { pageSize: 1000 }, queryOptions: { enabled: view === "archived" }, filters: [{ field: "tahun", operator: "gte", value: tahunDari }, { field: "tahun", operator: "lte", value: tahunSampai }] });
  const readRows = () => { const sheet = sheetRef.current; return sheet && sheet.getMaxRows() > 1 ? sheet.getRange(`A2:K${sheet.getMaxRows()}`).getValues() as unknown[][] : []; };
  const hasUnsavedChanges = () => readRows().some((value, index) => {
    const row = normalizeRow(value);
    return rowIdsRef.current[index] ? row.some((cell, column) => cell !== savedRowsRef.current[index]?.[column]) : row.slice(0, 10).some(Boolean);
  });
  useEffect(() => {
    if (!sheetReady) return;
    const timer = window.setInterval(() => setDirtyCount(readRows().filter((value, index) => {
      const row = normalizeRow(value);
      return rowIdsRef.current[index] ? row.some((cell, column) => cell !== savedRowsRef.current[index]?.[column]) : row.slice(0, 10).some(Boolean);
    }).length), 1000);
    return () => window.clearInterval(timer);
  }, [sheetReady]);
  const refresh = async () => { await records.query?.refetch(); await archived.query?.refetch(); onReload(); };

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
      const values = sheet.getMaxRows() > 1
        ? sheet.getRange(`A2:K${sheet.getMaxRows()}`).getValues() as unknown[][]
        : [];
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

  const addRow = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.insertRows(1, 1);
    rowIdsRef.current.splice(0, 0, undefined);
    savedRowsRef.current.splice(0, 0, []);
    sheet.getRange("K2").setValue(String(tahunDari));
    sheet.getRange("A2:K2").setWrap(true);
    dropdownColumns.forEach((column) => { const rule = validationRulesRef.current[column]; if (rule) sheet.getRange(`${String.fromCharCode(65 + column)}2`).setDataValidation(rule); });
    sheet.autoResizeRows(1, 1);
    sheet.setActiveRange(sheet.getRange("A2"));
    sheet.scrollToCell(1, 0);
  };

  const jumpIncomplete = () => {
    const index = readRows().findIndex((value) => { const row = normalizeRow(value); return Boolean(row[3]) && [0, 1, 2, 4, 5, 6, 7].some((column) => !row[column]); });
    if (index < 0) { notifications.show({ title: "Data lengkap", message: "Tidak ada risiko yang sedang menunggu kelengkapan.", color: "blue" }); return; }
    const sheet = sheetRef.current;
    const column = [0, 1, 2, 4, 5, 6, 7].find((item) => !normalizeRow(readRows()[index])[item]) ?? 0;
    sheet.setActiveRange(sheet.getRange(`${String.fromCharCode(65 + column)}${index + 2}`));
    sheet.scrollToCell(index + 1, column);
  };

  const searchBank = async () => {
    if (!bankQuery.trim()) return;
    setBankLoading(true);
    try {
      const response = await fetch("/api/bank-risiko/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: bankQuery.trim(), limit: 15, tahun: tahunDari }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pencarian gagal");
      setBankResults(result.results ?? []);
      setBankMethod(result.method ?? "text");
    } catch (error: any) { notifications.show({ title: "Pencarian gagal", message: error.message, color: "red" }); }
    finally { setBankLoading(false); }
  };

  const importBankRisk = async (risk: any) => {
    if (hasUnsavedChanges()) { notifications.show({ title: "Simpan dahulu", message: "Simpan perubahan pada tabel sebelum mengambil risiko dari Bank Risiko.", color: "orange" }); return; }
    try {
      const payload = { risiko: risk.risiko, jenisRisikoId: risk.jenis_risiko_id, sumberRisikoId: risk.sumber_risiko_id, kategoriRisikoId: risk.kategori_risiko_id, areaDampakId: risk.area_dampak_id, penyebab: risk.penyebab, dampak: risk.dampak, ...(risk.sasaran_id != null && { sasaranId: risk.sasaran_id }), ...(risk.kegiatan_id != null && { kegiatanId: risk.kegiatan_id }), ...(risk.proses_bisnis_id != null && { prosesBisnisId: risk.proses_bisnis_id }), ...(risk.unit_kerja_id != null && { unitKerjaId: risk.unit_kerja_id }), tahun: tahunDari };
      const response = await fetch("/api/identifikasi-risiko", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Gagal mengambil risiko");
      setBankOpen(false);
      await refresh();
      notifications.show({ title: "Risiko ditambahkan", message: "Data dari Bank Risiko sudah masuk ke tabel.", color: "green" });
    } catch (error: any) { notifications.show({ title: "Gagal menambahkan", message: error.message, color: "red" }); }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`/api/import/identifikasi-risiko/template?tahunDari=${tahunDari}&tahunSampai=${tahunSampai}`);
      if (!response.ok) throw new Error("Gagal mengunduh template");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `Template_Import_Identifikasi_Risiko_${tahunDari}.xlsx`; link.click(); URL.revokeObjectURL(url);
    } catch (error: any) { notifications.show({ title: "Unduhan gagal", message: error.message, color: "red" }); }
  };

  const importExcel = async (file: File | null) => {
    if (!file) return;
    if (hasUnsavedChanges()) { notifications.show({ title: "Simpan dahulu", message: "Simpan perubahan pada tabel sebelum mengimpor Excel.", color: "orange" }); return; }
    setImporting(true);
    try {
      const form = new FormData(); form.append("file", file); form.append("tahunDari", String(tahunDari));
      const response = await fetch("/api/import/identifikasi-risiko", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Impor gagal");
      setImportResult(result);
      await refresh();
    } catch (error: any) { notifications.show({ title: "Impor gagal", message: error.message, color: "red" }); }
    finally { setImporting(false); }
  };

  const suggestRisk = async () => {
    if (!assistDescription.trim()) return;
    setAssistLoading(true);
    try {
      const lists = { sasaran: referenceLists.sasaran, kegiatan: referenceLists.kegiatan, prosesBisnis: referenceLists.prosesBisnis, jenisRisiko: referenceLists.jenisRisiko, sumberRisiko: referenceLists.sumberRisiko, kategori: referenceLists.kategoriRisiko, areaDampak: referenceLists.areaDampak };
      const response = await fetch("/api/ai/risk-assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: assistDescription, lists }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Gagal membuat saran");
      setAssistSuggestion(result.suggestion);
      setAssistLikelihood(result.suggestion?.levelKemungkinan ?? "");
      setAssistImpact(result.suggestion?.levelDampak ?? "");
      setAssistResponse(result.suggestion?.responRisiko ?? "mengurangi");
    } catch (error: any) { notifications.show({ title: "Asisten AI", message: error.message, color: "red" }); }
    finally { setAssistLoading(false); }
  };

  const applySuggestion = () => {
    const sheet = sheetRef.current;
    if (!sheet || !assistSuggestion) return;
    const resolve = (value: unknown, list: any[]) => { const raw = String(value ?? "").trim(); return list.find((item) => item.id === Number(raw) || item.nama === raw)?.nama ?? raw; };
    addRow();
    const values = [resolve(assistSuggestion.sasaran, referenceLists.sasaran), resolve(assistSuggestion.kegiatan, referenceLists.kegiatan), resolve(assistSuggestion.prosesBisnis, referenceLists.prosesBisnis), assistSuggestion.risiko ?? "", resolve(assistSuggestion.jenisRisiko, referenceLists.jenisRisiko), resolve(assistSuggestion.sumberRisiko, referenceLists.sumberRisiko), resolve(assistSuggestion.kategori, referenceLists.kategoriRisiko), resolve(assistSuggestion.areaDampak, referenceLists.areaDampak), assistSuggestion.penyebab ?? "", assistSuggestion.dampak ?? "", String(tahunDari)];
    sheet.getRange("A2:K2").setValues([values]);
    sheet.autoResizeRows(1, 1);
    setAssistOpen(false);
    notifications.show({ title: "Draf AI ditambahkan", message: "Periksa baris baru lalu simpan perubahan.", color: "blue" });
  };

  const createThroughEvaluation = async () => {
    if (!assistSuggestion || hasUnsavedChanges()) { notifications.show({ title: "Simpan dahulu", message: "Simpan perubahan pada tabel sebelum membuat alur risiko.", color: "orange" }); return; }
    const resolve = (value: unknown, list: any[]) => { const raw = String(value ?? "").trim(); return list.find((item) => item.id === Number(raw) || item.nama === raw); };
    const sasaran = resolve(assistSuggestion.sasaran, referenceLists.sasaran);
    const kegiatan = resolve(assistSuggestion.kegiatan, referenceLists.kegiatan);
    const proses = resolve(assistSuggestion.prosesBisnis, referenceLists.prosesBisnis);
    const jenis = resolve(assistSuggestion.jenisRisiko, referenceLists.jenisRisiko);
    const sumber = resolve(assistSuggestion.sumberRisiko, referenceLists.sumberRisiko);
    const kategori = resolve(assistSuggestion.kategori, referenceLists.kategoriRisiko);
    const area = resolve(assistSuggestion.areaDampak, referenceLists.areaDampak);
    const kemungkinan = resolve(assistLikelihood, (levelKemungkinan.result?.data ?? []) as any[]);
    const dampak = resolve(assistImpact, (levelDampak.result?.data ?? []) as any[]);
    if (!assistSuggestion.risiko || !jenis || !sumber || !kategori || !area || !kemungkinan || !dampak) { notifications.show({ title: "Saran belum lengkap", message: "Periksa klasifikasi dan level risiko.", color: "orange" }); return; }
    setAssistWorkflowLoading(true);
    try {
      const post = async (path: string, body: unknown) => { const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || `Gagal menyimpan ${path}`); return result; };
      const identification = await post("/api/identifikasi-risiko", { risiko: assistSuggestion.risiko, penyebab: assistSuggestion.penyebab || null, dampak: assistSuggestion.dampak || null, jenisRisikoId: jenis.id, sumberRisikoId: sumber.id, kategoriRisikoId: kategori.id, areaDampakId: area.id, ...(sasaran && { sasaranId: sasaran.id }), ...(kegiatan && { kegiatanId: kegiatan.id }), ...(proses && { prosesBisnisId: proses.id }), tahun: tahunDari });
      await post("/api/analisis-risiko", { identifikasiRisikoId: identification.id, levelKemungkinanId: kemungkinan.id, levelDampakId: dampak.id, pengendalianUraian: assistControl || null, pengendalianEfektivitas: assistEffectiveness || null });
      await post("/api/evaluasi-risiko", { identifikasiRisikoId: identification.id, responRisiko: assistResponse });
      setAssistOpen(false); await refresh();
      notifications.show({ title: "Alur risiko dibuat", message: "Identifikasi, analisis, dan evaluasi telah disimpan.", color: "green" });
    } catch (error: any) { notifications.show({ title: "Gagal membuat alur risiko", message: error.message, color: "red" }); }
    finally { setAssistWorkflowLoading(false); }
  };

  const openArchive = async (id: number, action: string) => {
    if (hasUnsavedChanges()) { notifications.show({ title: "Simpan dahulu", message: "Simpan perubahan sebelum mengelola arsip.", color: "orange" }); return; }
    try {
      const response = await fetch(`/api/identifikasi-risiko/archive?id=${id}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Gagal memuat risiko");
      setArchiveItem(result); setArchiveAction(action); setArchiveReason(""); setArchiveConfirm(""); setArchiveOpen(true);
    } catch (error: any) { notifications.show({ title: "Gagal membuka arsip", message: error.message, color: "red" }); }
  };

  const submitArchive = async () => {
    if (!archiveItem) return;
    setArchiveSubmitting(true);
    try {
      const response = await fetch("/api/identifikasi-risiko/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: archiveAction, id: archiveItem.id, reason: archiveReason.trim(), confirmId: archiveConfirm.trim() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Aksi gagal");
      setArchiveOpen(false); await refresh();
      notifications.show({ title: "Berhasil", message: archiveAction === "archive" ? "Risiko diarsipkan." : archiveAction === "restore" ? "Risiko dipulihkan." : "Risiko dihapus permanen.", color: "green" });
    } catch (error: any) { notifications.show({ title: "Aksi gagal", message: error.message, color: "red" }); }
    finally { setArchiveSubmitting(false); }
  };

  const save = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    setSaving(true);
    setSaveProgress(0);
    try {
      const values = sheet.getMaxRows() > 1
        ? sheet.getRange(`A2:K${sheet.getMaxRows()}`).getValues() as unknown[][]
        : [];
      const pending: { kind: "create" | "update"; index: number; item: any; row: string[] }[] = [];
      const lists = referenceLists;
      for (let index = 0; index < values.length; index++) {
        const row = normalizeRow(values[index]);
        const risiko = row[3];
        const id = rowIdsRef.current[index];
        if (id && savedRowsRef.current.some((saved, savedIndex) => savedIndex !== index && saved[3] && saved[3] === risiko && saved.every((cell, column) => cell === row[column]))) {
          throw new Error("Susunan baris berubah melalui menu spreadsheet. Muat ulang halaman lalu gunakan tombol Tambah Risiko agar ID tetap tepat.");
        }
        if (!id && row.slice(0, 10).some(Boolean)) {
          const skipped = row.slice(1, 10).findIndex((value, column) => value && !row[column]);
          if (skipped >= 0) throw new Error(`Baris ${index + 2} harus diisi berurutan dari Sasaran sampai Dampak. Lengkapi ${headers[skipped]} terlebih dahulu.`);
        }
        if (!risiko) {
          if (id) throw new Error(`Risiko pada baris ${index + 1} wajib diisi. Penghapusan risiko gunakan fitur arsip/hapus.`);
          continue;
        }
        if (id && row.every((value, column) => value === savedRowsRef.current[index]?.[column])) continue;
        const selectedSasaran = findByName(lists.sasaran, row[0]);
        const selectedKegiatan = lists.kegiatan.find((item) => item.nama === row[1] && (!selectedSasaran || !item.sasaranId || item.sasaranId === selectedSasaran.id));
        const selectedProses = lists.prosesBisnis.find((item) => item.nama === row[2] && (!selectedKegiatan || !item.kegiatanId || item.kegiatanId === selectedKegiatan.id));
        if (row[0] && !selectedSasaran) throw new Error(`Sasaran pada baris ${index + 1} tidak ada dalam daftar pilihan`);
        if (row[1] && !selectedKegiatan) throw new Error(`Kegiatan pada baris ${index + 1} tidak sesuai dengan Sasaran yang dipilih`);
        if (row[2] && !selectedProses) throw new Error(`Proses Bisnis pada baris ${index + 1} tidak sesuai dengan Kegiatan yang dipilih`);
        const required: [string, any][] = [["Jenis Risiko", findByName(lists.jenisRisiko, String(row[4] ?? ""))], ["Sumber Risiko", findByName(lists.sumberRisiko, String(row[5] ?? ""))], ["Kategori", findByName(lists.kategoriRisiko, String(row[6] ?? ""))], ["Area Dampak", findByName(lists.areaDampak, String(row[7] ?? ""))]];
        const missing = required.find(([, value]) => !value);
        if (missing) throw new Error(`Kolom ${missing[0]} pada baris ${index + 1} belum valid`);
        const payload = {
          risiko, jenisRisikoId: required[0][1].id, sumberRisikoId: required[1][1].id, kategoriRisikoId: required[2][1].id, areaDampakId: required[3][1].id,
          ...(selectedSasaran?.id ? { sasaranId: selectedSasaran.id } : {}), ...(selectedKegiatan?.id ? { kegiatanId: selectedKegiatan.id, ...(selectedKegiatan.unitKerjaId ? { unitKerjaId: selectedKegiatan.unitKerjaId } : {}) } : {}), ...(selectedProses?.id ? { prosesBisnisId: selectedProses.id } : {}),
          penyebab: String(row[8] ?? "") || null, dampak: String(row[9] ?? "") || null, tahun: Number(row[10]) || new Date().getFullYear(),
        };
        pending.push({ kind: id ? "update" : "create", index, item: id ? { id, data: payload } : { data: payload }, row });
      }
      if (!pending.length) { notifications.show({ title: "Tidak ada perubahan", message: "Tidak ada baris yang perlu disimpan", color: "blue" }); return; }
      for (let offset = 0; offset < pending.length; offset += 25) {
        const chunk = pending.slice(offset, offset + 25);
        const response = await fetch("/api/identifikasi-risiko/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creates: chunk.filter((entry) => entry.kind === "create").map((entry) => entry.item), updates: chunk.filter((entry) => entry.kind === "update").map((entry) => entry.item) }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const details = Object.entries(result?.details ?? {}).flatMap(([field, messages]) => Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : []);
          throw new Error(details.length ? details.join("; ") : result?.error ?? "Gagal menyimpan data");
        }
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
    const optionLists = [referenceLists.sasaran.map((x: any) => x.nama), referenceLists.kegiatan.map((x: any) => x.nama), referenceLists.prosesBisnis.map((x: any) => x.nama), [], referenceLists.jenisRisiko.map((x: any) => x.nama), referenceLists.sumberRisiko.map((x: any) => x.nama), referenceLists.kategoriRisiko.map((x: any) => x.nama), referenceLists.areaDampak.map((x: any) => x.nama)];
    dropdownColumns.forEach((column) => { const options = optionLists[column]; if (!options?.length) return; const letter = String.fromCharCode(65 + column); const rule = univerAPI.newDataValidation().requireValueInList(options, false, true).setOptions({ showDropDown: true, showErrorMessage: true, error: "Pilih nilai dari daftar." }).build(); validationRulesRef.current[column] = rule; sheet.getRange(`${letter}2:${letter}${values.length}`).setDataValidation(rule); });
    sheet.autoResizeRows(1, values.length - 1);
    setSheetReady(true);
  }, [loading, rows, tahunDari, referenceLists, sasaran.query?.isPending, kegiatan.query?.isPending, prosesBisnis.query?.isPending, jenisRisiko.query?.isPending, sumberRisiko.query?.isPending, kategoriRisiko.query?.isPending, areaDampak.query?.isPending]);

  useEffect(() => () => {
    sheetRef.current = null;
    univerRef.current?.dispose();
    univerRef.current = null;
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (hasUnsavedChanges()) event.preventDefault(); };
    const onSave = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (!saving) void save(); } };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onSave, true);
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); window.removeEventListener("keydown", onSave, true); };
  });

  if (loading) return <Loader />;
  return <Stack gap="md">
    <Group justify="space-between"><Box><Text size="xl" fw={700}>{view === "active" ? "Identifikasi Risiko" : "Arsip Risiko"}</Text><Text size="sm" c="dimmed">Kelola risiko langsung di tabel. Periode {tahunDari === tahunSampai ? tahunDari : `${tahunDari}–${tahunSampai}`}.</Text></Box><SegmentedControl value={view} onChange={(value) => { if (hasUnsavedChanges()) { notifications.show({ title: "Perubahan belum disimpan", message: "Simpan perubahan sebelum membuka arsip.", color: "orange" }); return; } setView(value); }} data={[{ value: "active", label: "Risiko Aktif" }, { value: "archived", label: "Arsip" }]} /></Group>
    {view === "active" && <Box style={{ position: "sticky", top: 60, zIndex: 10, background: "var(--mantine-color-body)", paddingBlock: 8, borderBottom: "1px solid var(--mantine-color-default-border)" }}><Group gap="xs" wrap="wrap">
      <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addRow} disabled={!sheetReady}>Tambah Risiko</Button>
      <Button variant="light" color="gray" onClick={jumpIncomplete} disabled={!sheetReady}>Lanjutkan Data Belum Lengkap</Button>
      <Button variant="light" color="violet" leftSection={<IconSparkles size={16} />} onClick={() => { setAssistSuggestion(null); setAssistOpen(true); }}>Bantu Isi dengan AI</Button>
      <Button variant="light" leftSection={<IconDatabase size={16} />} onClick={() => setBankOpen(true)}>Cari dari Bank Risiko</Button>
      <Button variant="light" color="indigo" leftSection={<IconDownload size={16} />} onClick={downloadTemplate}>Unduh Template</Button>
      <FileButton accept=".xlsx,.xlsm,.xls,.xlsb,.csv" onChange={importExcel}>{(props) => <Button {...props} variant="light" color="green" leftSection={<IconUpload size={16} />} loading={importing}>Import Excel</Button>}</FileButton>
      {canArchive && <Button variant="light" color="orange" leftSection={<IconArchive size={16} />} onClick={() => { const selected = sheetRef.current?.getActiveRange()?.getRow(); if (selected == null || selected < 1) { notifications.show({ title: "Pilih risiko", message: "Pilih sel pada baris risiko dahulu.", color: "blue" }); return; } const id = rowIdsRef.current[selected - 1]; if (!id) { const sheet = sheetRef.current; sheet.deleteRows(selected, 1); rowIdsRef.current.splice(selected - 1, 1); savedRowsRef.current.splice(selected - 1, 1); notifications.show({ title: "Draf dihapus", message: "Baris baru dibuang.", color: "green" }); return; } void openArchive(id, "archive"); }}>Arsipkan Risiko</Button>}
      <Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} disabled={!sheetReady} onClick={save}>{saving && saveProgress ? `Tersimpan ${saveProgress} baris...` : "Simpan Perubahan"}</Button>
      {dirtyCount > 0 && <Badge color="orange">{dirtyCount} baris belum disimpan</Badge>}
    </Group><Group mt="xs" gap="xs"><TextInput ref={searchInputRef} leftSection={<IconSearch size={16} />} placeholder="Cari & tandai sel..." value={search} onChange={(event) => setSearch(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); nextMatch(event.shiftKey ? -1 : 1); } }} style={{ flex: 1 }} /><Button variant="default" disabled={!matches.length} onClick={() => nextMatch(-1)}>Sebelumnya</Button><Button variant="default" disabled={!matches.length} onClick={() => nextMatch(1)}>Berikutnya</Button>{search.trim() && <Text size="sm" c="dimmed">{matches.length ? `${matchIndex + 1}/${matches.length}` : "Tidak ada hasil"}</Text>}</Group></Box>}
    <Box ref={containerRef} style={{ display: view === "active" ? "block" : "none", height: "720px", width: "100%", border: "1px solid var(--mantine-color-default-border)" }} />
    {view === "archived" && <Stack><TextInput placeholder="Cari risiko arsip..." value={search} onChange={(event) => setSearch(event.currentTarget.value)} /><Table striped withTableBorder><Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Risiko</Table.Th><Table.Th>Tahun</Table.Th><Table.Th>Alasan</Table.Th><Table.Th>Aksi</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{(archived.result?.data ?? []).filter((item: any) => String(item.risiko).toLowerCase().includes(search.toLowerCase())).map((item: any) => <Table.Tr key={item.id}><Table.Td>{item.id}</Table.Td><Table.Td>{item.risiko}</Table.Td><Table.Td>{item.tahun}</Table.Td><Table.Td>{item.archiveReason || "-"}</Table.Td><Table.Td><Group gap="xs"><Button size="xs" variant="light" onClick={() => void openArchive(item.id, "restore")}>Pulihkan</Button>{isAdmin && <Button size="xs" color="red" variant="light" onClick={() => void openArchive(item.id, "permanent-delete")}>Hapus Permanen</Button>}</Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Stack>}
    <Modal opened={bankOpen} onClose={() => setBankOpen(false)} title="Cari dari Bank Risiko" size="xl"><Stack><Group><TextInput value={bankQuery} onChange={(event) => setBankQuery(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchBank(); }} placeholder="Ketik kata kunci risiko..." style={{ flex: 1 }} /><Button loading={bankLoading} onClick={searchBank}>Cari</Button></Group>{bankMethod && <Text size="sm">Metode pencarian: {bankMethod === "semantic" ? "Semantik" : "Teks"}</Text>}{bankResults.map((risk) => <Group key={risk.id} justify="space-between" align="start" p="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Box style={{ flex: 1 }}><Text size="sm">{risk.risiko}</Text><Badge size="xs">{risk.kategori_risiko_nama}</Badge></Box><Button size="xs" onClick={() => void importBankRisk(risk)}>Tambahkan</Button></Group>)}</Stack></Modal>
    <Modal opened={assistOpen} onClose={() => setAssistOpen(false)} title="Bantu Isi dengan AI" size="lg"><Stack><Textarea label="Ceritakan kondisi atau risiko" minRows={4} value={assistDescription} onChange={(event) => setAssistDescription(event.currentTarget.value)} /><Button loading={assistLoading} onClick={suggestRisk}>Buat Saran</Button>{assistSuggestion && <><Text fw={600}>{assistSuggestion.risiko}</Text><Text size="sm">Penyebab: {assistSuggestion.penyebab || "-"}</Text><Text size="sm">Dampak: {assistSuggestion.dampak || "-"}</Text><Button color="violet" onClick={applySuggestion}>Terapkan ke Baris Baru</Button><Select label="Level Kemungkinan Aktual" data={(levelKemungkinan.result?.data ?? []).map((item: any) => item.nama)} value={assistLikelihood} onChange={(value) => setAssistLikelihood(value || "")} /><Select label="Level Dampak Aktual" data={(levelDampak.result?.data ?? []).map((item: any) => item.nama)} value={assistImpact} onChange={(value) => setAssistImpact(value || "")} /><Textarea label="Pengendalian yang pernah dilakukan" value={assistControl} onChange={(event) => setAssistControl(event.currentTarget.value)} /><Select label="Efektivitas Pengendalian" clearable data={[{ value: "efektif", label: "Efektif" }, { value: "cukup_efektif", label: "Cukup Efektif" }, { value: "kurang_efektif", label: "Kurang Efektif" }, { value: "tidak_efektif", label: "Tidak Efektif" }]} value={assistEffectiveness} onChange={setAssistEffectiveness} /><Select label="Respons Risiko" data={[{ value: "mengurangi", label: "Mengurangi" }, { value: "menerima", label: "Menerima" }, { value: "menghindari", label: "Menghindari" }, { value: "mentransfer", label: "Mentransfer" }]} value={assistResponse} onChange={(value) => setAssistResponse(value || "mengurangi")} /><Button color="green" loading={assistWorkflowLoading} onClick={createThroughEvaluation}>Simpan sampai Evaluasi</Button></>}</Stack></Modal>
    <Modal opened={archiveOpen} onClose={() => setArchiveOpen(false)} title={archiveAction === "archive" ? "Arsipkan Risiko" : archiveAction === "restore" ? "Pulihkan Risiko" : "Hapus Risiko Permanen"}><Stack><Alert color={archiveAction === "permanent-delete" ? "red" : "orange"}>{archiveAction === "permanent-delete" ? "Risiko dan seluruh data terkait akan dihapus permanen." : "Data terkait tetap tersimpan dan dapat dipulihkan."}</Alert><Text fw={600}>#{archiveItem?.id} · {archiveItem?.risiko}</Text>{archiveItem && <Group><Badge>Analisis: {archiveItem.hasAnalisis ? "Ada" : "Tidak"}</Badge><Badge>Evaluasi: {archiveItem.hasEvaluasi ? "Ada" : "Tidak"}</Badge><Badge>Rencana: {archiveItem.hasRencana ? "Ada" : "Tidak"}</Badge><Badge>{archiveItem.dokumenCount} dokumen</Badge></Group>}{archiveAction !== "restore" && <Textarea label="Alasan" required value={archiveReason} onChange={(event) => setArchiveReason(event.currentTarget.value)} />}{archiveAction === "permanent-delete" && <TextInput label={`Ketik ID ${archiveItem?.id} untuk konfirmasi`} value={archiveConfirm} onChange={(event) => setArchiveConfirm(event.currentTarget.value)} />}<Button color={archiveAction === "permanent-delete" ? "red" : "blue"} loading={archiveSubmitting} disabled={(archiveAction !== "restore" && !archiveReason.trim()) || (archiveAction === "permanent-delete" && archiveConfirm !== String(archiveItem?.id))} onClick={submitArchive}>Konfirmasi</Button></Stack></Modal>
    <Modal opened={Boolean(importResult)} onClose={() => setImportResult(null)} title="Hasil Import Excel"><Stack><Text>{importResult?.created ?? 0} dibuat · {importResult?.updated ?? 0} diperbarui · {importResult?.failed ?? 0} gagal</Text>{importResult?.details?.filter((item: any) => item.error).map((item: any, index: number) => <Text size="sm" key={index}>Baris {item.row}: {item.error}</Text>)}</Stack></Modal>
  </Stack>;
}
