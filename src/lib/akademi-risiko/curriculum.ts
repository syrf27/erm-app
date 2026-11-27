export type LessonTrack = "Dasar" | "Praktik Terbimbing";
export type SourceStatus = "ketentuan-resmi" | "ilustrasi-pembelajaran" | "perlu-konfirmasi";
export type LessonInteraction = "goal-map" | "risk-chain" | "principle-match" | "role-map" | "cycle-map" | "dilemma" | "context" | "identification" | "matrix" | "appetite" | "rtp" | "monitoring" | "integrated";

export type LessonTraceability = {
  competence: string;
  source: string;
  provision: string;
  adaptedExample: string;
  assumptions: string;
  confirmationNeeded?: string;
};

export type AcademyLesson = {
  id: string;
  track: LessonTrack;
  number: number;
  title: string;
  duration: number;
  summary: string;
  interaction: LessonInteraction;
  steps: { title: string; text: string; insight: string; changes: string[] }[];
  traceability: LessonTraceability;
};

const illustrative = "Seluruh nama kegiatan, kondisi, dan pilihan pada simulasi ini adalah ilustrasi pembelajaran; bukan data atau kejadian nyata Pusdiklat.";

export const academyLessons: AcademyLesson[] = [
  {
    id: "mengapa-risiko-pusdiklat", track: "Dasar", number: 1, duration: 10,
    title: "Mengapa Pegawai Pusdiklat Perlu Memahami Risiko?",
    summary: "Hubungkan sasaran kegiatan pelatihan dengan ketidakpastian yang dapat menghambat pencapaiannya.", interaction: "goal-map",
    steps: [
      { title: "Mulai dari sasaran", text: "Manajemen risiko membantu organisasi mencapai sasaran. Dalam simulasi ini, pilih sasaran program pelatihan yang ingin dijaga.", insight: "Risiko bukan daftar masalah terpisah; risiko selalu dinilai terhadap sasaran.", changes: ["Peta sasaran program pelatihan ditampilkan."] },
      { title: "Lihat ketidakpastian", text: "Buka satu kondisi yang belum pasti, lalu hubungkan dengan sasaran yang mungkin terpengaruh.", insight: "Ketidakpastian dapat berasal dari informasi, sumber daya, pihak terkait, atau perubahan kondisi.", changes: ["Kondisi ilustratif muncul pada alur kegiatan."] },
      { title: "Rumuskan risiko", text: "Rangkaikan sasaran → kegiatan → ketidakpastian → risiko → dampak. Perhatikan dampaknya kembali ke sasaran.", insight: "Pengelolaan risiko adalah dasar pengambilan keputusan untuk menjaga pencapaian sasaran.", changes: ["Hubungan sebab dan dampak menyala pada peta."] },
    ],
    traceability: { competence: "Menghubungkan risiko dengan tujuan pekerjaan sehari-hari.", source: "Bab 2 (definisi) hlm. 13; Bab 5 (proses) hlm. 24 dst.", provision: "Risiko adalah efek ketidakpastian terhadap sasaran.", adaptedExample: "Program pelatihan Pusdiklat.", assumptions: illustrative, confirmationNeeded: "Sasaran, indikator, dan proses bisnis Pusdiklat yang aktual." },
  },
  {
    id: "penyebab-peristiwa-dampak", track: "Dasar", number: 2, duration: 12, title: "Mengenali Penyebab, Peristiwa, dan Dampak", summary: "Susun rantai risiko dari kasus pengembangan materi.", interaction: "risk-chain",
    steps: [{ title: "Pisahkan unsur risiko", text: "Susun kondisi, peristiwa, dan dampak pada rantai yang benar.", insight: "Penyebab bukan peristiwa; dampak adalah konsekuensi terhadap sasaran.", changes: ["Kartu kasus berpindah ke rantai sebab-akibat."] }],
    traceability: { competence: "Membedakan penyebab, peristiwa, dampak, dan masalah yang sudah terjadi.", source: "Bab 2 hlm. 13; Bab 5.2.4 Identifikasi Risiko.", provision: "Risiko dinilai terkait sasaran, sumber, kejadian, dan dampak.", adaptedExample: "Materi pelatihan belum diperbarui.", assumptions: illustrative },
  },
  {
    id: "prinsip-mr", track: "Dasar", number: 3, duration: 10, title: "Prinsip Manajemen Risiko dalam Pekerjaan", summary: "Cocokkan prinsip BPS dengan tindakan kerja sehari-hari.", interaction: "principle-match",
    steps: [{ title: "Prinsip menjadi tindakan", text: "Pilih tindakan yang menunjukkan prinsip terintegrasi, inklusif, dinamis, dan berbasis informasi terbaik.", insight: "Prinsip mengarahkan cara bekerja, bukan sekadar istilah di dokumen.", changes: ["Prinsip terhubung dengan tindakan pada aktivitas pelatihan."] }],
    traceability: { competence: "Menghubungkan prinsip dengan perilaku sehari-hari.", source: "Bagian 3 Prinsip MR hlm. 14–15.", provision: "Delapan prinsip ISO 31000:2018 digunakan dalam pedoman.", adaptedExample: "Melibatkan pengajar dan memperbarui risiko saat jadwal berubah.", assumptions: illustrative },
  },
  {
    id: "peran-tiga-lini", track: "Dasar", number: 4, duration: 12, title: "Siapa Berperan dalam Manajemen Risiko Pusdiklat?", summary: "Petakan peran tiga lini dalam pengelolaan risiko.", interaction: "role-map",
    steps: [{ title: "Bagikan peran", text: "Seret tanggung jawab ke lini yang tepat: pemilik/pengelola risiko, pendukung UMR, atau pengawasan independen.", insight: "Pembagian peran menjaga kepemilikan, dukungan, dan pengawasan tetap berbeda.", changes: ["Alur koordinasi, pelaporan, dan persetujuan terbentuk."] }],
    traceability: { competence: "Memahami kerangka dan peran tiga lini.", source: "Bab 4, khususnya hlm. 18–22.", provision: "Kepala Pusdiklat adalah Pemilik Risiko eselon II; Pengelola Risiko ditunjuk; Bagian Umum Pusdiklat mendukung UMR lini kedua.", adaptedExample: "Koordinasi register risiko kegiatan pelatihan.", assumptions: illustrative, confirmationNeeded: "SK/penunjukan Pengelola Risiko dan susunan fungsi pengawasan internal Pusdiklat." },
  },
  {
    id: "siklus-mr-bps", track: "Dasar", number: 5, duration: 10, title: "Mengenal Siklus Manajemen Risiko BPS", summary: "Ikuti satu risiko dari konteks hingga pelaporan.", interaction: "cycle-map",
    steps: [{ title: "Proses yang saling terhubung", text: "Jelajahi penetapan konteks, identifikasi, analisis, evaluasi, penanganan, pemantauan, dan pelaporan.", insight: "Komunikasi/konsultasi serta pemantauan/tinjauan berlangsung sepanjang proses.", changes: ["Aliran proses dapat kembali ke tahap sebelumnya ketika kondisi berubah."] }],
    traceability: { competence: "Memahami gambaran proses MR BPS.", source: "Bab 5 Proses Manajemen Risiko, hlm. 24 dst.", provision: "Proses dikelola secara berulang dan terdokumentasi.", adaptedExample: "Risiko ketersediaan pengajar pelatihan.", assumptions: illustrative },
  },
  {
    id: "budaya-sadar-risiko", track: "Dasar", number: 6, duration: 10, title: "Budaya Sadar Risiko", summary: "Hadapi dilema evidence, eskalasi, dan tindak lanjut RTP.", interaction: "dilemma",
    steps: [{ title: "Pilih tindakan yang dapat dipertanggungjawabkan", text: "Tentukan respons ketika evidence belum tersedia atau kondisi kegiatan berubah.", insight: "Kualitas informasi risiko memengaruhi keputusan pimpinan dan pencapaian sasaran.", changes: ["Konsekuensi terhadap informasi dan keputusan terlihat."] }],
    traceability: { competence: "Memahami keterbukaan, evidence, eskalasi, dan pembelajaran.", source: "Prinsip MR hlm. 14–15; pemantauan/pelaporan Bab 5.", provision: "Informasi terbaik tersedia dan perbaikan berkelanjutan merupakan prinsip MR.", adaptedExample: "Keterlambatan evidence RTP.", assumptions: illustrative },
  },
  {
    id: "lingkup-konteks-kriteria", track: "Praktik Terbimbing", number: 7, duration: 15, title: "Lingkup, Konteks, dan Kriteria", summary: "Tetapkan konteks satu kegiatan Pusdiklat sebelum menilai risiko.", interaction: "context",
    steps: [{ title: "Bangun dasar penilaian", text: "Lengkapi sasaran, proses bisnis, stakeholder, konteks, kategori, dan kriteria sebelum menganalisis.", insight: "Kriteria yang jelas menjaga penilaian tetap konsisten.", changes: ["Kanvas konteks membentuk batas simulasi."] }],
    traceability: { competence: "Menetapkan lingkup, konteks, dan kriteria.", source: "Bagian 5.2.1–5.2.8, khususnya hlm. 32–54.", provision: "Piagam, ruang lingkup, konteks, kriteria, matriks, selera dan toleransi menjadi dasar proses.", adaptedExample: "Kegiatan pengembangan materi pelatihan.", assumptions: illustrative, confirmationNeeded: "Piagam dan selera risiko Pusdiklat yang disahkan." },
  },
  {
    id: "identifikasi-risiko", track: "Praktik Terbimbing", number: 8, duration: 15, title: "Identifikasi Risiko", summary: "Kumpulkan informasi dan susun risiko berdasarkan sasaran.", interaction: "identification",
    steps: [{ title: "Dari informasi menjadi risiko", text: "Pilih informasi stakeholder yang relevan untuk merumuskan penyebab, peristiwa, dampak, sumber, kategori, dan pengendalian yang ada.", insight: "Sumber risiko bergantung pada penyebab dan batas organisasi; tidak selalu internal atau eksternal.", changes: ["Bukti informasi menambah detail pada register latihan."] }],
    traceability: { competence: "Mengidentifikasi risiko secara terstruktur.", source: "Bagian 5.2.4 Identifikasi Risiko.", provision: "Identifikasi dilakukan terhadap sasaran dengan mempertimbangkan sumber dan pengendalian yang ada.", adaptedExample: "Data kebutuhan kompetensi belum lengkap.", assumptions: illustrative },
  },
  {
    id: "analisis-matriks-bps", track: "Praktik Terbimbing", number: 9, duration: 15, title: "Analisis Risiko dengan Matriks BPS", summary: "Nilai kemungkinan dan dampak dengan matriks lookup resmi BPS.", interaction: "matrix",
    steps: [{ title: "Gerakkan titik pada matriks", text: "Pilih kemungkinan dan dampak berdasarkan evidence latihan. Besaran risiko dibaca dari sel matriks, bukan hasil perkalian.", insight: "Kemungkinan rendah dengan dampak sangat besar dapat menjadi sangat tinggi.", changes: ["Titik dan label level bergerak mengikuti pilihan Anda."] }],
    traceability: { competence: "Menganalisis risiko dengan matriks BPS.", source: "Bagian 5.2.6 hlm. 51–52.", provision: "Matriks 5×5 BPS dan pengkategorian risiko resmi.", adaptedExample: "Ketersediaan pengajar dan dampak pada jadwal pelatihan.", assumptions: illustrative },
  },
  {
    id: "evaluasi-selera-toleransi", track: "Praktik Terbimbing", number: 10, duration: 12, title: "Evaluasi, Selera, Toleransi, dan Prioritas", summary: "Bandingkan skor dengan selera unit dan toleransi BPS.", interaction: "appetite",
    steps: [{ title: "Ambil keputusan dengan batas yang tepat", text: "Uji skor terhadap selera unit latihan dan toleransi maksimum BPS sebesar 11.", insight: "Risiko dalam toleransi tetap dipantau; risiko di atas 11 memerlukan evaluasi dan/atau RTP.", changes: ["Garis selera dan toleransi membagi peta keputusan."] }],
    traceability: { competence: "Menentukan prioritas dengan selera dan toleransi.", source: "Bagian 5.2.7 hlm. 52–53.", provision: "Toleransi maksimal BPS 11; selera unit tidak boleh melebihi batas itu.", adaptedExample: "Selera unit latihan = 8.", assumptions: "Nilai selera unit pada simulasi adalah contoh, bukan ketetapan Pusdiklat.", confirmationNeeded: "Selera risiko Pusdiklat yang ditetapkan Pemilik Risiko." },
  },
  {
    id: "rencana-tindak-penanganan", track: "Praktik Terbimbing", number: 11, duration: 15, title: "Menyusun Rencana Tindak Penanganan", summary: "Bedakan pengendalian yang ada dari RTP tambahan dan evidence hasilnya.", interaction: "rtp",
    steps: [{ title: "Rancang RTP yang dapat ditindaklanjuti", text: "Pilih tindakan tambahan yang menyasar penyebab atau dampak, lalu lengkapi target, waktu, penanggung jawab, dan evidence latihan.", insight: "RTP bukan daftar pengendalian rutin yang sudah berjalan.", changes: ["RTP terhubung dengan penyebab, target hasil, dan evidence."] }],
    traceability: { competence: "Menyusun RTP sesuai format dan maksud pedoman.", source: "Bagian 5.2.10 Penanganan Risiko/RTP hlm. 77–83.", provision: "RTP berupa tindakan tambahan yang spesifik, terukur, berjadwal, dan memiliki PIC; bukti wajib disiapkan.", adaptedExample: "Menyiapkan pengajar cadangan dan konfirmasi jadwal.", assumptions: "Biaya/efektivitas simulasi adalah asumsi pembelajaran, bukan angka kebijakan.", confirmationNeeded: "Template RTP dan PIC aktual yang berlaku di Pusdiklat." },
  },
  {
    id: "pemantauan-pelaporan", track: "Praktik Terbimbing", number: 12, duration: 15, title: "Pemantauan, Tinjauan, Pencatatan, dan Pelaporan", summary: "Tinjau RTP, evidence, perubahan kondisi, dan penilaian ulang.", interaction: "monitoring",
    steps: [{ title: "Baca evidence sebelum menyimpulkan", text: "Periksa kemajuan RTP, keterjadian, evidence, efektivitas pengendalian, dan kebutuhan eskalasi.", insight: "RTP selesai belum tentu efektif; risiko yang tidak terjadi sekali belum membuktikan kontrol efektif.", changes: ["Timeline evidence dan profil risiko berubah bersama."] }],
    traceability: { competence: "Memantau, meninjau, mencatat, dan melaporkan risiko.", source: "Bagian pemantauan, tinjauan, pencatatan dan pelaporan pada Bab 5.", provision: "Pemantauan dilakukan berkala terhadap pengendalian, RTP, dan perubahan kondisi.", adaptedExample: "Evidence pelaksanaan RTP kegiatan pelatihan.", assumptions: illustrative, confirmationNeeded: "Periode dan jalur pelaporan internal Pusdiklat." },
  },
  {
    id: "studi-kasus-terpadu-pusdiklat", track: "Praktik Terbimbing", number: 13, duration: 20, title: "Studi Kasus Terpadu Pusdiklat", summary: "Terapkan konteks, penilaian, keputusan, RTP, dan pemantauan dalam satu program pelatihan.", interaction: "integrated",
    steps: [{ title: "Rangkai keputusan yang dapat dijelaskan", text: "Susun alasan, evidence, peran, dan tindakan untuk beberapa risiko kegiatan pelatihan.", insight: "Kualitas keputusan terlihat dari keterkaitannya dengan sasaran dan evidence, bukan hanya skor akhir.", changes: ["Ringkasan register latihan, RTP, dan hasil pemantauan terbentuk."] }],
    traceability: { competence: "Menerapkan proses MR secara terpadu.", source: "Bab 4–5 dan lampiran format kerja terkait.", provision: "Proses, peran, matriks, RTP, dan pemantauan diterapkan terhubung.", adaptedExample: "Program pelatihan dengan risiko kebutuhan, materi, pengajar, peserta, fasilitas, evaluasi, dan administrasi.", assumptions: illustrative, confirmationNeeded: "Kertas kerja/formulir serta prosedur Pusdiklat yang berlaku." },
  },
];

export const academyLessonById = (id: string) => academyLessons.find((lesson) => lesson.id === id);
export const academyTracks = ["Dasar", "Praktik Terbimbing"] as const;
