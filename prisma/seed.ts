import { prisma } from "../src/lib/prisma";

async function main() {
  // 1. Seed JenisRisiko
  const jenisCount = await prisma.jenisRisiko.count();
  if (jenisCount === 0) {
    await prisma.jenisRisiko.createMany({
      data: [{ nama: "Positif" }, { nama: "Negatif" }],
    });
    console.log("Seeded JenisRisiko");
  }

  // 2. Seed SumberRisiko
  const sumberCount = await prisma.sumberRisiko.count();
  if (sumberCount === 0) {
    await prisma.sumberRisiko.createMany({
      data: [{ nama: "Internal" }, { nama: "Eksternal" }],
    });
    console.log("Seeded SumberRisiko");
  }

  // 3. Seed LevelRisiko
  const levelRisikoData = [
    { id: 1, nama: "Sangat Rendah", rentang: "1 - 5", tindakan: "Tidak diperlukan Tindakan", warna: "Biru" },
    { id: 2, nama: "Rendah", rentang: "6 - 10", tindakan: "Diambil tindakan jika diperlukan", warna: "Hijau" },
    { id: 3, nama: "Sedang", rentang: "11 - 14", tindakan: "Diambil tindakan jika sumber daya tersedia", warna: "Kuning" },
    { id: 4, nama: "Tinggi", rentang: "15 - 19", tindakan: "Diperlukan tindakan untuk mengelola risiko", warna: "Jingga" },
    { id: 5, nama: "Sangat Tinggi", rentang: "20 - 25", tindakan: "Diperlukan tindakan segera untuk mengelola risiko", warna: "Merah" },
  ];

  for (const item of levelRisikoData) {
    await prisma.levelRisiko.upsert({
      where: { id: item.id },
      update: {
        nama: item.nama,
        rentang: item.rentang,
        tindakan: item.tindakan,
        warna: item.warna,
      },
      create: {
        id: item.id,
        nama: item.nama,
        rentang: item.rentang,
        tindakan: item.tindakan,
        warna: item.warna,
      },
    });
  }
  console.log("Seeded LevelRisiko");

  // Seed UnitKerja (from Kertas Kerja template)
  const unitKerjaData = [
    { nama: "Sekretariat Utama", kode: "SESTAMA" },
    { nama: "Inspektorat", kode: "INSPEKTORAT" },
    { nama: "Direktorat Jenderal Pajak", kode: "DJP" },
    { nama: "Direktorat Jenderal Bea dan Cukai", kode: "DJBC" },
    { nama: "Pusat Pendidikan dan Pelatihan", kode: "2600" },
  ];

  for (const uk of unitKerjaData) {
    await prisma.unitKerja.upsert({
      where: { kode: uk.kode },
      update: {},
      create: uk,
    });
  }
  console.log("Seeded UnitKerja");

  // Seed Kegiatan
  const kegiatanNamaList = [
    "10 - DOKUMEN RKA-KL",
    "240 - ECONOMIC WIDE SURVEY (EWS)",
    "30 - LAPORAN MONITORING DAN EVALUASI KEGIATAN",
    "31 - LAPORAN AKUNTABILITAS KINERJA INSTANSI",
    "62 - LAYANAN REFORMASI BIROKRASI",
    "63 - LAYANAN STANDAR BIAYA",
    "64 - LAYANAN TRANSFORMASI STATISTIK",
    "85 - PENANGGUNG JAWAB PENGELOLA KEUANGAN",
    "9 - DOKUMEN RENJA-KL",
    "15 - GAJI DAN TUNJANGAN",
    "208 - PENYUSUNAN BUKU PEDOMAN ADMINISTRASI DAN NON TEKNIS",
    "32 - LAPORAN KEUANGAN",
    "35 - LAYANAN ADMINISTRASI KEUANGAN",
    "7 - DOKUMEN PERBENDAHARAAN : EVALUASI",
    "8 - DOKUMEN PERBENDAHARAAN : PELAKSANAAN",
    "36 - LAYANAN ADMINSTRASI PEGAWAI",
    "40 - LAYANAN JABATAN FUNGSIONAL",
    "46 - LAYANAN MUTASI PEGAWAI",
    "47 - LAYANAN PEMBINAAN DAN PENGEMBANGAN PEGAWAI",
    "80 - PELANTIKAN/PENGAMBILAN SUMPAH JABATAN",
    "93 - PENGELOLAAN KESEJAHTERAAN PEGAWAI",
    "207 - PENYUSUNAN BAHAN PUBLISITAS",
    "38 - LAYANAN BANTUAN HUKUM",
    "39 - LAYANAN HUMAS",
    "50 - LAYANAN PENATAAN ORGANISASI",
    "60 - LAYANAN PENYUSUNAN PRODUK HUKUM",
    "61 - LAYANAN PROTOKOLER DAN HUBUNGAN ANTAR LEMBAGA",
    "105 - PENGIRIMAN DAN PENCETAKAN DOKUMEN",
    "152 - PERAWATAN KENDARAAN BERMOTOR RODA 4/6/10 DAN RODA 2",
    "153 - PERAWATAN/PEMELIHARAAN SARANA DAN PRASARANA GEDUNG KANTOR",
    "44 - LAYANAN KERUMAHTANGGAAN",
    "51 - LAYANAN PENCETAKAN, ARSIP, DAN EKSPEDISI",
    "53 - LAYANAN PENGADAAN BARANG DAN JASA",
    "58 - LAYANAN PENGELOLAAN BMN",
    "67 - OPERASIONAL PERKANTORAN DAN PIMPINAN",
    "82 - PEMELIHARAAN BANGUNAN GEDUNG KANTOR DAN HALAMAN KANTOR",
    "117 - PENYUSUNAN DAN PENYEMPURANAAN KLASIFIKASI, KONSEP DEFINISI DAN UKURAN-UKURAN STATISTIK",
    "147 - PENYUSUNAN STATISTICAL BUSINESS REGISTER (SBR)",
    "197 - PEMUTAKHIRAN KERANGKA GEOSPASIAL DAN MUATAN WILKERSTAT",
    "199 - GLADI BERSIH PES SENSUS EKONOMI",
    "204 - UPDATING DIREKTORI USAHA/PERUSAHAAN EKONOMI LANJUTAN",
    "83 - PEMUTAKHIRAN KERANGKA GEOSPASIAL WILAYAH KERJA STATISTIK",
    "84 - PEMUTAKHIRAN SISTEM DAN PROGRAM MFD DAN MBS BERBASIS WEB",
    "94 - PENGEMBANGAN DESAIN SENSUS DAN SURVEI",
    "106 - PENGUATAN PENYELENGGARAAN PEMBINAAN STATISTIK SEKTORAL",
    "107 - PENINGKATAN KUALITAS DAN LAYANAN PUBLIKASI",
    "108 - PENIINGKATAN KUALITAS PENGELOLAAN DOKUMENTASI KOLEKSI DAN LAYANAN DATA",
    "110 - PENINGKATAN PELAYANAN METADATA KEGIATAN STATISTIK DASAR, SEKTORAL, DAN KHUSUS",
    "158 - PENINGKATAN PELAYANAN (PNBP)",
    "201 - PERSIAPAN DISEMINASI",
    "239 - SUVEI KEBUTUHAN DATA (SKD)",
    "81 - PELAYANAN PENGEMBANGAN INFORMASI STATISTIK",
    "102 - PENGEMBANGAN TIK",
    "154 - PERAWATAN/PEMELIHARAAN SARANA DAN PRASARANA TEKNOLOGI INFORMASI",
    "200 - GLADI BERSIH PENGOLAHAN SENSUS EKONOMI",
    "210 - PENGEMBANGAN INFRASTRUKTUR DAN LAYANAN TEKNOLOGI INFORMASI DAN KOMUNIKASI",
    "24 - INTEGRASI PENGOLAHAN DATA TERPADU",
    "91 - PENGADAAN TIK",
    "97 - PENGEMBANGAN LAYANAN JARINGAN KOMUNIKASI DATA DAN AKSES ONLINE",
    "99 - PENGEMBANGAN SISTEM INFORMASI DAN REKAYASA INFORMATIKA",
    "101 - SISTEM STATISTIK HAYATI INDONESIA",
    "104 - PENGHITNGAN PENDUDUK DAN RUMAH TANGGA UNTUK PENIMBANG SURVEI KEPENDUDUKAN",
    "144 - PENYUSUNAN PUBLIKASI ANALISIS MOBILITAS TENAGA KERJA HASIL SAKERNAS",
    "145 - PENYUSUNAN PUBLIKASI STATISTIK MOBILITAS PENDUDUK DAN TENAGA KERJA",
    "151 - PENYUSUNAN STATISTIK UPAH DAN PENDAPATAN",
    "161 - PUBLIKASI PROFIL MIGRAN HASIL SURVEI SOSIAL EKONOMI NASIONAL",
    "162 - SAKERNAS AGUSTUS",
    "163 - SURVEI ANGKATAN KERJA NASIONAL",
    "214 - SURVEI PENDUDUK ANTAR SENSUS (SUPAS)",
    "215 - LIFE TABLE INDONESIA",
    "216 - DIGITAL DEMOGRAFI",
    "217 - SATU DATA MIGRASI INTERNASIONAL",
    "68 - PEMBINAAN STATISTIK SEKTORAL",
    "195 - SUSENAS MODUL KOR DAN KONSUMSI (TERMASUK SERUTI)",
    "218 - STATISTIK KESEJAHTERAAN RAKYAT",
    "71 - PEMBINAAN STATISTIK SEKTORAL",
    "148 - PENYUSUNAN STATISTIK LINGKUNGAN HIDUP INDONESIA (SLHI)",
    "149 - PENYUSUNAN STATISTIK POLITIK DAN KEAMANAN",
    "150 - PENYUSUNAN STATISTIK SUMBER DAYA LAUT DAN PESISIR (SDLP)",
    "196 - SURVEI PERILAKU ANTI KORUPSI",
    "213 - SURVEI PENGUKURAN TINGKAT KEBAHAGIAAN",
    "3 - DATA DAN PENGHITUNGAN KEMISKINAN",
    "4 - DESA CANTIK",
    "69 - PEMBINAAN STATISTIK SEKTORAL",
    "87 - PEMUTAKHIRAN DAN PERKEMBANGAN DESA (PODES MINI)",
    "95 - PENGEMBANGAN INDIKATOR LINGKUNGAN HIDUP",
    "174 - SURVEI HORTIKULTURA DAN INDIKATOR PERTANIAN",
    "180 - SURVEI PERTANIAN TANAMAN PANGAN/UBINAN",
    "183 - SURVEI PERUSAHAAN PERKEBUNAN",
    "21 - IMPLEMENTASI PENGUMPULAN DATA KOMODITAS PERTANIAN STRATEGIS MELALUI RUMAH TANGGA",
    "219 - INDEPTH PENDATAAN STATISTIK TANAMAN BAWANG",
    "220 - SURVEI HORTIKULTURA POTENSI (SHOPI)",
    "221 - SURVEI STRUKTUR ONGKOS USAHA HORTIKULUTRA (SOUH)",
    "227 - SURVEI PERUSAHAAN HORTIKULTURA DAN USAHA HORTIKULTURA LAINNYA",
    "70 - PEMBINAAN STATISTIK SEKTORAL",
    "89 - PENDATAAN STATISTIK PERTANIAN TANAMAN PANGAN TERINTEGRASI DENGAN METODE KERANGKA SAMPEL AREA",
    "181 - SURVEI PERUSAHAAN KEHUTANAN",
    "182 - SURVEI PERUSAHAAN PERIKANAN, TPI/PPI/PP",
    "184 - SURVEI PERUSAHAAN PETERNAKAN DAN RPH/TPH",
    "228 - HPH (IUPHK-HA)",
    "229 - LAPORAN PERUSAHAAN PETERNAKAN UNGGAS",
    "230 - LAPORAN TAHUNAN PERUSAHAAN PENANGKAPAN IKAN (LTP)",
    "72 - PEMBINAAN STATISTIK SEKTORAL",
    "17 - IBS BULANAN",
    "176 - SURVEI KONSTRUKSI",
    "179 - SURVEI PERTAMBANGAN, ENERGI, PENGGALIAN, CAPTIVE POWER DAN UPDATING DIREKTORI",
    "18 - IBS TAHUNAN",
    "19 - IMK TAHUNAN",
    "20 - IMK TRIWULANAN",
    "231 - SURVEI TAHUNAN PERUSAHAAN INDUSTRI MANUFAKTUR (STPIM)",
    "232 - SURVEI INDUSTRI MIKRO KECIL (IMK) TAHUNAN",
    "75 - PEMBINAAN STATISTIK SEKTORAL",
    "109 - PENINGKATAN KUALITAS PENGISIAN DOKUMEN PEMBERITAHUAN EKSPOR BARANG (PEB)",
    "168 - SURVEI ANGKUTAN PENUMPAN DAN BARANG DI TERMINAL DAN JEMBATAN TIMBANG",
    "185 - SURVEI POLA DISTRIBUSI BARANG",
    "186 - SURVEI PROFIL PASAR, PUSAT PERDAGANGAN, DAN TOKO MODERN",
    "192 - SURVEI POLA USAHA NON PERTANIAN",
    "193 - SURVEI JASA PENUNJANG ANGKUTAN (PERGUDANGAN DAN KURIR)",
    "198 - GLADI BERSIH PENDATAAN SENSUS EKONOMI",
    "203 - UJICOBA PENDATAAN SENSUS EKONOMI LANJUTAN",
    "205 - PENGADAN INSTRUMEN",
    "206 - PELATIHAN INTAMA DAN INNAS",
    "211 - PENGEMBANGAN INFRASTRUKTUR DAN LAYANAN TEKNOLOGI INFORMASI DAN KOMUNIKASI",
    "212 - DUKUNGAN PENYELENGGARAAN TUGAS DAN FUNGSI UNIT",
    "223 - SURVEI POLA DISTRIBUSI PERDAGANGAN (POLDIS)",
    "224 - SENSUS EKONOMI 2026 (TAHAP PERSIAPAN)",
    "25 - KOMPILASI DATA STATISTIK EKSPOR",
    "26 - KOMPILASI DATA STATISTIK IMPOR",
    "27 - KOMPILASI DATA STATISTIK JASA TRANSPORTASI",
    "73 - PEMBINAAN STATISTIK SEKTORAL",
    "86 - PENDATAAN EKSPOR DILUAR DOKUMEN BEA CUKAI",
    "120 - INDEKS KESEJAHTERAAN PETANI",
    "157 - PENINGKATAN PELAYANAN (PNBP)",
    "170 - SURVEI HARGA KONSUMEN",
    "171 - SURVEI HARGA PERDAGANGAN BESAR",
    "172 - SURVEI HARGA PERDESAAN",
    "173 - SURVEI HARGA PRODUSEN GABAH",
    "189 - SURVEI STATISTIK HARGA PERDAGANGAN INTERNASIONAL",
    "190 - SURVEI STATISTIK HARGA PRODUSEN",
    "23 - INDEKS KEMAHALAN KONSTRUKSI",
    "74 - PEMBINAAN STATISTIK SEKTORAL",
    "122 - PENYUSUNAN INDEKS PEMBANGUNAN TEKNOLOGI INFORMASI DAN KOMUNIKASI (ICT DEVELOPMENT INDEX)",
    "123 - PENYUSUNAN INWARD FATS (FOREIGN AFFILIATE STATISTICS)",
    "156 - PASSANGER EXIT SURVEY",
    "165 - STATISTIK LEMBAGA KEUANGAN",
    "169 - SURVEI USAHA JASA DAN PARIWISATA",
    "175 - SURVEI KARAKTERISTIK USAHA (BUSINESS CHARACTERISTIKS SURVEY)",
    "177 - SURVEI OUTBOUND",
    "188 - SURVEI STATISTIK BADAN USAHA DAN PASAR MODAL",
    "191 - SURVEI STATISTIK KEUANGAN PEMERINTAH DAERAH",
    "194 - SURVEI WISATAWAN NUSANTARA",
    "225 - SURVEI HOTEL DAN JASA AKOMODASI LAINNYA (VHTL)",
    "226 - SURVEI USAHA PENYEDIAAN MAKANAN MINUMAN BERSKALA BESAR (VREST UMB)",
    "78 - PEMBINAAN STATISTIK SEKTORAL",
    "88 - SURVEI E-COMMERCE",
    "114 - PENYUSUNAN DAN PENGEMBANGAN NERACA PRODUKSI LAPANGAN USAHA BARANG",
    "115 - PENYUSUNAN DAN PENGEMBANGAN NERACA PRODUKSI LAPANGAN USAHA JASA",
    "116 - PENYUSUNAN DAN PENGEMBANGAN SUPPLY AND USE TABLE (SUT) DAN TABEL IO INDONESIA",
    "131 - PENYUSUNAN MATRIKS SUPPLY REGIONAL",
    "132 - PENYUSUNAN MATRIKS TRADE AND TRANSPORT MARGIN (TTM) BERBASIS SNA 2008",
    "136 - PENYUSUNAN NERACA SATELIT PARIWISATA (TSA)",
    "137 - PENYUSUNAN NILAI TAMBAH LAPANGAN USAHA BARANG TRIWULANAN 2010 = 100 (SKTNP BARANG)",
    "138 - PENYUSUNAN NILAI TAMBAH LAPANGAN USAHA JASA  TRIWULANAN 2010 = 100 (SKTNP JASA)",
    "139 - PENYUSUNAN PDB INDONESIA TAHUNAN, PENGEMBANGAN DAN KAJIAN IMPLEMENTASI SNA 2008",
    "140 - PENYUSUNAN PDB INDONESIA TRIWULANAN MENURUT LAPANGAN USAHA 2010 = 100",
    "141 - PERSIAPAN PERUBAHAN TAHUN DASAR PDB/PDRB LAPANGAN USAHA BERBASIS CVM",
    "143 - PENYUSUNAN PDB TAHUNAN DAN TRIWULANAN MENURUT LAPANGAN USAHA TAHUN DASAR 2010 = 100",
    "155 - PERCEPATAN PENGHITUNGAN PDRB PERKAPITA UNTUK INDIKATOR DAU",
    "167 - STUDY CHAINED VOLUME MEASURE",
    "22 - IMPLEMENTASI SEEA DALAM SISNERLING INDONESIA",
    "233 - SURVEI KHUSUS NERACA PRODUKSI TAHUNAN (SKNP)",
    "234 - INDEPTH STUDY SYSTEM OF ENVIROMENTAL ECONOMIC ACCOUNTING (SEEA)",
    "76 - PEMBINAAN STATISTIK SEKTORAL",
    "124 - PENYUSUNAN KOMPONEN EKSPOR/IMPOR BARANG DAN JASA TRIWULANAN/TAHUNAN DAN PENYUSUNAN SUT/IO SISI USES",
    "125 - PENYUSUNAN KOMPONEN PENGELUARAN PEMERINTAH TRIWULANAN/TAHUNAN DAN PENYUSUNAN SUT/IO SISI USES",
    "126 - PENYUSUNAN KOMPONEN PENGELUARAN RUMAH TANGGA DAN INSTITUSI NIRLABA TRIWULANAN/TAHUNAN DAN PENYUSUNAN SUT/IO SISI USES",
    "127 - PENYUSUNAN KOMPONEN PENGELUARAN PMTB DAN INVENTORY TRIWULANAN/TAHUNAN DAN PENYUSUNAN SUT/IO SISI USES",
    "128 - PENYUSUNAN KONSOLIDASI NERACA INSTITUSI (NIT)",
    "129 - PENYUSUNAN KONSOLIDASI PDB PENGELUARAN",
    "130 - PENYUSUNAN KONSOLIDASI PDB PENGELUARAN TRIWULANAN DAN TAHUNAN",
    "133 - PENYUSUNAN NERACA ARUS DANA DAN SEKTOR FINANSIAL",
    "134 - PENYUSUNAN NERACA PEMERINTAH DAN BADAN USAHA",
    "135 - PENYUSUNAN NERACA RUMAH TANGGA DAN INSTITUSI NIRLABA",
    "142 - PENYUSUNAN PDB/PDRB PENGELUARAN BERBASIS CVM",
    "146 - PENYUSUNAN SISTEM NERACA SOSIAL EKONOMI (SNSE) INDONESIA DAN STUDI PENYUSUNAN FINANSIAL SOCIAL ACCOUNTING MATRIX (FSAM)",
    "166 - STUDI PENYUSUNAN NATIONAL TRANSFER ACCOUNTS (NTA)",
    "235 - SURVEI KHUSUS PERUSAHAAN SWASTA NONFINANSIAL (SKPS)",
    "236 - SURVEI KHUSUS STUDI PENYUSUNAN PERUBAHAN INVENTORI (SKSPPI)",
    "79 - PEMBINAAN STATISTIK SEKTORAL",
    "98 - PENGEMBANGAN NERACA PENGELUARAN",
    "1 - ANALISIS DAN KAJIAN PENGEMBANGAN BIG DATA",
    "100 - PENGEMBANGAN SMALL AREA ESTIMATION",
    "103 - PENGHITUNGAN IPM",
    "111 - PENYEMPURNAAN DAN PENGEMBANGAN INDIKATOR SDGS",
    "112 - PENYEMPURNAAN DAN PENGEMBANGAN INDIKATOR EKONOMI",
    "113 - PENYEMPURNAAN DAN PENGEMBANGAN INDIKATOR SOSIAL",
    "118 - PENYUSUNAN HANDBOOK BPS-QAF",
    "121 - PENYUSUNAN INDEKS KETIMPANGAN GENDER",
    "13 - FORUM MASYARAKAT STATISTIK",
    "187 - SURVEI SELF ASSSESMENT",
    "2 - ANALISIS ISU TERKINI",
    "202 - PENYUSUNAN RANCANGAN ANALISIS",
    "237 - DATA INDEKS PEMBANGUNAN MANUSIA (IPM)",
    "238 - INDIKATOR SUSTAINABLE DEVELOPMENT GOALS (SDGS)",
    "77 - PEMBINAAN STATISTIK SEKTORAL",
    "209 - PROBITY AUDIT",
    "54 - LAYANAN PENGAWASAN INTERNAL INSPEKTORAT WILAYAH I",
    "55 - LAYANAN PENGAWASAN INTERNAL INSPEKTORAT WILAYAH II",
    "56 - LAYANAN PENGAWASAN INTERNAL INSPEKTORAT WILAYAH III",
  ];

  for (const nama of kegiatanNamaList) {
    const existing = await prisma.kegiatan.findFirst({ where: { nama } });
    if (!existing) {
      await prisma.kegiatan.create({ data: { nama } });
    }
  }
  console.log("Seeded Kegiatan");


  // 4. Seed LevelKemungkinan (1-5)
  const levelKemungkinanData = [
    { id: 1, nama: "Hampir Tidak Terjadi", skala: 1 },
    { id: 2, nama: "Jarang Terjadi", skala: 2 },
    { id: 3, nama: "Kadang Terjadi", skala: 3 },
    { id: 4, nama: "Sering Terjadi", skala: 4 },
    { id: 5, nama: "Hampir Pasti Terjadi", skala: 5 },
  ];

  for (const item of levelKemungkinanData) {
    await prisma.levelKemungkinan.upsert({
      where: { id: item.id },
      update: { nama: item.nama, skala: item.skala },
      create: { id: item.id, nama: item.nama, skala: item.skala },
    });
  }
  console.log("Seeded LevelKemungkinan");

  // 5. Seed LevelDampak (1-5)
  const levelDampakData = [
    { id: 1, nama: "Tidak Signifikan", skala: 1 },
    { id: 2, nama: "Minor", skala: 2 },
    { id: 3, nama: "Moderat", skala: 3 },
    { id: 4, nama: "Signifikan", skala: 4 },
    { id: 5, nama: "Sangat Signifikan", skala: 5 },
  ];

  for (const item of levelDampakData) {
    await prisma.levelDampak.upsert({
      where: { id: item.id },
      update: { nama: item.nama, skala: item.skala },
      create: { id: item.id, nama: item.nama, skala: item.skala },
    });
  }
  console.log("Seeded LevelDampak");

  // 6. Seed MatriksAnalisisRisiko (25 cells)
  const matrix = {
    5: { 1: 9, 2: 15, 3: 18, 4: 23, 5: 25 },
    4: { 1: 6, 2: 12, 3: 16, 4: 19, 5: 24 },
    3: { 1: 4, 2: 10, 3: 14, 4: 17, 5: 22 },
    2: { 1: 2, 2: 7, 3: 11, 4: 13, 5: 21 },
    1: { 1: 1, 2: 3, 3: 5, 4: 8, 5: 20 }
  };

  const getLevelRisikoId = (besaran: number) => {
    if (besaran >= 1 && besaran <= 5) return 1; // Sangat Rendah
    if (besaran >= 6 && besaran <= 10) return 2; // Rendah
    if (besaran >= 11 && besaran <= 14) return 3; // Sedang
    if (besaran >= 15 && besaran <= 19) return 4; // Tinggi
    return 5; // Sangat Tinggi
  };

  let matrixId = 1;
  for (const lkSkala of [1, 2, 3, 4, 5]) {
    for (const ldSkala of [1, 2, 3, 4, 5]) {
      const besaran = (matrix as any)[lkSkala][ldSkala];
      const levelRisikoId = getLevelRisikoId(besaran);

      // Find db IDs for lk and ld
      const lkDb = await prisma.levelKemungkinan.findFirst({ where: { skala: lkSkala } });
      const ldDb = await prisma.levelDampak.findFirst({ where: { skala: ldSkala } });

      if (lkDb && ldDb) {
        await (prisma as any).matriksAnalisisRisiko.upsert({
          where: { id: matrixId },
          update: {
            levelKemungkinanId: lkDb.id,
            levelDampakId: ldDb.id,
            besaran,
            levelRisikoId,
          },
          create: {
            id: matrixId,
            levelKemungkinanId: lkDb.id,
            levelDampakId: ldDb.id,
            besaran,
            levelRisikoId,
          },
        });
        matrixId++;
      }
    }
  }
  console.log("Seeded MatriksAnalisisRisiko");

  // 7. Seed AreaDampak / KriteriaDampak Kategori
  const areaDampakData = [
    { nama: "Penurunan Reputasi" },
    { nama: "Gangguan Terhadap Layanan Organisasi" },
    { nama: "Kecelakaan Kerja" },
    { nama: "Sanksi Pidana, Perdata, dan /atau Administratif" },
    { nama: "Fraud" }
  ];

  for (const item of areaDampakData) {
    const existing = await prisma.areaDampak.findFirst({ where: { nama: item.nama } });
    if (!existing) {
      await prisma.areaDampak.create({ data: item });
    }
  }
  console.log("Seeded AreaDampak");

  // 8. Seed KategoriRisiko
  const kategoriRisikoData = [
    { nama: "Penurunan Reputasi" },
    { nama: "Gangguan Terhadap Layanan Organisasi" },
    { nama: "Kecelakaan Kerja" },
    { nama: "Sanksi Pidana, Perdata, dan /atau Administratif" },
    { nama: "Fraud" }
  ];

  for (const item of kategoriRisikoData) {
    const existing = await prisma.kategoriRisiko.findFirst({ where: { nama: item.nama } });
    if (!existing) {
      await prisma.kategoriRisiko.create({ data: item });
    }
  }
  console.log("Seeded KategoriRisiko");

  // 9. Seed KriteriaDampak
  const kriteriaDampakData = [
    { nama: "Penurunan Reputasi", deskripsi: "Dampak terhadap citra dan reputasi instansi/perusahaan" },
    { nama: "Gangguan Terhadap Layanan Organisasi", deskripsi: "Dampak operasional pada kelancaran layanan" },
    { nama: "Kecelakaan Kerja", deskripsi: "Dampak terhadap keselamatan dan kesehatan pekerja" },
    { nama: "Sanksi Pidana, Perdata, dan /atau Administratif", deskripsi: "Dampak hukum akibat pelanggaran regulasi" },
    { nama: "Fraud", deskripsi: "Dampak finansial dan reputasional akibat tindakan kecurangan" }
  ];

  for (const item of kriteriaDampakData) {
    const existing = await prisma.kriteriaDampak.findFirst({ where: { nama: item.nama } });
    if (!existing) {
      await prisma.kriteriaDampak.create({ data: item });
    }
  }
  console.log("Seeded KriteriaDampak");

  // 10. Seed Roles and Permissions
  const roleCount = await prisma.role.count();
  if (roleCount === 0) {
    // Create Roles
    const adminRole = await prisma.role.create({
      data: {
        name: "admin",
        description: "Administrator with full access to all resources and actions.",
      },
    });

    const ketuaTimRole = await prisma.role.create({
      data: {
        name: "ketua tim",
        description: "Team leader with access to context, risk management, KRI, and reports, but restricted from administrative functions.",
      },
    });

    // Resources list
    const resources = [
      "sasaran",
      "prosesBisnis",
      "pemangkuKepentingan",
      "peraturanPerundangan",
      "jenisRisiko",
      "sumberRisiko",
      "kategoriRisiko",
      "areaDampak",
      "levelKemungkinan",
      "levelDampak",
      "levelRisiko",
      "opsiPenanganan",
      "kriteriaKemungkinan",
      "kriteriaDampak",
      "seleraRisiko",
      "identifikasiRisiko",
      "analisisRisiko",
      "evaluasiRisiko",
      "rencanaPenanganan",
      "kegiatan",
      "unitKerja",
      "kri",
      "matriksAnalisisRisiko",
      "faq",
      "users",
      "roles",
      "audit-logs",
    ];

    const actions = ["create", "read", "update", "delete"];
    const createdPermissions: any[] = [];

    // Create all combinations of resource & action
    for (const res of resources) {
      for (const act of actions) {
        const perm = await prisma.permission.create({
          data: {
            resource: res,
            action: act,
          },
        });
        createdPermissions.push(perm);
      }
    }

    // Map all permissions to Admin
    await prisma.rolePermission.createMany({
      data: createdPermissions.map((perm) => ({
        roleId: adminRole.id,
        permissionId: perm.id,
      })),
    });

    // Map subset of permissions to Ketua Tim (excluding administrative resources: users, roles, audit-logs; faq only read)
    const ketuaTimPermissions = createdPermissions.filter(
      (perm) => !["users", "roles", "audit-logs"].includes(perm.resource)
        && !(perm.resource === "faq" && perm.action !== "read")
    );
    await prisma.rolePermission.createMany({
      data: ketuaTimPermissions.map((perm) => ({
        roleId: ketuaTimRole.id,
        permissionId: perm.id,
      })),
    });

    // Create default users linked to roles
    await prisma.user.create({
      data: {
        email: "admin@erm.com",
        name: "Administrator",
        password: "admin123",
        roleId: adminRole.id,
      },
    });

    await prisma.user.create({
      data: {
        email: "ketuatim@erm.com",
        name: "Ketua Tim",
        password: "tim123",
        roleId: ketuaTimRole.id,
      },
    });

    console.log("Seeded Roles, Permissions, User-Role Mappings, and Junction Tables");
  }

  // Always ensure all expected permissions exist (idempotent - handles new resources added later)
  const resources = [
    "sasaran",
    "prosesBisnis",
    "pemangkuKepentingan",
    "peraturanPerundangan",
    "jenisRisiko",
    "sumberRisiko",
    "kategoriRisiko",
    "areaDampak",
    "levelKemungkinan",
    "levelDampak",
    "levelRisiko",
    "opsiPenanganan",
    "kriteriaKemungkinan",
    "kriteriaDampak",
    "seleraRisiko",
    "identifikasiRisiko",
    "analisisRisiko",
    "evaluasiRisiko",
    "rencanaPenanganan",
    "kegiatan",
    "unitKerja",
    "kri",
    "matriksAnalisisRisiko",
    "faq",
    "users",
    "roles",
    "audit-logs",
  ];
  const actions = ["create", "read", "update", "delete"];

  for (const res of resources) {
    for (const act of actions) {
      const existing = await prisma.permission.findUnique({
        where: { resource_action: { resource: res, action: act } },
      });
      if (!existing) {
        const perm = await prisma.permission.create({
          data: { resource: res, action: act },
        });
        console.log(`Created missing permission: ${res}:${act}`);

        // Assign to admin role
        const adminRole = await prisma.role.findFirst({ where: { name: "admin" } });
        if (adminRole) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: perm.id },
          });
          console.log(`Assigned ${res}:${act} to admin role`);
        }
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());