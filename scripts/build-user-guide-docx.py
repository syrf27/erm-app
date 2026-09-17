from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT = "docs/Panduan Pengguna gojags risk.docx"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_text(cell, text, bold=False):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.size = Pt(9.5)
    run.font.name = "Aptos"
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def style_table(table, header_fill="1F4E79"):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    for row_index, row in enumerate(table.rows):
        for cell in row.cells:
            cell.margin_top = Inches(0.04)
            cell.margin_bottom = Inches(0.04)
            cell.margin_left = Inches(0.06)
            cell.margin_right = Inches(0.06)
            if row_index == 0:
                set_cell_shading(cell, header_fill)
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = RGBColor(255, 255, 255)
                        run.bold = True
            elif row_index % 2 == 0:
                set_cell_shading(cell, "F4F7FB")


def add_heading(doc, text, level=1):
    paragraph = doc.add_heading(text, level=level)
    for run in paragraph.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)
        run.font.name = "Aptos Display" if level == 1 else "Aptos"
    return paragraph


def remove_paragraph_borders(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is not None:
        p_pr.remove(p_bdr)


def remove_style_borders(style):
    p_pr = style.element.get_or_add_pPr()
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is not None:
        p_pr.remove(p_bdr)


def add_paragraph(doc, text, bold_lead=None):
    paragraph = doc.add_paragraph()
    if bold_lead:
        run = paragraph.add_run(bold_lead)
        run.bold = True
        run.font.name = "Aptos"
    run = paragraph.add_run(text)
    run.font.name = "Aptos"
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1.08
    return paragraph


def add_bullets(doc, items):
    for item in items:
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.left_indent = Inches(0.18)
        paragraph.paragraph_format.first_line_indent = Inches(-0.18)
        run = paragraph.add_run(f"- {item}")
        run.font.name = "Aptos"
        run.font.size = Pt(10.5)


def add_numbered(doc, items):
    for index, item in enumerate(items, start=1):
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.left_indent = Inches(0.24)
        paragraph.paragraph_format.first_line_indent = Inches(-0.24)
        run = paragraph.add_run(f"{index}. {item}")
        run.font.name = "Aptos"
        run.font.size = Pt(10.5)


def add_simple_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.allow_autofit = True
    for index, header in enumerate(headers):
        set_cell_text(table.rows[0].cells[index], header, bold=True)
        if widths:
            table.rows[0].cells[index].width = Inches(widths[index])
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            set_cell_text(cells[index], str(value))
            if widths:
                cells[index].width = Inches(widths[index])
    style_table(table)
    doc.add_paragraph()
    return table


def add_page_number(section):
    footer = section.footer
    paragraph = footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Panduan Pengguna gojags risk")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(89, 89, 89)


def configure_document(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)
    add_page_number(section)

    styles = doc.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"].font.size = Pt(10.5)
    styles["Title"].font.name = "Aptos Display"
    styles["Title"].font.size = Pt(24)
    styles["Title"].font.bold = True
    styles["Title"].font.color.rgb = RGBColor(0, 0, 0)
    remove_style_borders(styles["Title"])
    for style_name, size in [("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 11.5)]:
        style = styles[style_name]
        style.font.name = "Aptos"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(12)
        style.paragraph_format.space_after = Pt(6)


def build_document():
    doc = Document()
    configure_document(doc)

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run("Panduan Pengguna gojags risk")
    remove_paragraph_borders(title)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Panduan operasional aplikasi manajemen risiko dan mitigasi risiko")
    run.font.name = "Aptos"
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(80, 80, 80)

    meta = [
        ["Aplikasi", "gojags risk"],
        ["Tujuan dokumen", "Membantu pengguna menjalankan proses manajemen risiko dari penetapan konteks sampai pelaporan"],
        ["Sasaran pembaca", "Admin, Ketua Tim, Anggota Tim, dan pengguna yang mengikuti UAT"],
        ["Catatan gambar", "Screenshot dapat ditambahkan kemudian pada bagian yang sesuai"],
    ]
    doc.add_paragraph()
    add_simple_table(doc, ["Item", "Keterangan"], meta, widths=[1.6, 5.4])

    add_heading(doc, "Ringkasan Panduan", 1)
    add_paragraph(
        doc,
        "Panduan ini menjelaskan cara menggunakan gojags risk untuk mengelola siklus manajemen risiko secara end to end. "
        "Pengguna diarahkan untuk memulai dari data dasar, mencatat risiko, menilai tingkat risiko, menentukan respons, menyusun rencana penanganan, memantau realisasi, mengarsipkan bukti, dan menyusun laporan.",
    )
    add_paragraph(
        doc,
        "Urutan kerja utama adalah Penetapan Konteks, Identifikasi Risiko, Analisis Risiko, Evaluasi Risiko, Rencana Penanganan, Pemantauan Risiko, Pelaporan Risiko, lalu Repositori Dokumen dan Audit sebagai pendukung.",
    )

    add_heading(doc, "Prinsip Penggunaan", 1)
    add_bullets(
        doc,
        [
            "Gunakan periode data atau tahun risiko yang benar sebelum mengisi atau mencari data.",
            "Isi data referensi terlebih dahulu agar pilihan di modul risiko tidak kosong.",
            "Simpan perubahan setelah mengisi tabel, terutama pada halaman spreadsheet seperti Identifikasi, Analisis, Evaluasi, dan Rencana Penanganan.",
            "Gunakan dokumen pendukung untuk memperkuat bukti pelaksanaan mitigasi.",
            "Periksa hak akses apabila tombol atau menu tertentu tidak muncul.",
        ],
    )

    add_heading(doc, "Peran Pengguna", 1)
    add_simple_table(
        doc,
        ["Peran", "Fokus penggunaan", "Catatan akses"],
        [
            ["Admin", "Mengelola seluruh data, pengguna, role, permission, FAQ, audit log, dan konfigurasi operasional.", "Memiliki akses penuh."],
            ["Ketua Tim", "Mengisi dan meninjau data risiko, analisis, evaluasi, RTP, pemantauan, dan pelaporan.", "Akses mengikuti permission yang diberikan."],
            ["Anggota Tim", "Melakukan input operasional risiko, rencana, realisasi, dan bukti dukung.", "Akses mengikuti permission yang diberikan."],
        ],
        widths=[1.3, 3.8, 1.9],
    )

    doc.add_page_break()
    add_heading(doc, "Alur Utama Manajemen Risiko", 1)
    add_simple_table(
        doc,
        ["Tahap", "Tujuan", "Output"],
        [
            ["Penetapan Konteks", "Menyiapkan data referensi dan konteks organisasi.", "Data master siap dipakai."],
            ["Identifikasi Risiko", "Mencatat kejadian risiko, penyebab, dampak, dan konteks terkait.", "Daftar risiko per tahun."],
            ["Analisis Risiko", "Menilai kemungkinan dan dampak inheren.", "Besaran dan level risiko inheren."],
            ["Evaluasi Risiko", "Menentukan residual dan respons risiko.", "Respon risiko dan prioritas."],
            ["Rencana Penanganan", "Menyusun tindakan mitigasi untuk risiko yang perlu dikurangi.", "RTP dengan target dan penanggung jawab."],
            ["Pemantauan Risiko", "Mencatat realisasi mitigasi dan bukti pendukung.", "Realisasi dan dokumen bukti."],
            ["Pelaporan Risiko", "Menyusun rekap, persetujuan, dan export laporan.", "Laporan risiko dan status persetujuan."],
        ],
        widths=[1.8, 3.2, 2.0],
    )

    add_heading(doc, "Masuk dan Keluar Aplikasi", 1)
    add_heading(doc, "Masuk menggunakan SSO GOJAGS", 2)
    add_numbered(
        doc,
        [
            "Buka alamat aplikasi gojags risk.",
            "Pilih tombol login SSO GOJAGS.",
            "Masukkan kredensial GOJAGS pada halaman autentikasi.",
            "Setelah berhasil, aplikasi menampilkan Dashboard dan nama pengguna pada menu profil.",
        ],
    )
    add_heading(doc, "Keluar dari aplikasi", 2)
    add_numbered(
        doc,
        [
            "Klik menu profil di kanan atas.",
            "Pilih Logout.",
            "Konfirmasi keluar pada modal yang tampil.",
        ],
    )

    add_heading(doc, "Dashboard", 1)
    add_paragraph(
        doc,
        "Dashboard membantu pengguna membaca posisi umum risiko organisasi. Di halaman ini pengguna dapat melihat jumlah risiko, risiko yang sudah dianalisis, rencana penanganan, distribusi level risiko, matriks risiko, dan daftar risiko prioritas.",
    )
    add_bullets(
        doc,
        [
            "Gunakan Dashboard untuk memahami kondisi awal sebelum masuk ke detail data.",
            "Perhatikan filter periode data karena angka Dashboard mengikuti rentang tahun yang dipilih.",
            "Jika angka terasa tidak sesuai, periksa kembali filter tahun dan kelengkapan data pada modul risiko.",
        ],
    )

    add_heading(doc, "Penetapan Konteks", 1)
    add_paragraph(
        doc,
        "Penetapan Konteks adalah tahap awal yang menyiapkan data referensi. Data ini dipakai sebagai pilihan pada proses identifikasi, analisis, evaluasi, rencana penanganan, dan pelaporan.",
    )
    add_simple_table(
        doc,
        ["Kelompok data", "Kegunaan"],
        [
            ["Tim Kerja", "Menentukan penanggung jawab atau PIC pada proses risiko dan RTP."],
            ["Kegiatan dan Sasaran", "Menghubungkan risiko dengan tujuan atau kegiatan organisasi."],
            ["Proses Bisnis", "Menjelaskan proses yang terdampak oleh risiko."],
            ["Pemangku Kepentingan", "Mencatat pihak internal atau eksternal yang relevan."],
            ["Peraturan Perundangan", "Menjadi dasar kepatuhan dan konteks legal."],
            ["Jenis, Sumber, Kategori Risiko", "Mengklasifikasikan risiko agar mudah dianalisis."],
            ["Area Dampak dan Level Dampak", "Membantu penilaian dampak risiko."],
            ["Level Kemungkinan dan Matriks Risiko", "Menjadi dasar perhitungan level risiko."],
            ["Selera Risiko dan Opsi Penanganan", "Menjadi acuan evaluasi dan respons risiko."],
        ],
        widths=[2.2, 4.8],
    )
    add_heading(doc, "Cara menggunakan Penetapan Konteks", 2)
    add_numbered(
        doc,
        [
            "Buka Manajemen Risiko lalu pilih Penetapan Konteks.",
            "Pilih kelompok data yang ingin dikelola.",
            "Klik Tambah untuk menambahkan data baru.",
            "Isi field yang wajib, lalu simpan.",
            "Gunakan Edit jika ada data yang perlu diperbarui.",
            "Gunakan Hapus hanya jika data belum atau tidak lagi dipakai oleh proses lain.",
        ],
    )

    add_heading(doc, "Identifikasi Risiko", 1)
    add_paragraph(
        doc,
        "Identifikasi Risiko digunakan untuk mencatat risiko yang dapat mengganggu pencapaian sasaran atau kegiatan. Risiko yang baik ditulis dengan jelas: apa kejadian risikonya, mengapa bisa terjadi, dan apa dampaknya.",
    )
    add_heading(doc, "Data yang perlu disiapkan", 2)
    add_bullets(
        doc,
        [
            "Sasaran atau kegiatan yang menjadi konteks risiko.",
            "Proses bisnis yang terkait.",
            "Pernyataan risiko.",
            "Jenis risiko, sumber risiko, kategori risiko, dan area dampak.",
            "Penyebab dan dampak risiko.",
            "Tahun risiko yang sesuai dengan periode kerja.",
        ],
    )
    add_heading(doc, "Cara mencatat risiko", 2)
    add_numbered(
        doc,
        [
            "Buka Manajemen Risiko lalu pilih Identifikasi Risiko.",
            "Pastikan periode data sudah sesuai.",
            "Isi baris risiko pada tabel.",
            "Pilih referensi dari daftar yang tersedia agar data konsisten.",
            "Isi penyebab dan dampak dengan kalimat yang mudah dipahami.",
            "Klik Simpan Semua setelah selesai mengisi atau mengubah baris.",
        ],
    )
    add_heading(doc, "Contoh penulisan risiko", 2)
    add_simple_table(
        doc,
        ["Unsur", "Contoh"],
        [
            ["Kejadian risiko", "Data sektoral terlambat diterima dari sumber data."],
            ["Penyebab", "Koordinasi dengan sumber data belum terjadwal dengan baik."],
            ["Dampak", "Publikasi atau laporan dapat terlambat diselesaikan."],
        ],
        widths=[1.8, 5.2],
    )

    add_heading(doc, "Analisis Risiko", 1)
    add_paragraph(
        doc,
        "Analisis Risiko digunakan untuk menilai risiko inheren, yaitu tingkat risiko sebelum rencana penanganan baru dilaksanakan. Penilaian dilakukan dengan memilih level kemungkinan dan level dampak.",
    )
    add_numbered(
        doc,
        [
            "Buka Manajemen Risiko lalu pilih Analisis Risiko.",
            "Cari risiko yang sudah diidentifikasi.",
            "Pilih Level Kemungkinan dan Level Dampak.",
            "Isi pengendalian yang sudah pernah dilakukan, jika ada.",
            "Isi efektivitas pengendalian sesuai kondisi aktual.",
            "Klik Simpan Semua.",
        ],
    )
    add_paragraph(
        doc,
        "Aplikasi akan menghitung besaran dan level risiko berdasarkan matriks risiko yang tersedia. Warna level risiko membantu pengguna melihat prioritas penanganan.",
    )

    add_heading(doc, "Evaluasi Risiko", 1)
    add_paragraph(
        doc,
        "Evaluasi Risiko digunakan untuk menentukan kondisi residual dan respons risiko. Tahap ini membantu pengguna memutuskan apakah risiko perlu dikurangi, diterima, dialihkan, atau dihindari.",
    )
    add_numbered(
        doc,
        [
            "Buka Manajemen Risiko lalu pilih Evaluasi Risiko.",
            "Isi Level Kemungkinan Residual dan Level Dampak Residual.",
            "Pilih Respon Risiko.",
            "Periksa prioritas risiko yang dihitung aplikasi.",
            "Klik Simpan Semua.",
        ],
    )
    add_paragraph(
        doc,
        "Risiko dengan respons Mengurangi Risiko akan masuk ke tahap Rencana Penanganan. Respons lain biasanya tidak memerlukan RTP baru, kecuali kebijakan organisasi mengatur berbeda.",
    )

    add_heading(doc, "Rencana Penanganan Risiko", 1)
    add_paragraph(
        doc,
        "Rencana Penanganan Risiko atau RTP adalah rencana tindakan untuk menurunkan risiko. Halaman ini fokus pada risiko yang responsnya Mengurangi Risiko.",
    )
    add_simple_table(
        doc,
        ["Field", "Cara mengisi"],
        [
            ["Rencana RTP", "Tuliskan tindakan mitigasi secara spesifik."],
            ["Jenis Penanganan", "Pilih jenis yang paling sesuai dengan rencana."],
            ["Target Output", "Tentukan hasil nyata yang diharapkan."],
            ["Target Waktu", "Isi tanggal penyelesaian yang realistis."],
            ["Penanggung Jawab", "Pilih tim kerja atau PIC yang bertanggung jawab."],
            ["Residual Harapan", "Isi level risiko yang diharapkan setelah mitigasi."],
        ],
        widths=[1.8, 5.2],
    )
    add_numbered(
        doc,
        [
            "Buka Manajemen Risiko lalu pilih Rencana Penanganan.",
            "Lengkapi rencana pada risiko yang tampil.",
            "Pastikan target output, target waktu, dan PIC tidak kosong.",
            "Klik Simpan Semua.",
        ],
    )

    add_heading(doc, "Matriks Risiko", 1)
    add_paragraph(
        doc,
        "Matriks Risiko menampilkan posisi risiko pada peta kemungkinan dan dampak. Menu ini membantu pengguna melihat perpindahan dari risiko aktual atau inheren ke risiko residual.",
    )
    add_bullets(
        doc,
        [
            "Gunakan matriks untuk melihat risiko prioritas tinggi.",
            "Pilih satu atau beberapa risiko untuk melihat posisi dan arah perpindahan.",
            "Gunakan tampilan ini sebagai bahan diskusi saat rapat manajemen risiko.",
        ],
    )

    add_heading(doc, "Pemantauan Risiko", 1)
    add_paragraph(
        doc,
        "Pemantauan Risiko digunakan setelah RTP mulai dilaksanakan. Tujuannya adalah mencatat realisasi mitigasi, status keterjadian risiko, realisasi output, realisasi waktu, dan bukti pendukung.",
    )
    add_numbered(
        doc,
        [
            "Buka Pemantauan Risiko.",
            "Cari RTP yang akan diperbarui.",
            "Klik aksi Update Realisasi.",
            "Isi keterjadian risiko, realisasi waktu, dan realisasi output.",
            "Tambahkan dokumen pendukung jika ada.",
            "Jika memakai GOJAGS Office, cari rapat berdasarkan keyword agenda lalu tambahkan PDF presensi sebagai bukti.",
            "Klik Simpan Realisasi.",
        ],
    )
    add_heading(doc, "Dokumen pendukung pada Pemantauan", 2)
    add_bullets(
        doc,
        [
            "Dokumen dapat berupa upload file atau tautan.",
            "Bukti yang disimpan dari Pemantauan otomatis masuk ke Repositori Dokumen sebagai Bukti Dukung Mitigasi.",
            "Gunakan judul dokumen yang jelas agar mudah dicari kembali.",
        ],
    )

    add_heading(doc, "Pelaporan Risiko", 1)
    add_paragraph(
        doc,
        "Pelaporan Risiko menampilkan rekap lengkap proses risiko dari identifikasi sampai pemantauan. Halaman ini digunakan untuk menyiapkan laporan, mencatat persetujuan, dan mengunduh file Excel.",
    )
    add_numbered(
        doc,
        [
            "Buka Pelaporan Risiko.",
            "Pastikan periode data sudah sesuai.",
            "Periksa isi tabel laporan.",
            "Gunakan aksi Persetujuan untuk mengatur status Draft, Disetujui, atau Ditolak.",
            "Isi nama pejabat atau approver pada kolom Disetujui Oleh jika diperlukan.",
            "Klik Unduh Excel untuk menghasilkan laporan.",
        ],
    )

    add_heading(doc, "Bank Risiko", 1)
    add_paragraph(
        doc,
        "Bank Risiko membantu pengguna mencari contoh risiko yang pernah tercatat. Fitur ini berguna saat pengguna membutuhkan referensi sebelum menulis risiko baru.",
    )
    add_numbered(
        doc,
        [
            "Buka Bank Risiko.",
            "Masukkan kata kunci, misalnya keterlambatan data atau gangguan layanan.",
            "Atur jumlah hasil jika diperlukan.",
            "Klik Cari.",
            "Tinjau hasil dan sesuaikan dengan konteks unit kerja.",
            "Gunakan aksi tambah ke Identifikasi bila risiko relevan.",
        ],
    )

    add_heading(doc, "Repositori Dokumen", 1)
    add_paragraph(
        doc,
        "Repositori Dokumen adalah pusat penyimpanan dokumen pendukung. Repositori memuat dokumen manual dan bukti dukung mitigasi yang berasal dari Pemantauan Risiko.",
    )
    add_simple_table(
        doc,
        ["Kategori", "Isi"],
        [
            ["Pedoman dan Kebijakan", "Dokumen acuan, SOP, kebijakan, dan pedoman manajemen risiko."],
            ["Bukti Dukung Mitigasi", "Dokumen bukti pelaksanaan RTP, termasuk file dari Pemantauan Risiko."],
            ["Laporan dan Risalah", "Laporan, risalah rapat, atau dokumen rekap pelaksanaan risiko."],
        ],
        widths=[2.2, 4.8],
    )
    add_numbered(
        doc,
        [
            "Buka Repositori Dokumen.",
            "Gunakan folder kategori untuk memfilter dokumen.",
            "Gunakan pencarian cerdas untuk mencari dokumen berdasarkan kata kunci.",
            "Pilih Tahun Risiko jika ingin membatasi hasil pencarian.",
            "Klik Buka untuk melihat dokumen.",
            "Klik Ringkasan untuk membuat atau melihat ringkasan AI dokumen.",
        ],
    )

    add_heading(doc, "Manajemen Akses", 1)
    add_paragraph(
        doc,
        "Manajemen Akses digunakan oleh admin untuk mengelola pengguna, role, dan permission. Menu ini menentukan siapa yang dapat melihat menu dan menjalankan aksi seperti tambah, edit, hapus, atau approval.",
    )
    add_heading(doc, "Pengguna", 2)
    add_bullets(
        doc,
        [
            "Gunakan menu Pengguna untuk menambah, mengubah, atau menonaktifkan akses pengguna.",
            "Pastikan email sesuai dengan akun GOJAGS yang dipakai saat login.",
            "Pilih role dan tim kerja yang sesuai dengan tugas pengguna.",
        ],
    )
    add_heading(doc, "Role Permissions", 2)
    add_bullets(
        doc,
        [
            "Gunakan Role Permissions untuk mengatur hak akses per role.",
            "Jika menu atau tombol tidak muncul, periksa permission role terlebih dahulu.",
            "Perubahan permission sebaiknya diuji dengan akun role terkait.",
        ],
    )

    add_heading(doc, "Audit Log", 1)
    add_paragraph(
        doc,
        "Audit Log mencatat aktivitas penting di aplikasi. Admin dapat menggunakan menu ini untuk melihat riwayat perubahan data, pengguna yang melakukan aksi, waktu kejadian, dan resource yang terdampak.",
    )
    add_bullets(
        doc,
        [
            "Gunakan filter untuk mencari aktivitas berdasarkan user, resource, action, atau tanggal.",
            "Gunakan export jika diperlukan sebagai bukti pemeriksaan.",
            "Audit Log membantu investigasi jika ada data yang berubah tanpa diketahui.",
        ],
    )

    add_heading(doc, "Pusat Notifikasi", 1)
    add_paragraph(
        doc,
        "Pusat Notifikasi membantu admin melihat dan mengirim pengingat untuk RTP yang belum direalisasikan. Fitur ini mendukung pemantauan ketepatan pelaksanaan mitigasi.",
    )
    add_bullets(
        doc,
        [
            "Gunakan Ingatkan untuk mengirim notifikasi pada satu RTP.",
            "Gunakan Ingatkan Semua jika ingin mengirim pengingat massal sesuai daftar yang tampil.",
            "Pastikan pengguna sudah mengizinkan notifikasi pada browser agar push notification diterima.",
        ],
    )

    add_heading(doc, "FAQ dan Chat Bantuan", 1)
    add_paragraph(
        doc,
        "FAQ berisi panduan singkat yang dapat dibaca pengguna. Chat bantuan menggunakan FAQ sebagai salah satu sumber jawaban, sehingga kualitas FAQ memengaruhi kualitas jawaban chat.",
    )
    add_bullets(
        doc,
        [
            "Admin dapat menambah, mengubah, dan menghapus FAQ.",
            "Pengguna dapat mencari pertanyaan berdasarkan kata kunci.",
            "Jika chat bantuan belum menjawab dengan tepat, perbaiki atau tambahkan FAQ yang relevan.",
        ],
    )

    add_heading(doc, "Pengaturan Tampilan dan Periode Data", 1)
    add_heading(doc, "Mode terang dan gelap", 2)
    add_paragraph(
        doc,
        "Pengguna dapat mengganti tema tampilan menjadi terang atau gelap. Perubahan tema tidak mengubah data, hak akses, atau filter yang sedang aktif.",
    )
    add_heading(doc, "Periode data", 2)
    add_paragraph(
        doc,
        "Periode data menentukan rentang tahun yang ditampilkan pada Dashboard dan modul risiko. Selalu pastikan periode benar sebelum menyimpulkan data belum ada atau sebelum melakukan export laporan.",
    )

    add_heading(doc, "Troubleshooting Pengguna", 1)
    add_simple_table(
        doc,
        ["Kondisi", "Kemungkinan penyebab", "Langkah yang disarankan"],
        [
            ["Menu tidak muncul", "Permission akun belum sesuai.", "Hubungi admin untuk cek role dan permission."],
            ["Data tidak terlihat", "Filter tahun, kategori, atau pencarian masih aktif.", "Reset filter atau pilih periode data yang benar."],
            ["Tombol simpan tidak bekerja", "Field wajib belum lengkap atau koneksi bermasalah.", "Periksa field wajib, lalu coba simpan ulang."],
            ["Dokumen tidak bisa diunggah", "Ukuran file terlalu besar atau tipe file tidak sesuai.", "Gunakan file yang lebih kecil dan sesuai kebutuhan."],
            ["Ringkasan AI gagal", "File tidak dapat dibaca atau layanan AI sedang bermasalah.", "Coba dokumen lain atau ulangi beberapa saat kemudian."],
            ["Notifikasi tidak diterima", "Browser belum mengizinkan notifikasi.", "Aktifkan izin notifikasi browser dan login ulang jika perlu."],
        ],
        widths=[1.7, 2.5, 2.8],
    )

    add_heading(doc, "Checklist Sebelum Pengujian", 1)
    add_bullets(
        doc,
        [
            "Akun uji untuk admin, ketua tim, dan anggota tim sudah tersedia.",
            "Pengguna dapat login melalui SSO GOJAGS.",
            "Periode data pengujian sudah disepakati.",
            "Data referensi minimal sudah tersedia: tim kerja, kegiatan, sasaran, proses bisnis, level kemungkinan, level dampak, matriks risiko, dan opsi penanganan.",
            "File uji untuk upload dokumen sudah disiapkan.",
            "Jika akan menguji GOJAGS Office, API key dan data rapat uji sudah tersedia.",
            "Jika akan menguji ringkasan AI, API key layanan ringkasan sudah aktif.",
        ],
    )

    doc.add_page_break()
    add_heading(doc, "Glosarium Singkat", 1)
    add_simple_table(
        doc,
        ["Istilah", "Arti"],
        [
            ["Risiko", "Peristiwa yang mungkin terjadi dan dapat memengaruhi pencapaian tujuan."],
            ["Penyebab", "Hal yang memicu atau meningkatkan peluang terjadinya risiko."],
            ["Dampak", "Akibat yang muncul jika risiko terjadi."],
            ["Risiko inheren", "Tingkat risiko sebelum rencana penanganan baru dilakukan."],
            ["Risiko residual", "Tingkat risiko yang tersisa setelah pengendalian atau mitigasi."],
            ["RTP", "Rencana Tindak Penanganan atau rencana mitigasi risiko."],
            ["Bukti dukung", "Dokumen yang membuktikan pelaksanaan kegiatan mitigasi."],
            ["Permission", "Hak akses untuk melihat atau melakukan aksi pada menu tertentu."],
        ],
        widths=[1.8, 5.2],
    )

    add_heading(doc, "Penutup", 1)
    add_paragraph(
        doc,
        "Panduan ini dapat digunakan sebagai pegangan awal saat pengguna menjalankan gojags risk dan saat pelaksanaan pengujian. Jika ada perubahan proses bisnis atau fitur aplikasi, panduan sebaiknya diperbarui agar tetap selaras dengan aplikasi yang digunakan.",
    )

    doc.save(OUTPUT)


if __name__ == "__main__":
    build_document()
    print(OUTPUT)
