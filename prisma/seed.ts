import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password-utils";
import { DEFAULT_PROSES_BISNIS } from "./proses-bisnis-data";
import { DEFAULT_AREA_DAMPAK } from "./area-dampak-data";
import { TEAM_2026_DATA } from "./team-2026-data";

const defaultFaqs = [
  {
    order: 10,
    question: "Apa itu manajemen risiko di aplikasi Risk?",
    answer:
      "<p>Manajemen risiko adalah proses mengenali hal yang dapat mengganggu pencapaian tujuan, menilai seberapa besar risikonya, menentukan respons, lalu memantau penanganannya.</p><p>Di aplikasi Risk, alurnya dibuat berurutan: mulai dari Penetapan Konteks, Identifikasi Risiko, Analisis Risiko, Evaluasi Risiko, Rencana Penanganan, Pemantauan Risiko, sampai Pelaporan Risiko.</p>",
  },
  {
    order: 20,
    question: "Apa arti periode data dan tahun risiko?",
    answer:
      "<p>Periode data adalah tahun kerja yang sedang dipakai aplikasi untuk menampilkan data risiko. Jika periode dipilih 2026, maka daftar risiko, dokumen, pemantauan, dan laporan yang berhubungan dengan tahun 2026 akan lebih mudah ditemukan.</p><p>Tahun risiko pada dokumen dipakai agar pencarian dan repositori dapat memfilter dokumen sesuai periode manajemen risiko yang relevan.</p>",
  },
  {
    order: 30,
    question: "Urutan kerja yang disarankan untuk mengisi manajemen risiko apa saja?",
    answer:
      "<p>Urutan yang disarankan adalah:</p><ol><li>Isi Penetapan Konteks sebagai data dasar.</li><li>Masuk ke Identifikasi Risiko untuk mencatat risiko.</li><li>Lanjutkan ke Analisis Risiko untuk menilai kemungkinan dan dampak.</li><li>Gunakan Evaluasi Risiko untuk menentukan respons.</li><li>Buat Rencana Penanganan jika risiko perlu dikurangi.</li><li>Update Pemantauan Risiko saat rencana sudah berjalan.</li><li>Gunakan Pelaporan Risiko untuk rekap dan persetujuan.</li></ol>",
  },
  {
    order: 40,
    question: "Apa yang harus diisi di Penetapan Konteks?",
    answer:
      "<p>Penetapan Konteks berisi data referensi yang menjadi dasar proses manajemen risiko, seperti sasaran, tim kerja, kegiatan, proses bisnis, pemangku kepentingan, peraturan, jenis risiko, sumber risiko, kategori risiko, area dampak, level kemungkinan, level dampak, matriks risiko, selera risiko, dan opsi penanganan.</p><p>Mulailah dari sasaran dan proses bisnis karena data ini biasanya dipakai lagi saat identifikasi risiko.</p>",
  },
  {
    order: 50,
    question: "Data referensi mana yang biasanya perlu diisi lebih dulu?",
    answer:
      "<p>Untuk pengguna baru, fokus dulu pada data yang paling sering dipakai: Tim Kerja, Kegiatan, Sasaran, Proses Bisnis, Pemangku Kepentingan, dan Peraturan Perundangan.</p><p>Data seperti level risiko, level kemungkinan, level dampak, kategori risiko, dan opsi penanganan biasanya sudah disiapkan sebagai acuan, tetapi tetap bisa dikelola oleh admin jika perlu disesuaikan.</p>",
  },
  {
    order: 60,
    question: "Bagaimana cara menambahkan risiko baru?",
    answer:
      "<p>Buka Manajemen Risiko, lalu masuk ke Identifikasi Risiko. Pilih konteks yang sesuai seperti kegiatan atau proses bisnis, kemudian tambahkan risiko.</p><p>Isi pernyataan risiko dengan kalimat yang jelas. Format yang mudah dipahami adalah kejadian risiko, penyebab, dan dampaknya terhadap sasaran atau proses kerja.</p>",
  },
  {
    order: 70,
    question: "Apa beda risiko, penyebab, dan dampak?",
    answer:
      "<p>Risiko adalah peristiwa yang mungkin terjadi dan dapat memengaruhi tujuan. Penyebab adalah hal yang memicu risiko tersebut. Dampak adalah akibat jika risiko benar-benar terjadi.</p><p>Contoh: risiko adalah data terlambat diterima, penyebabnya koordinasi dengan sumber data belum efektif, dampaknya publikasi atau layanan dapat terlambat.</p>",
  },
  {
    order: 80,
    question: "Bagaimana cara mengisi Analisis Risiko?",
    answer:
      "<p>Di Analisis Risiko, nilai kemungkinan dan dampak risiko menggunakan skala yang tersedia. Aplikasi akan membantu menghasilkan besaran atau level risiko berdasarkan matriks yang sudah ditetapkan.</p><p>Jika ada pengendalian yang sudah pernah dilakukan, catat pengendalian tersebut dan nilai efektivitasnya agar kondisi risiko aktual lebih jelas.</p>",
  },
  {
    order: 90,
    question: "Apa itu level kemungkinan, level dampak, dan level risiko?",
    answer:
      "<p>Level kemungkinan menggambarkan seberapa besar peluang risiko terjadi. Level dampak menggambarkan seberapa besar akibatnya bila terjadi. Level risiko adalah hasil penilaian gabungan dari kemungkinan dan dampak.</p><p>Warna atau kategori level risiko membantu menentukan prioritas, misalnya risiko rendah, sedang, tinggi, atau sangat tinggi.</p>",
  },
  {
    order: 100,
    question: "Apa fungsi Evaluasi Risiko?",
    answer:
      "<p>Evaluasi Risiko dipakai untuk menentukan respons terhadap risiko setelah dianalisis. Respons dapat berupa menerima, menghindari, mengalihkan, atau mengurangi risiko, sesuai kondisi dan kebijakan organisasi.</p><p>Jika responsnya mengurangi risiko, biasanya proses dilanjutkan ke Rencana Penanganan.</p>",
  },
  {
    order: 110,
    question: "Kapan perlu membuat Rencana Penanganan Risiko?",
    answer:
      "<p>Rencana Penanganan Risiko dibuat ketika risiko perlu dikurangi atau dimitigasi. Isi rencana dengan tindakan yang akan dilakukan, target output, target waktu, penanggung jawab, dan target residual setelah penanganan.</p><p>Rencana yang baik sebaiknya spesifik, punya penanggung jawab, dan bisa dibuktikan progresnya.</p>",
  },
  {
    order: 120,
    question: "Bagaimana mengisi Pemantauan Risiko?",
    answer:
      "<p>Pemantauan Risiko dipakai untuk mencatat pelaksanaan rencana penanganan. Update realisasi output, realisasi waktu, status progres, dan unggah bukti pendukung jika tersedia.</p><p>Dokumen pendukung yang diunggah dari pemantauan dapat membantu pelaporan dan memperkuat jejak audit.</p>",
  },
  {
    order: 130,
    question: "Apa fungsi Pelaporan Risiko?",
    answer:
      "<p>Pelaporan Risiko digunakan untuk melihat rekap risiko, menyusun laporan, dan mencatat persetujuan. Pada bagian persetujuan, isi status laporan dan nama pejabat atau approver yang menyetujui.</p><p>Gunakan menu ini saat data risiko sudah cukup lengkap dan siap dilaporkan.</p>",
  },
  {
    order: 140,
    question: "Apa fungsi Bank Risiko?",
    answer:
      "<p>Bank Risiko adalah kumpulan risiko yang dapat dipakai ulang sebagai referensi. Menu ini membantu pengguna mencari contoh risiko yang mirip sehingga input risiko tidak selalu dimulai dari nol.</p><p>Walaupun mengambil referensi dari Bank Risiko, tetap sesuaikan pernyataan risiko, penyebab, dan dampaknya dengan konteks unit kerja atau kegiatan masing-masing.</p>",
  },
  {
    order: 150,
    question: "Apa fungsi Repositori Dokumen?",
    answer:
      "<p>Repositori Dokumen adalah tempat menyimpan, mengarsipkan, dan mencari dokumen pendukung manajemen risiko. Kategori dokumen mencakup pedoman dan kebijakan, bukti dukung mitigasi, serta laporan dan risalah.</p><p>Gunakan pencarian cerdas untuk menemukan dokumen berdasarkan judul, risiko terkait, ringkasan AI, atau isi dokumen yang sudah berhasil diproses.</p>",
  },
  {
    order: 160,
    question: "Kenapa dokumen di Repositori punya tahun risiko?",
    answer:
      "<p>Tahun risiko membantu aplikasi mengaitkan dokumen dengan periode manajemen risiko tertentu. Saat upload dokumen, pilih tahun risiko yang sesuai dengan konteks dokumen tersebut.</p><p>Filter Tahun Risiko pada pencarian memakai nilai ini, sehingga dokumen tahun 2025 dan 2026 tidak tercampur saat pengguna mencari bukti atau laporan.</p>",
  },
  {
    order: 170,
    question: "Bagaimana menggunakan ringkasan AI di Repositori Dokumen?",
    answer:
      "<p>Pada daftar dokumen, gunakan tombol Ringkasan untuk meminta aplikasi merangkum isi dokumen. Ringkasan membantu memahami isi file tanpa harus membaca dokumen dari awal.</p><p>Hasil ringkasan tetap perlu dicek oleh pengguna, terutama jika dokumen berisi informasi penting, istilah teknis, atau keputusan resmi.</p>",
  },
  {
    order: 180,
    question: "Apa fungsi Audit Log?",
    answer:
      "<p>Audit Log menampilkan riwayat aktivitas penting di aplikasi, seperti penambahan, perubahan, atau penghapusan data. Menu ini membantu admin melacak siapa yang melakukan perubahan dan kapan perubahan dilakukan.</p><p>Jika ada data yang terasa berubah tiba-tiba, cek Audit Log sebagai langkah awal.</p>",
  },
  {
    order: 190,
    question: "Bagaimana mengatur pengguna, role, dan permission?",
    answer:
      "<p>Admin dapat mengelola akses dari menu Manajemen Akses. Pengguna ditempatkan pada role tertentu, lalu role tersebut memiliki permission untuk membaca, membuat, memperbarui, atau menghapus data pada menu tertentu.</p><p>Jika sebuah tombol atau menu tidak muncul, kemungkinan akun belum memiliki permission yang sesuai.</p>",
  },
  {
    order: 200,
    question: "Kenapa saya tidak bisa melihat menu atau tombol tertentu?",
    answer:
      "<p>Menu dan tombol mengikuti hak akses akun. Jika pengguna tidak memiliki permission untuk suatu fitur, aplikasi dapat menyembunyikan menu atau membatasi tindakan seperti tambah, edit, dan hapus.</p><p>Hubungi admin aplikasi dan sebutkan menu yang dibutuhkan agar role atau permission akun bisa diperiksa.</p>",
  },
  {
    order: 210,
    question: "Apa fungsi notifikasi di aplikasi?",
    answer:
      "<p>Notifikasi membantu pengguna melihat informasi penting, pengingat, atau perubahan yang perlu ditindaklanjuti. Buka pusat notifikasi untuk membaca daftar notifikasi dan menandai notifikasi yang sudah selesai dibaca.</p>",
  },
  {
    order: 220,
    question: "Bagaimana memakai chat bantuan?",
    answer:
      "<p>Chat bantuan menjawab pertanyaan berdasarkan FAQ aplikasi. Tulis pertanyaan dengan kata sederhana, misalnya cara upload dokumen, kenapa menu tidak muncul, atau apa itu analisis risiko.</p><p>Jika jawaban belum cocok, coba gunakan kata kunci lain atau buka halaman FAQ untuk membaca daftar panduan lengkap.</p>",
  },
  {
    order: 230,
    question: "Apa yang harus dilakukan kalau data tidak muncul setelah disimpan?",
    answer:
      "<p>Periksa dulu filter yang sedang aktif, seperti periode data, tahun risiko, kategori, status, atau kata kunci pencarian. Data yang tersimpan di tahun atau kategori berbeda bisa terlihat seperti hilang jika filter belum sesuai.</p><p>Jika masih belum muncul, refresh halaman dan cek apakah akun memiliki akses ke menu tersebut.</p>",
  },
  {
    order: 240,
    question: "Bagaimana cara kerja mode gelap dan mode terang?",
    answer:
      "<p>Mode gelap dan mode terang hanya mengubah tampilan warna aplikasi agar nyaman dibaca. Data, filter, dan hak akses tidak berubah saat tema diganti.</p><p>Jika ada teks atau tombol yang sulit dibaca pada tema tertentu, laporkan ke admin atau pengembang agar warna komponennya bisa disesuaikan.</p>",
  },
];

