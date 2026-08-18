import ExcelJS from 'exceljs';

interface DaftarRisikoData {
  sasaran: {
    kode: string;
    nama: string;
  };
  kegiatan: string;
  risikoList: Array<{
    satker: string;
    timBidang: string;
    prosesBisnis: string;
    pernyataanRisiko: string;
    penyebab: string[];
    dampak: string[];
    kategoriRisiko: string;
    areaDampak: string;
    sumberRisiko: string;
    risikoAktual: {
      levelKemungkinan: string;
      levelDampak: string;
      besaranRisiko: number;
      levelRisiko: string;
    };
    rtp: {
      uraian: string[];
      targetOutput: string[];
      targetWaktu: string[];
      penanggungJawab: string[];
      realisasiOutput: string[];
      realisasiWaktu: string[];
      dokumenPendukung: string[];
    };
    risikoResidual: {
      levelKemungkinan: string;
      levelDampak: string;
      besaranRisiko: number;
      levelRisiko: string;
    };
    persetujuan: string;
    disetujuiOleh: string;
  }>;
}

export async function generateDaftarRisikoExcel(data: DaftarRisikoData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daftar Risiko');

  // Set column widths
  worksheet.columns = [
    { width: 15 }, // A - Satuan Kerja
    { width: 15 }, // B - Tim/Bidang
    { width: 20 }, // C - Proses Bisnis
    { width: 25 }, // D - Pernyataan Risiko
    { width: 25 }, // E - Penyebab
    { width: 25 }, // F - Dampak
    { width: 15 }, // G - Kategori Risiko
    { width: 15 }, // H - Area Dampak
    { width: 15 }, // I - Sumber Risiko
    { width: 12 }, // J - Level Kemungkinan
    { width: 12 }, // K - Level Dampak
    { width: 12 }, // L - Besaran Risiko
    { width: 12 }, // M - Level Risiko
    { width: 30 }, // N - RTP
    { width: 20 }, // O - Target Output
    { width: 15 }, // P - Target Waktu
    { width: 15 }, // Q - Penanggung Jawab
    { width: 20 }, // R - Realisasi Output
    { width: 15 }, // S - Realisasi Waktu
    { width: 15 }, // T - Dokumen Pendukung
    { width: 12 }, // U - Level Kemungkinan (Residual)
    { width: 12 }, // V - Level Dampak (Residual)
    { width: 12 }, // W - Besaran Risiko (Residual)
    { width: 12 }, // X - Level Risiko (Residual)
    { width: 15 }, // Y - Persetujuan
    { width: 20 }, // Z - Disetujui Oleh
  ];

  // Header Section
  const titleRow = worksheet.addRow(['FORMULIR DAFTAR RISIKO']);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'left' };
  worksheet.mergeCells('A1:Z1');

  // Satuan Kerja
  const satkerRow = worksheet.addRow(['Satuan Kerja', `: ${data.sasaran.kode}`]);
  satkerRow.font = { bold: true };
  worksheet.mergeCells('B2:Z2');

  // Kegiatan
  const kegiatanRow = worksheet.addRow(['Kegiatan', `: ${data.kegiatan}`]);
  kegiatanRow.font = { bold: true };
  worksheet.mergeCells('B3:Z3');

  // Empty row
  worksheet.addRow([]);

  // Main Header Row
  const headerRow1 = worksheet.addRow([
    'Satuan Kerja',
    'Tim/Bidang',
    'Proses Bisnis',
    'Pernyataan Risiko',
    'Penyebab',
    'Dampak',
  ]);
  headerRow1.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Column numbers row
  const numberRow1 = worksheet.addRow(['(1)', '(2)', '(3)', '(4)', '(5)', '(6)']);
  numberRow1.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Second header section (columns 7-13)
  worksheet.getCell('G5').value = 'Kategori Risiko';
  worksheet.getCell('H5').value = 'Area Dampak';
  worksheet.getCell('I5').value = 'Sumber Risiko';
  worksheet.mergeCells('J5:M5');
  worksheet.getCell('J5').value = 'Risiko Aktual';

  ['G5', 'H5', 'I5', 'J5'].forEach((cell) => {
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    worksheet.getCell(cell).font = { bold: true };
    worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(cell).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Risiko Aktual sub-headers
  ['J6', 'K6', 'L6', 'M6'].forEach((cell, idx) => {
    const labels = ['Level Kemungkinan', 'Level Dampak', 'Besaran Risiko', 'Level Risiko'];
    worksheet.getCell(cell).value = labels[idx];
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    worksheet.getCell(cell).font = { bold: true };
    worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getCell(cell).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Column numbers for section 2
  ['G6', 'H6', 'I6'].forEach((cell, idx) => {
    worksheet.getCell(cell).value = `(${7 + idx})`;
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(cell).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  ['J6', 'K6', 'L6', 'M6'].forEach((cell, idx) => {
    const numbers = worksheet.addRow([]);
    worksheet.getCell(`J7`).value = '(10)';
    worksheet.getCell(`K7`).value = '(11)';
    worksheet.getCell(`L7`).value = '(12)';
    worksheet.getCell(`M7`).value = '(13)';
  });

  // Third header section - RTP
  worksheet.mergeCells('N5:T5');
  worksheet.getCell('N5').value = 'Rencana Penanganan Risiko';
  worksheet.getCell('N5').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB4C7E7' },
  };
  worksheet.getCell('N5').font = { bold: true };
  worksheet.getCell('N5').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('N5').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // RTP sub-headers
  const rtpHeaders = [
    'RTP', 'Target Output', 'Target Waktu', 'Penanggung Jawab',
    'Realisasi Output', 'Realisasi Waktu', 'Dokumen Pendukung'
  ];
  rtpHeaders.forEach((header, idx) => {
    const cell = worksheet.getCell(6, 14 + idx); // Column N onwards
    cell.value = header;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Fourth header section - Risiko Residual
  worksheet.mergeCells('U5:X5');
  worksheet.getCell('U5').value = 'Risiko Residual Harapan';
  worksheet.getCell('U5').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB4C7E7' },
  };
  worksheet.getCell('U5').font = { bold: true };
  worksheet.getCell('U5').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('U5').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // Risiko Residual sub-headers
  ['U6', 'V6', 'W6', 'X6'].forEach((cell, idx) => {
    const labels = ['Level Kemungkinan', 'Level Dampak', 'Besaran Risiko', 'Level Risiko'];
    worksheet.getCell(cell).value = labels[idx];
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    worksheet.getCell(cell).font = { bold: true };
    worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getCell(cell).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Last two columns
  worksheet.getCell('Y5').value = 'Persetujuan';
  worksheet.getCell('Z5').value = 'Disetujui Oleh';
  ['Y5', 'Z5'].forEach((cell) => {
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    worksheet.getCell(cell).font = { bold: true };
    worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getCell(cell).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Merge cells for Y and Z from row 5 to 6
  worksheet.mergeCells('Y5:Y6');
  worksheet.mergeCells('Z5:Z6');

  // Data rows
  let currentRow = 7;
  data.risikoList.forEach((risiko) => {
    const dataRow = worksheet.addRow([
      risiko.satker,
      risiko.timBidang,
      risiko.prosesBisnis,
      risiko.pernyataanRisiko,
      risiko.penyebab.join('\n'),
      risiko.dampak.join('\n'),
      risiko.kategoriRisiko,
      risiko.areaDampak,
      risiko.sumberRisiko,
      risiko.risikoAktual.levelKemungkinan,
      risiko.risikoAktual.levelDampak,
      risiko.risikoAktual.besaranRisiko,
      risiko.risikoAktual.levelRisiko,
      risiko.rtp.uraian.join('\n'),
      risiko.rtp.targetOutput.join('\n'),
      risiko.rtp.targetWaktu.join('\n'),
      risiko.rtp.penanggungJawab.join('\n'),
      risiko.rtp.realisasiOutput.join('\n'),
      risiko.rtp.realisasiWaktu.join('\n'),
      risiko.rtp.dokumenPendukung.join('\n'),
      risiko.risikoResidual.levelKemungkinan,
      risiko.risikoResidual.levelDampak,
      risiko.risikoResidual.besaranRisiko,
      risiko.risikoResidual.levelRisiko,
      risiko.persetujuan,
      risiko.disetujuiOleh,
    ]);

    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    currentRow++;
  });

  // Add note at the bottom
  const noteRow = worksheet.addRow([
    'Catatan : Kolom yang di blok warna orange tidak perlu diisi, karena tinggal memilih saja',
  ]);
  worksheet.mergeCells(`A${noteRow.number}:Z${noteRow.number}`);
  noteRow.font = { italic: true };

  return workbook;
}
