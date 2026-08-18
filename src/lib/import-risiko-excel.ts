import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

/**
 * Shared layout + helpers for the Identifikasi Risiko Excel import/template.
 *
 * The template mirrors the Pelaporan Risiko export layout (columns A-AI,
 * two header rows: groups on row 4, sub-headers on row 5, data from row 6)
 * plus two import-only columns at the end:
 *   AJ "ID Sistem"  - filled for existing records; empty means "new row"
 *   AK "Jenis Risiko" - required for new rows (field is mandatory but not
 *                       part of the pelaporan export layout)
 */

// 1-based column indices
export const COL = {
  no: 1,
  sasaran: 2,
  kegiatan: 3,
  prosesBisnis: 4,
  risiko: 5,
  penyebab: 6,
  dampak: 7,
  kategoriRisiko: 8,
  areaDampak: 9,
  sumberRisiko: 10,
  lvlKemungkinan: 11,
  lvlDampak: 12,
  // 13-14 computed (Besaran/Level Risiko) - ignored on import
  pengendalian: 15,
  efektivitas: 16,
  residualKemungkinan: 17,
  residualDampak: 18,
  // 19-20 computed (Level/Besaran Residual) - ignored on import
  respon: 21,
  rencanaPenanganan: 22,
  targetWaktu: 23,
  targetOutput: 24,
  penanggungJawab: 25,
  keterjadianRisiko: 26,
  realisasiWaktu: 27,
  realisasiOutput: 28,
  // 29 dokumen pendukung & 34-35 persetujuan/disetujuiOleh - never imported
  kemungkinanResidualHarapan: 30,
  dampakResidualHarapan: 31,
  idSistem: 36,
  jenisRisiko: 37,
} as const;

export const IMPORT_START_ROW = 6;

// Group header (row 4) -> span, starting at the column after the previous group
const HEADER_GROUPS: { label: string; span: number }[] = [
  { label: "Identifikasi", span: 5 },
  { label: "Analisis Risiko Aktual", span: 4 },
  { label: "Pengendalian yang Telah Dilaksanakan", span: 2 },
  { label: "Risiko Residual", span: 4 },
  { label: "Respons Risiko", span: 1 },
  { label: "Rencana Penanganan Risiko", span: 4 },
  { label: "Pemantauan Tindak Lanjut Penanganan Risiko", span: 4 },
  { label: "Risiko Residual Harapan", span: 4 },
  { label: "Persetujuan (Reporting)", span: 2 },
  { label: "Kolom Import", span: 2 },
];

const HEADER_SUBS = [
  "No", "Sasaran", "Kegiatan", "Proses Bisnis", "Risiko",
  "Penyebab", "Dampak", "Kategori Risiko", "Area Dampak", "Sumber Risiko",
  "Lvl Kemungkinan", "Lvl Dampak", "Besaran Risiko", "Level Risiko",
  "Pengendalian", "Efektivitas",
  "Level Kemungkinan", "Level Dampak", "Level Risiko", "Besaran Risiko",
  "Respons Risiko",
  "Rencana Penanganan", "Target Waktu", "Target Output", "P. Jawab",
  "Keterjadian Risiko", "Waktu Realisasi", "Output Realisasi", "Dokumen Pendukung",
  "Kemungkinan", "Dampak", "Level Risiko", "Besaran Residual",
  "Persetujuan", "Disetujui Oleh",
  "ID Sistem", "Jenis Risiko",
];

const COLUMN_WIDTHS: number[] = [
  6, 24, 24, 24, 30, // A-E
  25, 25, 20, 20, 20, // F-J
  18, 18, 14, 16, // K-N
  30, 18, // O-P
  18, 18, 16, 14, // Q-T
  20, // U
  30, 15, 25, 20, // V-Y
  20, 15, 25, 22, // Z-AC
  18, 18, 16, 16, // AD-AG
  14, 18, // AH-AI
  12, 20, // AJ-AK
];