async function seedDefaultFaqs() {
  const legacyFaqQuestions = [
    "<p>Bagaimana menambahkan risiko?</p>",
    "<p>Cara upload dokumen</p>",
  ];

  await prisma.faq.updateMany({
    where: {
      order: 0,
      question: { in: legacyFaqQuestions },
    },
    data: { order: 900 },
  });

  for (const faq of defaultFaqs) {
    const existing = await prisma.faq.findFirst({
      where: { question: faq.question },
      select: { id: true },
    });

    if (existing) {
      await prisma.faq.update({
        where: { id: existing.id },
        data: {
          answer: faq.answer,
          order: faq.order,
        },
      });
      continue;
    }

    await prisma.faq.create({ data: faq });
  }

  console.log("Seeded default FAQs");
}

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

  // Seed Team
  const teamData = TEAM_2026_DATA;

  for (const t of teamData) {
    await prisma.team.upsert({
      where: { kode: t.kode },
      update: t,
      create: t,
    });
  }
  console.log("Seeded Teams");

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

  for (const nama of DEFAULT_PROSES_BISNIS) {
    const existing = await prisma.prosesBisnis.findFirst({ where: { nama } });
    if (!existing) {
      await prisma.prosesBisnis.create({ data: { nama } });
    }
  }
  console.log("Seeded ProsesBisnis");


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
  for (const item of DEFAULT_AREA_DAMPAK) {
    const existing = await prisma.areaDampak.findFirst({
      where: {
        OR: [
          { kode: item.kode },
          { nama: { in: [...item.aliases], mode: "insensitive" } },
        ],
      },
    });

    if (
      existing &&
      (existing.kode !== item.kode || existing.nama !== item.nama)
    ) {
      await prisma.areaDampak.update({
        where: { id: existing.id },
        data: { kode: item.kode, nama: item.nama },
      });
    } else if (!existing) {
      await prisma.areaDampak.create({
        data: { kode: item.kode, nama: item.nama },
      });
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

    const anggotaTimRole = await prisma.role.create({
      data: {
        name: "anggota tim",
        description: "Team member with access to context, risk management, KRI, and reports, but restricted from administrative functions.",
      },
    });

    // Resources list - use kebab-case for consistency with API routes
    const resources = [
      "sasaran",
      "proses-bisnis",
      "pemangku-kepentingan",
      "peraturan-perundangan",
      "jenis-risiko",
      "sumber-risiko",
      "kategori-risiko",
      "area-dampak",
      "level-kemungkinan",
      "level-dampak",
      "level-risiko",
      "opsi-penanganan",
      "kriteria-kemungkinan",
      "kriteria-dampak",
      "matriks-risiko",
      "selera-risiko",
      "identifikasi-risiko",
      "analisis-risiko",
      "evaluasi-risiko",
      "rencana-penanganan",
      "kegiatan",
      "unit-kerja",
      "kri",
      "matriks-analisis-risiko",
      "repositori",
      "upload",
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
        && !(["repositori", "upload"].includes(perm.resource) && perm.action !== "read")
    );
    await prisma.rolePermission.createMany({
      data: [
        ...ketuaTimPermissions.map((perm) => ({
          roleId: ketuaTimRole.id,
          permissionId: perm.id,
        })),
        ...ketuaTimPermissions.map((perm) => ({
          roleId: anggotaTimRole.id,
          permissionId: perm.id,
        })),
      ],
    });

    // Create default users linked to roles
     await prisma.user.create({
       data: {
         email: "admin@mr.com",
         name: "Administrator",
         password: hashPassword("admin123"),
         roleId: adminRole.id,
       },
     });

     await prisma.user.create({
       data: {
         email: "ketuatim@mr.com",
         name: "Ketua Tim",
         password: hashPassword("tim123"),
         roleId: ketuaTimRole.id,
       },
     });

    console.log("Seeded Roles, Permissions, User-Role Mappings, and Junction Tables");
  }

// Always ensure all expected permissions exist (idempotent - handles new resources added later)
  const resources = [
    "sasaran",
    "proses-bisnis",
    "pemangku-kepentingan",
    "peraturan-perundangan",
    "jenis-risiko",
    "sumber-risiko",
    "kategori-risiko",
    "area-dampak",
    "level-kemungkinan",
    "level-dampak",
    "level-risiko",
    "opsi-penanganan",
    "kriteria-kemungkinan",
    "kriteria-dampak",
    "matriks-risiko",
    "selera-risiko",
    "identifikasi-risiko",
    "analisis-risiko",
    "evaluasi-risiko",
    "rencana-penanganan",
    "kegiatan",
    "unit-kerja",
    "kri",
    "matriks-analisis-risiko",
    "repositori",
    "upload",
    "faq",
    "users",
    "roles",
    "permissions",
    "audit-logs",
    "teams",
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

  await seedDefaultFaqs();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
