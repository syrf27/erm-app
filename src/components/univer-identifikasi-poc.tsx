"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Box, Button, FileButton, Group, Loader, Menu, Modal, SegmentedControl, Select, Stack, Switch, Table, Text, Textarea, TextInput } from "@mantine/core";
import { useList } from "@refinedev/core";
import { notifications } from "@mantine/notifications";
import { useYear } from "@/lib/year-context";
import { IconArchive, IconDatabase, IconDeviceFloppy, IconDots, IconDownload, IconPlus, IconSearch, IconSparkles, IconUpload } from "@tabler/icons-react";
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
export type RiskRegisterStage = "identifikasi" | "analisis" | "evaluasi" | "rencana";

const headers = [
  "Unit Kerja", "Sasaran", "Kegiatan", "Proses Bisnis", "Pernyataan Risiko", "Jenis Risiko", "Sumber Risiko", "Kategori", "Area Dampak", "Penyebab", "Dampak", "Tahun",
  "Aktual: Level Kemungkinan", "Aktual: Level Dampak", "Aktual: Besaran Risiko", "Aktual: Level Risiko", "Pengendalian: Uraian", "Pengendalian: Keefektifan",
  "Residual: Level Kemungkinan", "Residual: Level Dampak", "Residual: Besaran Risiko", "Residual: Level Risiko", "Selera Risiko", "Respon Risiko", "Prioritas Risiko",
  "Harapan: Level Kemungkinan", "Harapan: Level Dampak", "Harapan: Besaran Risiko", "Harapan: Level Risiko", "Rencana Tindak Penanganan", "Jenis Penanganan", "Target Output", "Target Waktu", "Penanggung Jawab",
];
const IDENT_END = 11;
const ANALISIS_START = 12;
const ANALISIS_END = 17;
const EVALUASI_START = 18;
const EVALUASI_END = 24;
const RENCANA_START = 25;
const RENCANA_END = 33;
const dropdownColumns = [0, 1, 2, 3, 5, 6, 7, 8, 12, 13, 17, 18, 19, 23, 25, 26, 30, 33];
const computedColumns = [14, 15, 20, 21, 22, 24, 27, 28];
const stageRanges: Record<RiskRegisterStage, { start: number; end: number }> = {
  identifikasi: { start: 0, end: IDENT_END },
  analisis: { start: ANALISIS_START, end: EVALUASI_END },
  evaluasi: { start: EVALUASI_START, end: EVALUASI_END },
  rencana: { start: RENCANA_START, end: RENCANA_END },
};
const stageLabels: Record<RiskRegisterStage, string> = {
  identifikasi: "Identifikasi Risiko",
  analisis: "Analisis Risiko",
  evaluasi: "Evaluasi Risiko",
  rencana: "Rencana Penanganan",
};
const columnLetter = (index: number) => {
  let result = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  return result;
};
const label = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  const item = value as Record<string, unknown>;
  return String(item.nama ?? item.name ?? item.label ?? "");
};
function matrixResult(lists: Record<string, any[]>, kemungkinanId?: number | null, dampakId?: number | null) {
  const matrix = lists.matriks?.find((entry) => entry.levelKemungkinanId === kemungkinanId && entry.levelDampakId === dampakId);
  const level = lists.levelRisiko?.find((entry) => entry.id === matrix?.levelRisikoId) ?? matrix?.levelRisiko;
  return { besaran: matrix?.besaran ?? "", level: label(level) };
}

function toRow(item: RiskRecord, lists: Record<string, any[]>, stageData: { analisis?: RiskRecord; evaluasi?: RiskRecord; rencana?: RiskRecord; selera?: number | null }) {
  const byId = (key: string, id: unknown) => lists[key]?.find((entry) => entry.id === id);
  const proses = item.prosesBisnis ?? byId("prosesBisnis", item.prosesBisnisId);
  const kegiatan = item.kegiatan ?? byId("kegiatan", item.kegiatanId) ?? byId("kegiatan", proses?.kegiatanId);
  const sasaran = item.sasaran ?? byId("sasaran", item.sasaranId) ?? byId("sasaran", kegiatan?.sasaranId);
  const unitKerja = item.unitKerja ?? byId("unitKerja", item.unitKerjaId) ?? byId("unitKerja", kegiatan?.unitKerjaId);
  const rel = (key: string, idKey: string) => label(item[key] ?? byId(key, item[idKey]));
  const analisis = stageData.analisis ?? {};
  const evaluasi = stageData.evaluasi ?? {};
  const rencana = stageData.rencana ?? {};
  const aktual = matrixResult(lists, analisis.levelKemungkinanId, analisis.levelDampakId);
  const residual = matrixResult(lists, evaluasi.residualLevelKemungkinanId, evaluasi.residualLevelDampakId);
  const harapan = matrixResult(lists, rencana.targetResidualLevelKemungkinanId, rencana.targetResidualLevelDampakId);
  const responseLabels: Record<string, string> = { menerima: "Menerima Risiko", menghindari: "Menghindari Risiko", mengurangi: "Mengurangi Risiko", mentransfer: "Mengalihkan Risiko" };
  const treatmentLabels: Record<string, string> = { pencegahan: "Pencegahan", perbaikan: "Perbaikan" };
  const effectivenessLabels: Record<string, string> = { efektif: "Efektif", cukup_efektif: "Cukup Efektif", kurang_efektif: "Kurang Efektif", tidak_efektif: "Tidak Efektif" };
  return [
    label(unitKerja), label(sasaran), label(kegiatan), label(proses), label(item.risiko), rel("jenisRisiko", "jenisRisikoId"), rel("sumberRisiko", "sumberRisikoId"), rel("kategoriRisiko", "kategoriRisikoId"), rel("areaDampak", "areaDampakId"), label(item.penyebab), label(item.dampak), label(item.tahun),
    label(analisis.levelKemungkinan ?? byId("levelKemungkinan", analisis.levelKemungkinanId)), label(analisis.levelDampak ?? byId("levelDampak", analisis.levelDampakId)), label(aktual.besaran), aktual.level, label(analisis.pengendalianUraian), effectivenessLabels[analisis.pengendalianEfektivitas] ?? label(analisis.pengendalianEfektivitas),
    label(evaluasi.residualLevelKemungkinan ?? byId("levelKemungkinan", evaluasi.residualLevelKemungkinanId)), label(evaluasi.residualLevelDampak ?? byId("levelDampak", evaluasi.residualLevelDampakId)), label(residual.besaran), residual.level, label(stageData.selera), responseLabels[evaluasi.responRisiko] ?? label(evaluasi.responRisiko), label(evaluasi.prioritasRisiko),
    label(rencana.targetResidualLevelKemungkinan ?? byId("levelKemungkinan", rencana.targetResidualLevelKemungkinanId)), label(rencana.targetResidualLevelDampak ?? byId("levelDampak", rencana.targetResidualLevelDampakId)), label(harapan.besaran), harapan.level, label(rencana.rencanaTidakPenanganan), treatmentLabels[rencana.jenisPenanganan] ?? label(rencana.jenisPenanganan), label(rencana.targetOutput), label(rencana.targetWaktu), label(rencana.penanggungJawab),
  ];
}
const findByName = (list: any[], name: string) => list.find((item) => item.nama === name);
const normalizeRow = (row: unknown[] = []) => headers.map((_, index) => String(row[index] ?? "").trim());
type SearchMatch = { row: number; column: number };