// ---------- value mappers ----------

const RESPONS_MAP: Record<string, string> = {
  "mengurangi risiko": "mengurangi",
  "mengalihkan risiko": "mentransfer",
  "menghindari risiko": "menghindari",
  "menerima risiko": "menerima",
  mengurangi: "mengurangi",
  mentransfer: "mentransfer",
  menghindari: "menghindari",
  menerima: "menerima",
};

export const RESPONS_ENUM_TO_LABEL: Record<string, string> = {
  mengurangi: "Mengurangi Risiko",
  mentransfer: "Mengalihkan Risiko",
  menghindari: "Menghindari Risiko",
  menerima: "Menerima Risiko",
};

export function normalizeRespons(value: string): string | null {
  return RESPONS_MAP[value.trim().toLowerCase()] ?? null;
}

const EFEKTIVITAS_MAP: Record<string, string> = {
  efektif: "efektif",
  cukup_efektif: "cukup_efektif",
  "cukup efektif": "cukup_efektif",
  kurang_efektif: "kurang_efektif",
  "kurang efektif": "kurang_efektif",
  tidak_efektif: "tidak_efektif",
  "tidak efektif": "tidak_efektif",
};

export function normalizeEfektivitas(value: string): string | null {
  return EFEKTIVITAS_MAP[value.trim().toLowerCase()] ?? null;
}

export function normalizeKeterjadian(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (v === "terjadi") return "Terjadi";
  if (v === "tidak terjadi") return "Tidak Terjadi";
  return null;
}

// ---------- template generation ----------

export interface TemplateRowData {
  id: number;
  sasaran: string;
  kegiatan: string;
  prosesBisnis: string;
  risiko: string;
  penyebab: string;
  dampak: string;
  kategoriRisiko: string;
  areaDampak: string;
  sumberRisiko: string;
  jenisRisiko: string;
  lvlKemungkinan: string;
  lvlDampak: string;
  besaranAktual: number;
  levelAktual: string;
  pengendalian: string;
  efektivitas: string;
  residualKemungkinan: string;
  residualDampak: string;
  besaranResidual: number;
  levelResidual: string;
  respon: string;
  rencanaPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  penanggungJawab: string;
  keterjadianRisiko: string;
  realisasiWaktu: string;
  realisasiOutput: string;
  dokumenPendukung: string;
  persetujuan: string;
  disetujuiOleh: string;
}

export interface ReferenceNames {
  jenisRisiko: string[];
  sumberRisiko: string[];
  kategoriRisiko: string[];
  areaDampak: string[];
  sasaran: string[];
  kegiatan: string[];
  prosesBisnis: string[];
  levelKemungkinan: string[];
  levelDampak: string[];
}

