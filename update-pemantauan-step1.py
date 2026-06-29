import re

with open('D:/erm-app/src/app/(app)/pemantauan-risiko/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add keterjadiRisiko to the RiskRow interface
old_interface = '''interface RiskRow {
  identId: number;
  rencanaId: number | null;
  no: number;
  prioritas: string;
  prioritasWarna: string;
  rencanaTindakPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  realisasiWaktu: string;
  realisasiOutput: string;
  dokumenPendukung: string;
}'''

new_interface = '''interface RiskRow {
  identId: number;
  rencanaId: number | null;
  no: number;
  prioritas: string;
  prioritasWarna: string;
  rencanaTindakPenanganan: string;
  targetWaktu: string;
  targetOutput: string;
  keterjadiRisiko: string;
  realisasiWaktu: string;
  realisasiOutput: string;
  dokumenPendukung: string;
}'''

content = content.replace(old_interface, new_interface)

# Add keterjadiRisiko to modal state
old_modal_state = '''  const [modalWaktu, setModalWaktu] = useState("");
  const [modalOutput, setModalOutput] = useState("");'''

new_modal_state = '''  const [modalWaktu, setModalWaktu] = useState("");
  const [modalOutput, setModalOutput] = useState("");
  const [modalKeterjadian, setModalKeterjadian] = useState("");'''

content = content.replace(old_modal_state, new_modal_state)

# Add keterjadiRisiko to row mapping
old_row_mapping = '''return {
        identId: r.id,
        rencanaId: rp?.id ?? null,
        no: index + 1,
        prioritas: an?.levelRisiko?.nama ?? "Sedang",
        prioritasWarna: an?.levelRisiko?.warna ?? "Kuning",
        rencanaTindakPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        dokumenPendukung: rp?.dokumenPendukung ?? "",
      };'''

new_row_mapping = '''return {
        identId: r.id,
        rencanaId: rp?.id ?? null,
        no: index + 1,
        prioritas: an?.levelRisiko?.nama ?? "Sedang",
        prioritasWarna: an?.levelRisiko?.warna ?? "Kuning",
        rencanaTindakPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        keterjadiRisiko: rp?.keterjadiRisiko ?? "",
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        dokumenPendukung: rp?.dokumenPendukung ?? "",
      };'''

content = content.replace(old_row_mapping, new_row_mapping)

with open('D:/erm-app/src/app/(app)/pemantauan-risiko/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Added keterjadiRisiko to interface and data mapping')