export function UniverIdentifikasiPoc({ initialStage = "identifikasi" }: { initialStage?: RiskRegisterStage }) {
  const { tahunDari, tahunSampai } = useYear();
  const [revision, setRevision] = useState(0);
  return <UniverIdentifikasiSheet key={`${tahunDari}-${tahunSampai}-${revision}`} initialStage={initialStage} tahunDari={tahunDari} tahunSampai={tahunSampai} onReload={() => setRevision((value) => value + 1)} />;
}

function UniverIdentifikasiSheet({ initialStage, tahunDari, tahunSampai, onReload }: { initialStage: RiskRegisterStage; tahunDari: number; tahunSampai: number; onReload: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<any>(null);
  const univerRef = useRef<{ dispose: () => void } | null>(null);
  const savedRowsRef = useRef<string[][]>([]);
  const rowIdsRef = useRef<(number | undefined)[]>([]);
  const analysisIdsRef = useRef<(number | undefined)[]>([]);
  const evaluationIdsRef = useRef<(number | undefined)[]>([]);
  const treatmentIdsRef = useRef<(number | undefined)[]>([]);
  const validationRulesRef = useRef<Record<number, any>>({});
  const sheetEventsRef = useRef<{ dispose: () => void }[]>([]);
  const updatingDerivedRef = useRef(false);
  const stageRef = useRef<RiskRegisterStage>(initialStage);
  const fullRegisterRef = useRef(false);
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
  const unitKerja = useList({ resource: "unit-kerja", pagination: { pageSize: 1000 } });
  const levelKemungkinan = useList({ resource: "level-kemungkinan", pagination: { pageSize: 1000 } });
  const levelDampak = useList({ resource: "level-dampak", pagination: { pageSize: 1000 } });
  const levelRisiko = useList({ resource: "level-risiko", pagination: { pageSize: 1000 } });
  const matriks = useList({ resource: "matriks-analisis-risiko", pagination: { pageSize: 1000 } });
  const analisisRecords = useList({ resource: "analisis-risiko", pagination: { pageSize: 10000 } });
  const evaluasiRecords = useList({ resource: "evaluasi-risiko", pagination: { pageSize: 10000 } });
  const rencanaRecords = useList({ resource: "rencana-penanganan", pagination: { pageSize: 10000 } });
  const seleraRisiko = useList({ resource: "selera-risiko", pagination: { pageSize: 1000 } });
  const teams = useList({ resource: "teams", pagination: { pageSize: 1000 } });
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [sheetReady, setSheetReady] = useState(false);
  const [stage, setStage] = useState<RiskRegisterStage>(initialStage);
  const [fullRegister, setFullRegister] = useState(false);
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
    jenisRisiko: (jenisRisiko.result?.data ?? []) as any[], sumberRisiko: (sumberRisiko.result?.data ?? []) as any[], kategoriRisiko: (kategoriRisiko.result?.data ?? []) as any[], areaDampak: (areaDampak.result?.data ?? []) as any[], unitKerja: (unitKerja.result?.data ?? []) as any[],
    levelKemungkinan: (levelKemungkinan.result?.data ?? []) as any[], levelDampak: (levelDampak.result?.data ?? []) as any[], levelRisiko: (levelRisiko.result?.data ?? []) as any[], matriks: (matriks.result?.data ?? []) as any[], teams: (teams.result?.data ?? []) as any[],
  }), [sasaran.result?.data, kegiatan.result?.data, prosesBisnis.result?.data, jenisRisiko.result?.data, sumberRisiko.result?.data, kategoriRisiko.result?.data, areaDampak.result?.data, unitKerja.result?.data, levelKemungkinan.result?.data, levelDampak.result?.data, levelRisiko.result?.data, matriks.result?.data, teams.result?.data]);
  const analisisByRisk = useMemo(() => new Map((analisisRecords.result?.data ?? []).map((item: any) => [item.identifikasiRisikoId, item])), [analisisRecords.result?.data]);
  const evaluasiByRisk = useMemo(() => new Map((evaluasiRecords.result?.data ?? []).map((item: any) => [item.identifikasiRisikoId, item])), [evaluasiRecords.result?.data]);
  const rencanaByRisk = useMemo(() => new Map((rencanaRecords.result?.data ?? []).map((item: any) => [item.identifikasiRisikoId, item])), [rencanaRecords.result?.data]);
  const seleraNilai = useMemo(() => {
    const values = [...(seleraRisiko.result?.data ?? [])].sort((a: any, b: any) => Number(b.id) - Number(a.id));
    const value = Number((values[0] as any)?.nilai);
    return Number.isFinite(value) ? value : null;
  }, [seleraRisiko.result?.data]);
  const rows = useMemo(() => data.map((item) => toRow(item, referenceLists, { analisis: analisisByRisk.get(item.id), evaluasi: evaluasiByRisk.get(item.id), rencana: rencanaByRisk.get(item.id), selera: seleraNilai })), [data, referenceLists, analisisByRisk, evaluasiByRisk, rencanaByRisk, seleraNilai]);
  const loading = [records, sasaran, kegiatan, prosesBisnis, jenisRisiko, sumberRisiko, kategoriRisiko, areaDampak, unitKerja, levelKemungkinan, levelDampak, levelRisiko, matriks, analisisRecords, evaluasiRecords, rencanaRecords, seleraRisiko, teams].some((query) => query.query?.isPending);
  const archived = useList({ resource: "identifikasi-risiko/archive", pagination: { pageSize: 1000 }, queryOptions: { enabled: view === "archived" }, filters: [{ field: "tahun", operator: "gte", value: tahunDari }, { field: "tahun", operator: "lte", value: tahunSampai }] });
  const lastColumn = columnLetter(headers.length - 1);
  const readRows = () => { const sheet = sheetRef.current; return sheet && sheet.getMaxRows() > 1 ? sheet.getRange(`A2:${lastColumn}${sheet.getMaxRows()}`).getValues() as unknown[][] : []; };
  const hasUnsavedChanges = () => readRows().some((value, index) => {
    const row = normalizeRow(value);
    return rowIdsRef.current[index] ? row.some((cell, column) => cell !== savedRowsRef.current[index]?.[column]) : row.slice(0, 11).some(Boolean);
  });
  useEffect(() => {
    if (!sheetReady) return;
    const timer = window.setInterval(() => setDirtyCount(readRows().filter((value, index) => {
      const row = normalizeRow(value);
      return rowIdsRef.current[index] ? row.some((cell, column) => cell !== savedRowsRef.current[index]?.[column]) : row.slice(0, 11).some(Boolean);
    }).length), 1000);
    return () => window.clearInterval(timer);
  }, [sheetReady]);
  const refresh = async () => {
    await Promise.all([records.query?.refetch(), analisisRecords.query?.refetch(), evaluasiRecords.query?.refetch(), rencanaRecords.query?.refetch(), archived.query?.refetch()]);
    onReload();
  };

  const goToMatch = (match: SearchMatch) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const cell = sheet.getRange(`${columnLetter(match.column)}${match.row + 1}`);
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
        ? sheet.getRange(`A2:${lastColumn}${sheet.getMaxRows()}`).getValues() as unknown[][]
        : [];
      const needle = search.trim().toLocaleLowerCase();
      const found: SearchMatch[] = [];
      values.forEach((row, index) => row.forEach((cell, column) => {
        const visibleInFocus = stage === "identifikasi"
          ? column <= IDENT_END
          : stage === "rencana"
            ? column === 4 || (column >= EVALUASI_START && column <= RENCANA_END)
            : column === 4 || (column >= stageRanges[stage].start && column <= stageRanges[stage].end);
        if (column < headers.length && (fullRegister || visibleInFocus) && String(cell ?? "").toLocaleLowerCase().includes(needle)) {
          found.push({ row: index + 1, column });
        }
      }));
      setMatches(found);
      setMatchIndex(0);
      if (found[0]) goToMatch(found[0]);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, sheetReady, stage, fullRegister]);

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

  useEffect(() => {
    const openAssistant = () => {
      setView("active");
      setStage("identifikasi");
      setAssistSuggestion(null);
      setAssistOpen(true);
    };
    window.addEventListener("open-risk-ai-assistant", openAssistant);
    if (new URLSearchParams(window.location.search).get("openAiAssist") === "1") openAssistant();
    return () => window.removeEventListener("open-risk-ai-assistant", openAssistant);
  }, []);

  const nextMatch = (direction: number) => {
    if (!matches.length) return;
    const next = (matchIndex + direction + matches.length) % matches.length;
    setMatchIndex(next);
    goToMatch(matches[next]);
  };

  const switchStage = (nextStage: RiskRegisterStage) => {
    setView("active");
    setStage(nextStage);
    if (fullRegister && sheetRef.current) {
      const target = stageRanges[nextStage].start;
      sheetRef.current.scrollToCell(1, target);
      sheetRef.current.setActiveRange(sheetRef.current.getRange(`${columnLetter(target)}2`));
    }
  };

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { fullRegisterRef.current = fullRegister; }, [fullRegister]);

  const addRow = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.insertRows(1, 1);
    rowIdsRef.current.splice(0, 0, undefined);
    analysisIdsRef.current.splice(0, 0, undefined);
    evaluationIdsRef.current.splice(0, 0, undefined);
    treatmentIdsRef.current.splice(0, 0, undefined);
    savedRowsRef.current.splice(0, 0, []);
    sheet.getRange("L2").setValue(String(tahunDari));
    sheet.getRange(`A2:${lastColumn}2`).setWrap(true);
    dropdownColumns.forEach((column) => { const rule = validationRulesRef.current[column]; if (rule) sheet.getRange(`${columnLetter(column)}2`).setDataValidation(rule); });
    sheet.autoResizeRows(1, 1);
    sheet.setActiveRange(sheet.getRange("A2"));
    sheet.scrollToCell(1, 0);
  };

  const jumpIncomplete = () => {
    const index = readRows().findIndex((value) => { const row = normalizeRow(value); return Boolean(row[4]) && [1, 2, 3, 5, 6, 7, 8].some((column) => !row[column]); });
    if (index < 0) { notifications.show({ title: "Data lengkap", message: "Tidak ada risiko yang sedang menunggu kelengkapan.", color: "blue" }); return; }
    const sheet = sheetRef.current;
    const column = [1, 2, 3, 5, 6, 7, 8].find((item) => !normalizeRow(readRows()[index])[item]) ?? 1;
    sheet.setActiveRange(sheet.getRange(`${columnLetter(column)}${index + 2}`));
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
    const values = ["", resolve(assistSuggestion.sasaran, referenceLists.sasaran), resolve(assistSuggestion.kegiatan, referenceLists.kegiatan), resolve(assistSuggestion.prosesBisnis, referenceLists.prosesBisnis), assistSuggestion.risiko ?? "", resolve(assistSuggestion.jenisRisiko, referenceLists.jenisRisiko), resolve(assistSuggestion.sumberRisiko, referenceLists.sumberRisiko), resolve(assistSuggestion.kategori, referenceLists.kategoriRisiko), resolve(assistSuggestion.areaDampak, referenceLists.areaDampak), assistSuggestion.penyebab ?? "", assistSuggestion.dampak ?? "", String(tahunDari), ...Array(headers.length - 12).fill("")];
    sheet.getRange(`A2:${lastColumn}2`).setValues([values]);
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

  const archiveSelectedRisk = () => {
    const selected = sheetRef.current?.getActiveRange()?.getRow();
    if (selected == null || selected < 1) {
      notifications.show({ title: "Pilih risiko", message: "Pilih sel pada baris risiko dahulu.", color: "blue" });
      return;
    }
    const id = rowIdsRef.current[selected - 1];
    if (!id) {
      const sheet = sheetRef.current;
      sheet.deleteRows(selected, 1);
      rowIdsRef.current.splice(selected - 1, 1);
      analysisIdsRef.current.splice(selected - 1, 1);
      evaluationIdsRef.current.splice(selected - 1, 1);
      treatmentIdsRef.current.splice(selected - 1, 1);
      savedRowsRef.current.splice(selected - 1, 1);
      notifications.show({ title: "Draf dihapus", message: "Baris baru dibuang.", color: "green" });
      return;
    }
    void openArchive(id, "archive");
  };

  const save = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    setSaving(true);
    setSaveProgress(0);
    try {
      const values = sheet.getMaxRows() > 1
        ? sheet.getRange(`A2:${lastColumn}${sheet.getMaxRows()}`).getValues() as unknown[][]
        : [];
      const lists = referenceLists;
      const rows = values.map(normalizeRow);
      const changed = (row: string[], index: number, columns: number[]) => columns.some((column) => row[column] !== savedRowsRef.current[index]?.[column]);
      const findMatrix = (kemungkinan: any, dampak: any) => lists.matriks.find((entry) => entry.levelKemungkinanId === kemungkinan?.id && entry.levelDampakId === dampak?.id);
      const sendBatch = async (resource: string, entries: { kind: "create" | "update"; index: number; item: any }[], ids: (number | undefined)[]) => {
        for (let offset = 0; offset < entries.length; offset += 25) {
          const chunk = entries.slice(offset, offset + 25);
          const response = await fetch(`/api/${resource}/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creates: chunk.filter((entry) => entry.kind === "create").map((entry) => entry.item), updates: chunk.filter((entry) => entry.kind === "update").map((entry) => entry.item) }) });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            const details = Object.entries(result?.details ?? {}).flatMap(([field, messages]) => Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : []);
            throw new Error(details.length ? details.join("; ") : result?.error ?? `Gagal menyimpan ${resource}`);
          }
          const created = chunk.filter((entry) => entry.kind === "create");
          if (created.length && (!Array.isArray(result.created) || result.created.length !== created.length)) throw new Error(`ID baru untuk ${resource} tidak diterima lengkap`);
          let createdIndex = 0;
          chunk.forEach((entry) => { if (entry.kind === "create") ids[entry.index] = result.created?.[createdIndex++]?.id; });
        }
      };

      const identificationEntries: { kind: "create" | "update"; index: number; item: any }[] = [];
      for (let index = 0; index < values.length; index++) {
        const row = rows[index];
        const risiko = row[4];
        const id = rowIdsRef.current[index];
        if (id && savedRowsRef.current.some((saved, savedIndex) => savedIndex !== index && saved[4] && saved[4] === risiko && saved.every((cell, column) => cell === row[column]))) {
          throw new Error("Susunan baris berubah melalui menu spreadsheet. Muat ulang halaman lalu gunakan tombol Tambah Risiko agar ID tetap tepat.");
        }
        if (!risiko) {
          if (id) throw new Error(`Risiko pada baris ${index + 1} wajib diisi. Penghapusan risiko gunakan fitur arsip/hapus.`);
          continue;
        }
        if (id && !changed(row, index, Array.from({ length: 12 }, (_, column) => column))) continue;
        const selectedUnit = findByName(lists.unitKerja, row[0]);
        const selectedSasaran = findByName(lists.sasaran, row[1]);
        const selectedKegiatan = lists.kegiatan.find((item) => item.nama === row[2] && (!selectedSasaran || !item.sasaranId || item.sasaranId === selectedSasaran.id));
        const selectedProses = lists.prosesBisnis.find((item) => item.nama === row[3] && (!selectedKegiatan || !item.kegiatanId || item.kegiatanId === selectedKegiatan.id));
        if (row[1] && !selectedSasaran) throw new Error(`Sasaran pada baris ${index + 2} tidak ada dalam daftar pilihan`);
        if (row[2] && !selectedKegiatan) throw new Error(`Kegiatan pada baris ${index + 2} tidak sesuai dengan Sasaran yang dipilih`);
        if (row[3] && !selectedProses) throw new Error(`Proses Bisnis pada baris ${index + 2} tidak sesuai dengan Kegiatan yang dipilih`);
        const required: [string, any][] = [["Jenis Risiko", findByName(lists.jenisRisiko, row[5])], ["Sumber Risiko", findByName(lists.sumberRisiko, row[6])], ["Kategori", findByName(lists.kategoriRisiko, row[7])], ["Area Dampak", findByName(lists.areaDampak, row[8])]];
        const missing = required.find(([, value]) => !value);
        if (missing) throw new Error(`Kolom ${missing[0]} pada baris ${index + 2} belum valid`);
        const payload = {
          risiko, jenisRisikoId: required[0][1].id, sumberRisikoId: required[1][1].id, kategoriRisikoId: required[2][1].id, areaDampakId: required[3][1].id,
          ...(selectedUnit?.id ? { unitKerjaId: selectedUnit.id } : selectedKegiatan?.unitKerjaId ? { unitKerjaId: selectedKegiatan.unitKerjaId } : {}), ...(selectedSasaran?.id ? { sasaranId: selectedSasaran.id } : {}), ...(selectedKegiatan?.id ? { kegiatanId: selectedKegiatan.id } : {}), ...(selectedProses?.id ? { prosesBisnisId: selectedProses.id } : {}),
          penyebab: row[9] || null, dampak: row[10] || null, tahun: Number(row[11]) || new Date().getFullYear(),
        };
        identificationEntries.push({ kind: id ? "update" : "create", index, item: id ? { id, data: payload } : { data: payload } });
      }
      if (identificationEntries.length) await sendBatch("identifikasi-risiko", identificationEntries, rowIdsRef.current);

      const analysisEntries: { kind: "create" | "update"; index: number; item: any }[] = [];
      const evaluationEntries: { kind: "create" | "update"; index: number; item: any }[] = [];
      const treatmentEntries: { kind: "create" | "update"; index: number; item: any }[] = [];
      rows.forEach((row, index) => {
        const riskId = rowIdsRef.current[index];
        if (!riskId) return;
        if (changed(row, index, [12, 13, 16, 17])) {
          const kemungkinan = findByName(lists.levelKemungkinan, row[12]);
          const dampak = findByName(lists.levelDampak, row[13]);
          const matrix = findMatrix(kemungkinan, dampak);
          const effectMap: Record<string, string> = { Efektif: "efektif", "Cukup Efektif": "cukup_efektif", "Kurang Efektif": "kurang_efektif", "Tidak Efektif": "tidak_efektif" };
          const payload = { identifikasiRisikoId: riskId, levelKemungkinanId: kemungkinan?.id, levelDampakId: dampak?.id, levelRisikoId: matrix?.levelRisikoId, pengendalianUraian: row[16] || null, pengendalianEfektivitas: (effectMap[row[17]] ?? row[17]) || null };
          const id = analysisIdsRef.current[index];
          analysisEntries.push({ kind: id ? "update" : "create", index, item: id ? { id, data: payload } : { data: payload } });
        }
        if (changed(row, index, [18, 19, 23, 24])) {
          const kemungkinan = findByName(lists.levelKemungkinan, row[18]);
          const dampak = findByName(lists.levelDampak, row[19]);
          const matrix = findMatrix(kemungkinan, dampak);
          const responseMap: Record<string, string> = { "Menerima Risiko": "menerima", "Menghindari Risiko": "menghindari", "Mengurangi Risiko": "mengurangi", "Mengalihkan Risiko": "mentransfer" };
          const payload = { identifikasiRisikoId: riskId, residualLevelKemungkinanId: kemungkinan?.id ?? null, residualLevelDampakId: dampak?.id ?? null, residualLevelRisikoId: matrix?.levelRisikoId ?? null, responRisiko: (responseMap[row[23]] ?? row[23]) || null, prioritasRisiko: row[24] ? Number(row[24]) : null };
          const id = evaluationIdsRef.current[index];
          evaluationEntries.push({ kind: id ? "update" : "create", index, item: id ? { id, data: payload } : { data: payload } });
        }
        if (changed(row, index, [25, 26, 29, 30, 31, 32, 33])) {
          const kemungkinan = findByName(lists.levelKemungkinan, row[25]);
          const dampak = findByName(lists.levelDampak, row[26]);
          const treatmentMap: Record<string, string> = { Pencegahan: "pencegahan", Perbaikan: "perbaikan" };
          const payload = { identifikasiRisikoId: riskId, targetResidualLevelKemungkinanId: kemungkinan?.id ?? null, targetResidualLevelDampakId: dampak?.id ?? null, rencanaTidakPenanganan: row[29] || null, jenisPenanganan: (treatmentMap[row[30]] ?? row[30]) || null, targetOutput: row[31] || null, targetWaktu: row[32] || null, penanggungJawab: row[33] || null };
          const id = treatmentIdsRef.current[index];
          treatmentEntries.push({ kind: id ? "update" : "create", index, item: id ? { id, data: payload } : { data: payload } });
        }
      });
      const totalPending = identificationEntries.length + analysisEntries.length + evaluationEntries.length + treatmentEntries.length;
      if (!totalPending) { notifications.show({ title: "Tidak ada perubahan", message: "Tidak ada baris yang perlu disimpan", color: "blue" }); return; }
      if (analysisEntries.length) await sendBatch("analisis-risiko", analysisEntries, analysisIdsRef.current);
      if (evaluationEntries.length) await sendBatch("evaluasi-risiko", evaluationEntries, evaluationIdsRef.current);
      if (treatmentEntries.length) await sendBatch("rencana-penanganan", treatmentEntries, treatmentIdsRef.current);
      rows.forEach((row, index) => {
        if (rowIdsRef.current[index]) savedRowsRef.current[index] = row;
        setSaveProgress(index + 1);
      });
      notifications.show({ title: "Tersimpan", message: `${totalPending} perubahan tahap berhasil disimpan ke database`, color: "green" });
    } catch (error: any) { notifications.show({ title: "Gagal menyimpan", message: error?.message ?? "Periksa kembali data", color: "red" }); } finally { setSaving(false); setSaveProgress(0); }
  };

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheetReady || !sheet) return;
    sheet.showColumns(0, headers.length);
    if (fullRegister) {
      // In the complete register, keep the identification context through Risk visible.
      sheet.setFrozenColumns(5);
      return;
    }
    if (stage === "identifikasi") {
      sheet.hideColumns(ANALISIS_START, headers.length - ANALISIS_START);
      sheet.setFrozenColumns(1);
      return;
    }
    const { start, end } = stageRanges[stage];
    if (stage === "rencana") {
      // Evaluation result is useful context while defining the target residual and RTP.
      sheet.hideColumns(0, 4);
      sheet.hideColumns(5, EVALUASI_START - 5);
      sheet.setFrozenColumns(4, 4);
      return;
    }
    sheet.hideColumns(0, 4);
    if (start > 5) sheet.hideColumns(5, start - 5);
    if (end < headers.length - 1) sheet.hideColumns(end + 1, headers.length - end - 1);
    sheet.setFrozenColumns(4, 4);
  }, [sheetReady, stage, fullRegister]);

  useEffect(() => {
    if (!sheetReady || !fullRegister) return;
    const timer = window.setInterval(() => {
      const firstVisible = Number(sheetRef.current?.getScrollState?.()?.sheetViewStartColumn ?? 0);
      const nextStage: RiskRegisterStage = firstVisible >= RENCANA_START
        ? "rencana"
        : firstVisible >= EVALUASI_START
          ? "evaluasi"
          : firstVisible >= ANALISIS_START
            ? "analisis"
            : "identifikasi";
      setStage((current) => current === nextStage ? current : nextStage);
    }, 350);
    return () => window.clearInterval(timer);
  }, [sheetReady, fullRegister]);

  useEffect(() => {
    if (!containerRef.current || loading || univerRef.current || [sasaran, kegiatan, prosesBisnis, jenisRisiko, sumberRisiko, kategoriRisiko, areaDampak].some((query) => query.query?.isPending)) return;
    const { univer, univerAPI } = createUniver({ locale: LocaleType.EN_US, locales: { [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS }, presets: [UniverSheetsCorePreset({ container: containerRef.current, header: true, toolbar: true, formulaBar: true, footer: { sheetBar: true, menus: true, zoomSlider: true } })], plugins: [UniverSheetsDataValidationPlugin, UniverSheetsDataValidationUIPlugin] });
    univerRef.current = univer;
    const workbook = univerAPI.createWorkbook({ id: "risk-register", name: "Risk Register" });
    const sheet = workbook.getActiveSheet();
    sheetRef.current = sheet;
    savedRowsRef.current = rows.map(normalizeRow);
    rowIdsRef.current = data.map((item) => item.id);
    analysisIdsRef.current = data.map((item) => analisisByRisk.get(item.id)?.id);
    evaluationIdsRef.current = data.map((item) => evaluasiByRisk.get(item.id)?.id);
    treatmentIdsRef.current = data.map((item) => rencanaByRisk.get(item.id)?.id);
    const values = [headers, ...rows];
    // Show exactly the filtered records. A draft row is created only through Tambah Risiko.
    sheet.setRowCount(values.length);
    sheet.setColumnCount(headers.length);
    sheet.getRange(`A1:${lastColumn}${values.length}`).setValues(values);
    sheet.getRange(`A1:${lastColumn}1`).setFontWeight("bold").setBackgroundColor("#e8f1fb");
    sheet.getRange(`M1:R1`).setBackgroundColor("#e8f5e9");
    sheet.getRange(`S1:Y1`).setBackgroundColor("#fff3e0");
    sheet.getRange(`Z1:${lastColumn}1`).setBackgroundColor("#f3e5f5");
    sheet.getRange(`A1:${lastColumn}${values.length}`).setWrap(true);
    [220, 300, 300, 320, 680, 170, 170, 220, 220, 380, 380, 100, 220, 200, 160, 180, 420, 190, 220, 200, 170, 180, 150, 190, 140, 230, 210, 170, 180, 460, 180, 320, 170, 260].forEach((width, index) => sheet.setColumnWidth(index, width));
    sheet.setRowHeight(0, 40);
    sheet.setFrozenRows(1);
    const optionLists: Record<number, string[]> = {
      0: referenceLists.unitKerja.map((x: any) => x.nama), 1: referenceLists.sasaran.map((x: any) => x.nama), 2: referenceLists.kegiatan.map((x: any) => x.nama), 3: referenceLists.prosesBisnis.map((x: any) => x.nama),
      5: referenceLists.jenisRisiko.map((x: any) => x.nama), 6: referenceLists.sumberRisiko.map((x: any) => x.nama), 7: referenceLists.kategoriRisiko.map((x: any) => x.nama), 8: referenceLists.areaDampak.map((x: any) => x.nama),
      12: referenceLists.levelKemungkinan.map((x: any) => x.nama), 13: referenceLists.levelDampak.map((x: any) => x.nama), 17: ["Efektif", "Cukup Efektif", "Kurang Efektif", "Tidak Efektif"],
      18: referenceLists.levelKemungkinan.map((x: any) => x.nama), 19: referenceLists.levelDampak.map((x: any) => x.nama), 23: ["Menerima Risiko", "Menghindari Risiko", "Mengurangi Risiko", "Mengalihkan Risiko"],
      25: referenceLists.levelKemungkinan.map((x: any) => x.nama), 26: referenceLists.levelDampak.map((x: any) => x.nama), 30: ["Pencegahan", "Perbaikan"], 33: referenceLists.teams.map((x: any) => x.nama),
    };
    dropdownColumns.forEach((column) => { const options = optionLists[column]; if (!options?.length) return; const letter = columnLetter(column); const rule = univerAPI.newDataValidation().requireValueInList(options, false, true).setOptions({ showDropDown: true, showErrorMessage: true, error: "Pilih nilai dari daftar." }).build(); validationRulesRef.current[column] = rule; if (values.length >= 2) sheet.getRange(`${letter}2:${letter}${values.length}`).setDataValidation(rule); });
    const updateDerivedRows = () => {
      if (updatingDerivedRef.current || sheet.getMaxRows() < 2) return;
      updatingDerivedRef.current = true;
      try {
        const allRows = sheet.getRange(`A2:${lastColumn}${sheet.getMaxRows()}`).getValues() as unknown[][];
        const residualScores: { row: number; score: number }[] = [];
        allRows.forEach((raw, rowIndex) => {
          const current = normalizeRow(raw);
          const resolveLevel = (column: number, key: "levelKemungkinan" | "levelDampak") => findByName(referenceLists[key], current[column]);
          const actual = matrixResult(referenceLists, resolveLevel(12, "levelKemungkinan")?.id, resolveLevel(13, "levelDampak")?.id);
          const residual = matrixResult(referenceLists, resolveLevel(18, "levelKemungkinan")?.id, resolveLevel(19, "levelDampak")?.id);
          const target = matrixResult(referenceLists, resolveLevel(25, "levelKemungkinan")?.id, resolveLevel(26, "levelDampak")?.id);
          sheet.getRange(`${columnLetter(14)}${rowIndex + 2}:${columnLetter(15)}${rowIndex + 2}`).setValues([[actual.besaran, actual.level]]);
          sheet.getRange(`${columnLetter(20)}${rowIndex + 2}:${columnLetter(22)}${rowIndex + 2}`).setValues([[residual.besaran, residual.level, seleraNilai ?? ""]]);
          sheet.getRange(`${columnLetter(27)}${rowIndex + 2}:${columnLetter(28)}${rowIndex + 2}`).setValues([[target.besaran, target.level]]);
          const score = Number(residual.besaran);
          if (Number.isFinite(score) && seleraNilai != null && score > seleraNilai) residualScores.push({ row: rowIndex, score });
        });
        const priorityByRow = new Map(residualScores.sort((a, b) => b.score - a.score || a.row - b.row).map((item, index) => [item.row, index + 1]));
        allRows.forEach((_, rowIndex) => sheet.getRange(`${columnLetter(24)}${rowIndex + 2}`).setValue(priorityByRow.get(rowIndex) ?? ""));
      } finally {
        updatingDerivedRef.current = false;
      }
    };
    sheetEventsRef.current.push(univerAPI.addEvent(univerAPI.Event.SheetValueChanged, (params: any) => {
      if (updatingDerivedRef.current) return;
      const shouldRecalculate = params.effectedRanges?.some((range: any) => {
        const start = range.getColumn();
        const end = start + Math.max(1, range.getColumnCount?.() ?? 1) - 1;
        return [12, 13, 18, 19, 25, 26].some((column) => column >= start && column <= end);
      });
      if (shouldRecalculate) updateDerivedRows();
    }));
    sheetEventsRef.current.push(univerAPI.addEvent(univerAPI.Event.BeforeSheetEditStart, (params: any) => {
      if (params.row === 0) { params.cancel = true; return; }
      if (computedColumns.includes(params.column)) { params.cancel = true; return; }
      if (fullRegisterRef.current) return;
      const activeStage = stageRef.current;
      const editable = activeStage === "identifikasi"
        ? params.column <= IDENT_END
        : activeStage === "analisis"
          ? params.column >= ANALISIS_START && params.column <= ANALISIS_END
          : activeStage === "evaluasi"
            ? params.column >= EVALUASI_START && params.column <= EVALUASI_END
            : params.column >= RENCANA_START && params.column <= RENCANA_END;
      if (!editable) params.cancel = true;
    }));
    if (values.length > 1) {
      void Promise.all(computedColumns.map((column) => sheet.getRange(`${columnLetter(column)}2:${columnLetter(column)}${values.length}`).getRangePermission().protect({ name: `Kolom terhitung ${headers[column]}` }))).catch(() => undefined);
    }
    if (values.length > 1) sheet.autoResizeRows(1, values.length - 1);
    setSheetReady(true);
  }, [loading, rows, data, tahunDari, referenceLists, analisisByRisk, evaluasiByRisk, rencanaByRisk, lastColumn, sasaran.query?.isPending, kegiatan.query?.isPending, prosesBisnis.query?.isPending, jenisRisiko.query?.isPending, sumberRisiko.query?.isPending, kategoriRisiko.query?.isPending, areaDampak.query?.isPending]);

  useEffect(() => () => {
    sheetEventsRef.current.forEach((event) => event.dispose());
    sheetEventsRef.current = [];
    sheetRef.current = null;
    univerRef.current?.dispose();
    univerRef.current = null;
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (hasUnsavedChanges()) event.preventDefault(); };
    const onSave = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (!saving) void save(); } };
    const onNavigate = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.href === window.location.href || !hasUnsavedChanges()) return;
      if (!window.confirm("Ada perubahan Risk Register yang belum disimpan. Tetap tinggalkan halaman?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onSave, true);
    document.addEventListener("click", onNavigate, true);
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); window.removeEventListener("keydown", onSave, true); document.removeEventListener("click", onNavigate, true); };
  });

  if (loading) return <Loader />;
  const identificationStage = stage === "identifikasi";
  return <Stack gap="md">
    <Group justify="space-between" align="end"><Box><Text size="xl" fw={700}>{view === "active" ? "Register Risiko" : "Arsip Risiko"}</Text><Text size="sm" c="dimmed">{view === "active" ? `Tahap aktif: ${stageLabels[stage]} · ` : ""}Periode {tahunDari === tahunSampai ? tahunDari : `${tahunDari}–${tahunSampai}`} · {data.length} risiko.</Text></Box>{identificationStage && <SegmentedControl value={view} onChange={(value) => { if (hasUnsavedChanges()) { notifications.show({ title: "Perubahan belum disimpan", message: "Simpan perubahan sebelum membuka arsip.", color: "orange" }); return; } setView(value); }} data={[{ value: "active", label: "Risiko Aktif" }, { value: "archived", label: "Arsip" }]} />}</Group>
    {view === "active" && <Box style={{ position: "sticky", top: 60, zIndex: 10, background: "var(--mantine-color-body)", paddingBlock: 8, borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" gap="md" wrap="wrap">
        <Group gap="xs" wrap="wrap"><SegmentedControl value={stage} onChange={(value) => switchStage(value as RiskRegisterStage)} data={Object.entries(stageLabels).map(([value, label]) => ({ value, label }))} /><Switch checked={fullRegister} onChange={(event) => setFullRegister(event.currentTarget.checked)} label="Full Register" /></Group>
        <Group gap="xs">
          {identificationStage && <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addRow} disabled={!sheetReady}>Tambah Risiko</Button>}
          <Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} disabled={!sheetReady} onClick={save}>{saving && saveProgress ? `Tersimpan ${saveProgress} baris...` : "Simpan Perubahan"}</Button>
          {dirtyCount > 0 && <Badge color="orange">{dirtyCount} belum disimpan</Badge>}
        </Group>
      </Group>
      <Group mt="xs" gap="xs" wrap="nowrap">
        <TextInput ref={searchInputRef} leftSection={<IconSearch size={16} />} placeholder={`Cari di ${stageLabels[stage]}...`} value={search} onChange={(event) => setSearch(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); nextMatch(event.shiftKey ? -1 : 1); } }} style={{ flex: 1 }} />
        <Button variant="default" disabled={!matches.length} onClick={() => nextMatch(-1)}>Sebelumnya</Button><Button variant="default" disabled={!matches.length} onClick={() => nextMatch(1)}>Berikutnya</Button>
        {identificationStage && <Menu shadow="md" width={250} position="bottom-end"><Menu.Target><Button variant="default" leftSection={<IconDots size={16} />}>Fitur Lainnya</Button></Menu.Target><Menu.Dropdown>
          <Menu.Item leftSection={<IconSparkles size={16} />} onClick={() => { setAssistSuggestion(null); setAssistOpen(true); }}>Bantu Isi dengan AI</Menu.Item>
          <Menu.Item leftSection={<IconDatabase size={16} />} onClick={() => setBankOpen(true)}>Cari dari Bank Risiko</Menu.Item>
          <Menu.Item onClick={jumpIncomplete}>Lanjutkan Data Belum Lengkap</Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconDownload size={16} />} onClick={downloadTemplate}>Unduh Template</Menu.Item>
          <FileButton accept=".xlsx,.xlsm,.xls,.xlsb,.csv" onChange={importExcel}>{(props) => <Menu.Item {...props} leftSection={<IconUpload size={16} />} disabled={importing}>Import Excel</Menu.Item>}</FileButton>
          {canArchive && <><Menu.Divider /><Menu.Item color="orange" leftSection={<IconArchive size={16} />} onClick={archiveSelectedRisk}>Arsipkan Risiko</Menu.Item></>}
        </Menu.Dropdown></Menu>}
        {search.trim() && <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{matches.length ? `${matchIndex + 1}/${matches.length}` : "Tidak ada hasil"}</Text>}
      </Group>
    </Box>}
    <Box ref={containerRef} style={{ display: view === "active" ? "block" : "none", height: "720px", width: "100%", border: "1px solid var(--mantine-color-default-border)" }} />
    {view === "archived" && <Stack><TextInput placeholder="Cari risiko arsip..." value={search} onChange={(event) => setSearch(event.currentTarget.value)} /><Table striped withTableBorder><Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Risiko</Table.Th><Table.Th>Tahun</Table.Th><Table.Th>Alasan</Table.Th><Table.Th>Aksi</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{(archived.result?.data ?? []).filter((item: any) => String(item.risiko).toLowerCase().includes(search.toLowerCase())).map((item: any) => <Table.Tr key={item.id}><Table.Td>{item.id}</Table.Td><Table.Td>{item.risiko}</Table.Td><Table.Td>{item.tahun}</Table.Td><Table.Td>{item.archiveReason || "-"}</Table.Td><Table.Td><Group gap="xs"><Button size="xs" variant="light" onClick={() => void openArchive(item.id, "restore")}>Pulihkan</Button>{isAdmin && <Button size="xs" color="red" variant="light" onClick={() => void openArchive(item.id, "permanent-delete")}>Hapus Permanen</Button>}</Group></Table.Td></Table.Tr>)}</Table.Tbody></Table></Stack>}
    <Modal opened={bankOpen} onClose={() => setBankOpen(false)} title="Cari dari Bank Risiko" size="xl"><Stack><Group><TextInput value={bankQuery} onChange={(event) => setBankQuery(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchBank(); }} placeholder="Ketik kata kunci risiko..." style={{ flex: 1 }} /><Button loading={bankLoading} onClick={searchBank}>Cari</Button></Group>{bankMethod && <Text size="sm">Metode pencarian: {bankMethod === "semantic" ? "Semantik" : "Teks"}</Text>}{bankResults.map((risk) => <Group key={risk.id} justify="space-between" align="start" p="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}><Box style={{ flex: 1 }}><Text size="sm">{risk.risiko}</Text><Badge size="xs">{risk.kategori_risiko_nama}</Badge></Box><Button size="xs" onClick={() => void importBankRisk(risk)}>Tambahkan</Button></Group>)}</Stack></Modal>
    <Modal opened={assistOpen} onClose={() => setAssistOpen(false)} title="Bantu Isi dengan AI" size="lg"><Stack><Textarea label="Ceritakan kondisi atau risiko" minRows={4} value={assistDescription} onChange={(event) => setAssistDescription(event.currentTarget.value)} /><Button loading={assistLoading} onClick={suggestRisk}>Buat Saran</Button>{assistSuggestion && <><Text fw={600}>{assistSuggestion.risiko}</Text><Text size="sm">Penyebab: {assistSuggestion.penyebab || "-"}</Text><Text size="sm">Dampak: {assistSuggestion.dampak || "-"}</Text><Button color="violet" onClick={applySuggestion}>Terapkan ke Baris Baru</Button><Select label="Level Kemungkinan Aktual" data={(levelKemungkinan.result?.data ?? []).map((item: any) => item.nama)} value={assistLikelihood} onChange={(value) => setAssistLikelihood(value || "")} /><Select label="Level Dampak Aktual" data={(levelDampak.result?.data ?? []).map((item: any) => item.nama)} value={assistImpact} onChange={(value) => setAssistImpact(value || "")} /><Textarea label="Pengendalian yang pernah dilakukan" value={assistControl} onChange={(event) => setAssistControl(event.currentTarget.value)} /><Select label="Efektivitas Pengendalian" clearable data={[{ value: "efektif", label: "Efektif" }, { value: "cukup_efektif", label: "Cukup Efektif" }, { value: "kurang_efektif", label: "Kurang Efektif" }, { value: "tidak_efektif", label: "Tidak Efektif" }]} value={assistEffectiveness} onChange={setAssistEffectiveness} /><Select label="Respons Risiko" data={[{ value: "mengurangi", label: "Mengurangi" }, { value: "menerima", label: "Menerima" }, { value: "menghindari", label: "Menghindari" }, { value: "mentransfer", label: "Mentransfer" }]} value={assistResponse} onChange={(value) => setAssistResponse(value || "mengurangi")} /><Button color="green" loading={assistWorkflowLoading} onClick={createThroughEvaluation}>Simpan sampai Evaluasi</Button></>}</Stack></Modal>
    <Modal opened={archiveOpen} onClose={() => setArchiveOpen(false)} title={archiveAction === "archive" ? "Arsipkan Risiko" : archiveAction === "restore" ? "Pulihkan Risiko" : "Hapus Risiko Permanen"}><Stack><Alert color={archiveAction === "permanent-delete" ? "red" : "orange"}>{archiveAction === "permanent-delete" ? "Risiko dan seluruh data terkait akan dihapus permanen." : "Data terkait tetap tersimpan dan dapat dipulihkan."}</Alert><Text fw={600}>#{archiveItem?.id} · {archiveItem?.risiko}</Text>{archiveItem && <Group><Badge>Analisis: {archiveItem.hasAnalisis ? "Ada" : "Tidak"}</Badge><Badge>Evaluasi: {archiveItem.hasEvaluasi ? "Ada" : "Tidak"}</Badge><Badge>Rencana: {archiveItem.hasRencana ? "Ada" : "Tidak"}</Badge><Badge>{archiveItem.dokumenCount} dokumen</Badge></Group>}{archiveAction !== "restore" && <Textarea label="Alasan" required value={archiveReason} onChange={(event) => setArchiveReason(event.currentTarget.value)} />}{archiveAction === "permanent-delete" && <TextInput label={`Ketik ID ${archiveItem?.id} untuk konfirmasi`} value={archiveConfirm} onChange={(event) => setArchiveConfirm(event.currentTarget.value)} />}<Button color={archiveAction === "permanent-delete" ? "red" : "blue"} loading={archiveSubmitting} disabled={(archiveAction !== "restore" && !archiveReason.trim()) || (archiveAction === "permanent-delete" && archiveConfirm !== String(archiveItem?.id))} onClick={submitArchive}>Konfirmasi</Button></Stack></Modal>
    <Modal opened={Boolean(importResult)} onClose={() => setImportResult(null)} title="Hasil Import Excel"><Stack><Text>{importResult?.created ?? 0} dibuat · {importResult?.updated ?? 0} diperbarui · {importResult?.failed ?? 0} gagal</Text>{importResult?.details?.filter((item: any) => item.error).map((item: any, index: number) => <Text size="sm" key={index}>Baris {item.row}: {item.error}</Text>)}</Stack></Modal>
  </Stack>;
}