function colLetterToNumber(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

const REF_SHEET_COLUMNS: { ref: keyof ReferenceNames; listFormulaCol: string }[] = [
  { ref: "jenisRisiko", listFormulaCol: "A" },
  { ref: "sumberRisiko", listFormulaCol: "B" },
  { ref: "kategoriRisiko", listFormulaCol: "C" },
  { ref: "areaDampak", listFormulaCol: "D" },
  { ref: "sasaran", listFormulaCol: "E" },
  { ref: "kegiatan", listFormulaCol: "F" },
  { ref: "prosesBisnis", listFormulaCol: "G" },
  { ref: "levelKemungkinan", listFormulaCol: "H" },
  { ref: "levelDampak", listFormulaCol: "I" },
];

export function buildImportTemplateWorkbook(
  rows: TemplateRowData[],
  refs: ReferenceNames,
  tahunLabel: string
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Import");
  const totalCols = HEADER_SUBS.length;

  // Column widths
  COLUMN_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Title + subtitle
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `TEMPLATE IMPORT IDENTIFIKASI RISIKO - ${tahunLabel}`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "1F2937" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, totalCols);
  const subCell = ws.getCell(2, 1);
  subCell.value =
    "Baris dengan \"ID Sistem\" terisi akan DIPERBARUI (sel kosong = nilai lama tetap). " +
    "Baris baru: kosongkan \"ID Sistem\", wajib mengisi \"Jenis Risiko\". Baca sheet Petunjuk sebelum mengisi.";
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "4B5563" } };
  subCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  ws.getRow(2).height = 28;

  // Header rows 4-5 (same structure as the pelaporan export)
  // Row 4: standalone headers (rowSpan 2) + group headers; Row 5: sub-headers.
  const row4 = ws.getRow(4);
  const row5 = ws.getRow(5);
  let col = 1;
  // Standalone: No, Sasaran, Kegiatan, Proses Bisnis, Risiko
  for (let i = 0; i < 5; i++) {
    row4.getCell(col).value = HEADER_SUBS[i];
    ws.mergeCells(4, col, 5, col);
    col++;
  }
  for (const group of HEADER_GROUPS) {
    if (group.label === "Kolom Import") {
      // AJ/AK: standalone rowSpan-2 headers
      row4.getCell(col).value = "ID Sistem";
      ws.mergeCells(4, col, 5, col);
      col++;
      row4.getCell(col).value = "Jenis Risiko";
      ws.mergeCells(4, col, 5, col);
      col++;
      continue;
    }
    if (group.span === 1) {
      // "Respons Risiko" is a single merged column in the pelaporan layout
      row4.getCell(col).value = group.label;
      ws.mergeCells(4, col, 5, col);
      col++;
      continue;
    }
    row4.getCell(col).value = group.label;
    ws.mergeCells(4, col, 4, col + group.span - 1);
    for (let s = 0; s < group.span; s++) {
      row5.getCell(col + s).value = HEADER_SUBS[col - 1 + s];
    }
    col += group.span;
  }

  const headerFont = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
  const headerFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "374151" },
  };
  for (const r of [4, 5]) {
    const row = ws.getRow(r);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "4B5563" } },
        left: { style: "thin", color: { argb: "4B5563" } },
        bottom: { style: "thin", color: { argb: "4B5563" } },
        right: { style: "thin", color: { argb: "4B5563" } },
      };
    });
  }
  // Highlight the two import-only columns
  const importOnlyFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "1E40AF" },
  };
  for (const c of [COL.idSistem, COL.jenisRisiko]) {
    for (const r of [4, 5]) {
      ws.getCell(r, c).fill = importOnlyFill;
    }
  }

  // Data rows
  rows.forEach((row, i) => {
    const values: (string | number)[] = [
      i + 1,
      row.sasaran,
      row.kegiatan,
      row.prosesBisnis,
      row.risiko,
      row.penyebab,
      row.dampak,
      row.kategoriRisiko,
      row.areaDampak,
      row.sumberRisiko,
      row.lvlKemungkinan,
      row.lvlDampak,
      row.besaranAktual > 0 ? row.besaranAktual : "",
      row.levelAktual,
      row.pengendalian,
      row.efektivitas,
      row.residualKemungkinan,
      row.residualDampak,
      row.levelResidual,
      row.besaranResidual > 0 ? row.besaranResidual : "",
      RESPONS_ENUM_TO_LABEL[row.respon] ?? row.respon,
      row.rencanaPenanganan,
      row.targetWaktu,
      row.targetOutput,
      row.penanggungJawab,
      row.keterjadianRisiko,
      row.realisasiWaktu,
      row.realisasiOutput,
      row.dokumenPendukung,
      // AD-AG "Risiko Residual Harapan" duplicate the residual columns, same as the export
      row.residualKemungkinan,
      row.residualDampak,
      row.levelResidual,
      row.besaranResidual > 0 ? row.besaranResidual : "",
      row.persetujuan,
      row.disetujuiOleh,
      row.id,
      row.jenisRisiko,
    ];
    const excelRow = ws.addRow(values);
    excelRow.font = { name: "Arial", size: 10 };
    excelRow.alignment = { vertical: "top", wrapText: true };
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "E5E7EB" } },
        left: { style: "thin", color: { argb: "E5E7EB" } },
        bottom: { style: "thin", color: { argb: "E5E7EB" } },
        right: { style: "thin", color: { argb: "E5E7EB" } },
      };
    });
    // grey out the system ID column
    const idCell = excelRow.getCell(COL.idSistem);
    idCell.font = { name: "Arial", size: 10, color: { argb: "9CA3AF" } };
    idCell.alignment = { vertical: "top", horizontal: "center" };
  });

  // Hidden Referensi sheet powering the dropdowns
  const refWs = workbook.addWorksheet("Referensi");
  refWs.state = "hidden";
  const refRanges: Record<string, string> = {};
  REF_SHEET_COLUMNS.forEach(({ ref, listFormulaCol }) => {
    const names = refs[ref];
    refWs.getCell(1, colLetterToNumber(listFormulaCol)).value = ref;
    names.forEach((nama, i) => {
      refWs.getCell(i + 2, colLetterToNumber(listFormulaCol)).value = nama;
    });
    refRanges[listFormulaCol] = `Referensi!$${listFormulaCol}$2:$${listFormulaCol}$${names.length + 1}`;
  });
  const enumCols: Record<string, string[]> = {
    P: ["efektif", "cukup_efektif", "kurang_efektif", "tidak_efektif"],
    U: Object.keys(RESPONS_ENUM_TO_LABEL).map((k) => RESPONS_ENUM_TO_LABEL[k]),
    Z: ["Terjadi", "Tidak Terjadi"],
  };

  const dropdownMap: { col: number; formula: string }[] = [
    { col: COL.sasaran, formula: refRanges.E },
    { col: COL.kegiatan, formula: refRanges.F },
    { col: COL.prosesBisnis, formula: refRanges.G },
    { col: COL.jenisRisiko, formula: refRanges.A },
    { col: COL.sumberRisiko, formula: refRanges.B },
    { col: COL.kategoriRisiko, formula: refRanges.C },
    { col: COL.areaDampak, formula: refRanges.D },
    { col: COL.lvlKemungkinan, formula: refRanges.H },
    { col: COL.lvlDampak, formula: refRanges.I },
    { col: COL.residualKemungkinan, formula: refRanges.H },
    { col: COL.residualDampak, formula: refRanges.I },
    { col: COL.kemungkinanResidualHarapan, formula: refRanges.H },
    { col: COL.dampakResidualHarapan, formula: refRanges.I },
  ];

  const lastValidatedRow = Math.max(rows.length + 100, 150) + IMPORT_START_ROW - 1;
  for (let r = IMPORT_START_ROW; r <= lastValidatedRow; r++) {
    for (const { col: c, formula } of dropdownMap) {
      ws.getCell(r, c).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: "warning",
        error: "Nilai tidak ada di daftar referensi. Import akan menolak baris ini.",
      };
    }
    for (const [colLetter, values] of Object.entries(enumCols)) {
      ws.getCell(r, colLetterToNumber(colLetter)).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${values.join(",")}"`],
        showErrorMessage: true,
        errorStyle: "warning",
        error: "Gunakan salah satu nilai yang tersedia.",
      };
    }
  }

  // Petunjuk sheet
  const guide = workbook.addWorksheet("Petunjuk");
  guide.getColumn(1).width = 28;
  guide.getColumn(2).width = 100;
  const guideRows: [string, string][] = [
    ["Cara pakai", "Unduh file ini (sudah berisi data tahun terpilih), tambahkan baris baru di bawah data yang ada, lalu upload melalui tombol Import Excel di menu Identifikasi Risiko."],
    ["ID Sistem (kolom AJ)", "Terisi = baris data LAMA dan akan diperbarui. Sel yang Anda isi akan menimpa nilai lama; sel yang dibiarkan kosong TIDAK menghapus nilai lama. JANGAN mengubah isi kolom ini."],
    ["Baris baru", "Kosongkan ID Sistem. Wajib mengisi: Risiko, Jenis Risiko, Sumber Risiko, Kategori Risiko, Area Dampak. Baris baru otomatis memakai tahun awal dari filter tahun aplikasi."],
    ["Sasaran/Kegiatan/Proses Bisnis", "Opsional. Nama harus persis sama dengan yang terdaftar (gunakan dropdown). Jika tidak ditemukan, baris akan ditolak."],
    ["Analisis (Lvl Kemungkinan/Lvl Dampak/Pengendalian/Efektivitas)", "Jika salah satu diisi, record analisis dibuat/diperbarui. Besaran & Level Risiko dihitung otomatis dari matriks - biarkan apa adanya."],
    ["Efektivitas", `Salah satu: ${enumCols.P.join(" / ")}`],
    ["Respons Risiko", `Salah satu: ${enumCols.U.join(" / ")}`],
    ["Rencana Penanganan (Rencana/Target Waktu/Target Output/P. Jawab)", "Jika salah satu diisi, record rencana penanganan dibuat/diperbarui."],
    ["Risiko Residual (Level Kemungkinan/Level Dampak)", "Disimpan pada rencana penanganan. Kolom 'Risiko Residual Harapan' berlaku sebagai cadangan jika kolom residual utama kosong."],
    ["Pemantauan (Keterjadian/Waktu Realisasi/Output Realisasi)", `Ikut diimport ke rencana penanganan. Keterjadian: Terjadi / Tidak Terjadi.`],
    ["Tidak diimport", "Kolom Dokumen Pendukung, Persetujuan, Disetujui Oleh (approval tetap dikelola di aplikasi; rencana baru selalu berstatus Draft), dan semua kolom hasil hitungan (Besaran/Level)."],
    ["Format file", "Bisa diunggah: .xlsx, .xlsm, .xls, .xlsb, .csv. Untuk file Numbers (Mac), ekspor dulu ke Excel: File > Export To > Excel..."],
    ["Referensi", "Sheet 'Referensi' (tersembunyi) berisi daftar nama valid untuk dropdown - jangan dihapus."],
  ];
  guide.addRow(["PETUNJUK IMPORT IDENTIFIKASI RISIKO", ""]);
  guide.getCell(1, 1).font = { bold: true, size: 12 };
  guideRows.forEach(([k, v]) => {
    const r = guide.addRow([k, v]);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    r.alignment = { vertical: "top", wrapText: true };
  });

  return workbook;
}

// ---------- import parsing ----------

export interface ParsedImportRow {
  rowNumber: number;
  idSistem: number | null;
  sasaran: string;
  kegiatan: string;
  prosesBisnis: string;
  risiko: string;
  penyebab: string;
  dampak: string;
  kategoriRisiko: string;
  areaDampak: string;
  sumberRisiko: string;
  jenisRisiko: string;
  lvlKemungkinan: string;
  lvlDampak: string;
  pengendalian: string;
  efektivitas: string;
  residualKemungkinan: string;
  residualDampak: string;
  kemungkinanResidualHarapan: string;
  dampakResidualHarapan: string;
  respon: string;
  rencanaPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  penanggungJawab: string;
  keterjadianRisiko: string;
  realisasiWaktu: string;
  realisasiOutput: string;
}

/**
 * File extensions accepted by the import endpoint. Parsed with SheetJS,
 * which auto-detects the actual format (.xlsx/.xlsm/.xls/.xlsb/.csv).
 * Apple Numbers (.numbers) is proprietary and unsupported - users must
 * export to Excel format first.
 */
export const ACCEPTED_IMPORT_EXTENSIONS = [".xlsx", ".xlsm", ".xls", ".xlsb", ".csv"];

export function parseImportWorkbook(
  buffer: Buffer
): { rows: ParsedImportRow[]; error?: string } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { rows: [], error: "File tidak dapat dibaca. Pastikan file Excel/CSV yang valid." };
  }

  const sheetName = workbook.SheetNames.includes("Import")
    ? "Import"
    : workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) return { rows: [], error: "File tidak berisi worksheet." };

  // Read the entire used range as a grid of formatted strings. Grid indices
  // are 0-based: grid[4] = sheet row 5 (sub-headers), grid[5] = first data row.
  // blankrows:true keeps grid indices aligned with real sheet rows.
  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  });

  const text = (rowIdx: number, col: number): string => {
    const rowCells = grid[rowIdx];
    if (!rowCells) return "";
    return String(rowCells[col - 1] ?? "").trim();
  };

  // Vertically merged headers (No, Sasaran, Kegiatan, Proses Bisnis, Risiko,
  // ID Sistem, Jenis Risiko) store their value in row 4, not row 5 - a label
  // is valid if found in either row.
  const headerValue = (col: number): string => text(4, col) || text(3, col);

  // Sanity check: must be the import template layout (headers on rows 4-5)
  const headerOk =
    headerValue(COL.penyebab) === "Penyebab" &&
    headerValue(COL.risiko) === "Risiko" &&
    headerValue(COL.idSistem) === "ID Sistem";
  if (!headerOk) {
    return {
      rows: [],
      error:
        "Struktur file tidak dikenali. Gunakan tombol 'Unduh Template' di menu Identifikasi Risiko.",
    };
  }

  const rows: ParsedImportRow[] = [];
  // Scan the whole used range - never rely on a row-count heuristic, so rows
  // appended by any editor (Excel, Numbers export, LibreOffice, CSV) are read.
  for (let r = IMPORT_START_ROW - 1; r < grid.length; r++) {
    const idText = text(r, COL.idSistem);
    const row: ParsedImportRow = {
      rowNumber: r + 1,
      idSistem: idText && !isNaN(Number(idText)) ? Number(idText) : null,
      sasaran: text(r, COL.sasaran),
      kegiatan: text(r, COL.kegiatan),
      prosesBisnis: text(r, COL.prosesBisnis),
      risiko: text(r, COL.risiko),
      penyebab: text(r, COL.penyebab),
      dampak: text(r, COL.dampak),
      kategoriRisiko: text(r, COL.kategoriRisiko),
      areaDampak: text(r, COL.areaDampak),
      sumberRisiko: text(r, COL.sumberRisiko),
      jenisRisiko: text(r, COL.jenisRisiko),
      lvlKemungkinan: text(r, COL.lvlKemungkinan),
      lvlDampak: text(r, COL.lvlDampak),
      pengendalian: text(r, COL.pengendalian),
      efektivitas: text(r, COL.efektivitas),
      residualKemungkinan: text(r, COL.residualKemungkinan),
      residualDampak: text(r, COL.residualDampak),
      kemungkinanResidualHarapan: text(r, COL.kemungkinanResidualHarapan),
      dampakResidualHarapan: text(r, COL.dampakResidualHarapan),
      respon: text(r, COL.respon),
      rencanaPenanganan: text(r, COL.rencanaPenanganan),
      targetWaktu: text(r, COL.targetWaktu),
      targetOutput: text(r, COL.targetOutput),
      penanggungJawab: text(r, COL.penanggungJawab),
      keterjadianRisiko: text(r, COL.keterjadianRisiko),
      realisasiWaktu: text(r, COL.realisasiWaktu),
      realisasiOutput: text(r, COL.realisasiOutput),
    };
    // Skip fully empty rows
    const hasContent = Object.entries(row).some(
      ([k, v]) => k !== "rowNumber" && typeof v === "string" && v !== ""
    ) || row.idSistem !== null;
    if (hasContent) rows.push(row);
  }
  return { rows };
}
