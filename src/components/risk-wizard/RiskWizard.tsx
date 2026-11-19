"use client";

import { useEffect, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import {
  Stepper,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  Select,
  Card,
  Grid,
  Badge,
  Title,
  Loader,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useYear } from "@/lib/year-context";
import { useRouter } from "next/navigation";

function getLevelFromBesaran(besaran: number) {
  if (!besaran || besaran <= 0) return { label: "-", warna: "gray" };
  if (besaran >= 1 && besaran <= 5) return { label: "Sangat Rendah", warna: "blue" };
  if (besaran >= 6 && besaran <= 11) return { label: "Rendah", warna: "green" };
  if (besaran >= 12 && besaran <= 15) return { label: "Sedang", warna: "yellow" };
  if (besaran >= 16 && besaran <= 19) return { label: "Tinggi", warna: "orange" };
  return { label: "Sangat Tinggi", warna: "red" };
}

const DRAFT_KEY = "risk-wizard-draft-v1";

export function RiskWizard() {
  const router = useRouter();
  const { tahunDari } = useYear();
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // ---- Identifikasi ----
  const [sasaranId, setSasaranId] = useState<string>("");
  const [kegiatanId, setKegiatanId] = useState<string>("");
  const [prosesBisnisId, setProsesBisnisId] = useState<string>("");
  const [risiko, setRisiko] = useState("");
  const [jenisRisikoId, setJenisRisikoId] = useState<string>("");
  const [sumberRisikoId, setSumberRisikoId] = useState<string>("");
  const [kategoriRisikoId, setKategoriRisikoId] = useState<string>("");
  const [areaDampakId, setAreaDampakId] = useState<string>("");
  const [penyebab, setPenyebab] = useState("");
  const [dampak, setDampak] = useState("");

  // ---- Analisis ----
  const [pengendalianUraian, setPengendalianUraian] = useState("");
  const [pengendalianEfektivitas, setPengendalianEfektivitas] = useState<string>("");
  const [levelKemungkinanId, setLevelKemungkinanId] = useState<string>("");
  const [levelDampakId, setLevelDampakId] = useState<string>("");

  // ---- Evaluasi & RTP ----
  const [responRisiko, setResponRisiko] = useState<string>("mengurangi");
  const [rencanaTidakPenanganan, setRencanaTidakPenanganan] = useState("");
  const [targetOutput, setTargetOutput] = useState("");
  const [targetWaktu, setTargetWaktu] = useState("");
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [residualKemungkinanId, setResidualKemungkinanId] = useState<string>("");
  const [residualDampakId, setResidualDampakId] = useState<string>("");

  // ---- Reference lists ----
  const sasaranList = useList({ resource: "sasaran", pagination: { mode: "off" } });
  const kegiatanList = useList({ resource: "kegiatan", pagination: { mode: "off" } });
  const prosesList = useList({ resource: "proses-bisnis", pagination: { mode: "off" } });
  const jenisList = useList({ resource: "jenis-risiko", pagination: { mode: "off" } });
  const sumberList = useList({ resource: "sumber-risiko", pagination: { mode: "off" } });
  const kategoriList = useList({ resource: "kategori-risiko", pagination: { mode: "off" } });
  const areaList = useList({ resource: "area-dampak", pagination: { mode: "off" } });
  const lkList = useList({ resource: "level-kemungkinan", pagination: { mode: "off" } });
  const ldList = useList({ resource: "level-dampak", pagination: { mode: "off" } });

  const loadingLists =
    sasaranList.query?.isPending ||
    kegiatanList.query?.isPending ||
    prosesList.query?.isPending ||
    jenisList.query?.isPending ||
    sumberList.query?.isPending ||
    kategoriList.query?.isPending ||
    areaList.query?.isPending ||
    lkList.query?.isPending ||
    ldList.query?.isPending;

  const sasaranData: any[] = useMemo(() => sasaranList.result?.data ?? [], [sasaranList.result?.data]);
  const kegiatanData: any[] = useMemo(() => kegiatanList.result?.data ?? [], [kegiatanList.result?.data]);
  const prosesData: any[] = useMemo(() => prosesList.result?.data ?? [], [prosesList.result?.data]);
  const jenisData: any[] = useMemo(() => jenisList.result?.data ?? [], [jenisList.result?.data]);
  const sumberData: any[] = useMemo(() => sumberList.result?.data ?? [], [sumberList.result?.data]);
  const kategoriData: any[] = useMemo(() => kategoriList.result?.data ?? [], [kategoriList.result?.data]);
  const areaData: any[] = useMemo(() => areaList.result?.data ?? [], [areaList.result?.data]);
  const lkData: any[] = useMemo(() => lkList.result?.data ?? [], [lkList.result?.data]);
  const ldData: any[] = useMemo(() => ldList.result?.data ?? [], [ldList.result?.data]);

  // cascading filter
  const filteredKegiatan = useMemo(() => {
    if (!sasaranId) return kegiatanData;
    return kegiatanData.filter((k: any) => String(k.sasaranId) === String(sasaranId));
  }, [kegiatanData, sasaranId]);

  const filteredProses = useMemo(() => {
    if (!kegiatanId) return prosesData;
    return prosesData.filter((p: any) => String(p.kegiatanId) === String(kegiatanId));
  }, [prosesData, kegiatanId]);

  // besaran preview
  const lkSkala = useMemo(() => lkData.find((x: any) => String(x.id) === String(levelKemungkinanId))?.skala ?? null, [lkData, levelKemungkinanId]);
  const ldSkala = useMemo(() => ldData.find((x: any) => String(x.id) === String(levelDampakId))?.skala ?? null, [ldData, levelDampakId]);
  const besaran = lkSkala != null && ldSkala != null ? lkSkala * ldSkala : 0;
  const levelInfo = getLevelFromBesaran(besaran);

  // ---- draft restore/save ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.sasaranId) setSasaranId(d.sasaranId);
      if (d.kegiatanId) setKegiatanId(d.kegiatanId);
      if (d.prosesBisnisId) setProsesBisnisId(d.prosesBisnisId);
      if (d.risiko) setRisiko(d.risiko);
      if (d.jenisRisikoId) setJenisRisikoId(d.jenisRisikoId);
      if (d.sumberRisikoId) setSumberRisikoId(d.sumberRisikoId);
      if (d.kategoriRisikoId) setKategoriRisikoId(d.kategoriRisikoId);
      if (d.areaDampakId) setAreaDampakId(d.areaDampakId);
      if (d.penyebab) setPenyebab(d.penyebab);
      if (d.dampak) setDampak(d.dampak);
      if (d.pengendalianUraian) setPengendalianUraian(d.pengendalianUraian);
      if (d.pengendalianEfektivitas) setPengendalianEfektivitas(d.pengendalianEfektivitas);
      if (d.levelKemungkinanId) setLevelKemungkinanId(d.levelKemungkinanId);
      if (d.levelDampakId) setLevelDampakId(d.levelDampakId);
      if (d.responRisiko) setResponRisiko(d.responRisiko);
      if (d.rencanaTidakPenanganan) setRencanaTidakPenanganan(d.rencanaTidakPenanganan);
      if (d.targetOutput) setTargetOutput(d.targetOutput);
      if (d.targetWaktu) setTargetWaktu(d.targetWaktu);
      if (d.penanggungJawab) setPenanggungJawab(d.penanggungJawab);
    } catch {}
  }, []);

  const saveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          sasaranId, kegiatanId, prosesBisnisId, risiko,
          jenisRisikoId, sumberRisikoId, kategoriRisikoId, areaDampakId,
          penyebab, dampak, pengendalianUraian, pengendalianEfektivitas,
          levelKemungkinanId, levelDampakId, responRisiko,
          rencanaTidakPenanganan, targetOutput, targetWaktu, penanggungJawab,
        })
      );
      notifications.show({ title: "Draft tersimpan", message: "Draft wizard tersimpan di perangkat ini", color: "blue" });
    } catch {}
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  // ---- validation per step ----
  const step0Valid =
    risiko.trim().length > 0 &&
    !!jenisRisikoId && !!sumberRisikoId && !!kategoriRisikoId && !!areaDampakId;

  const step1Valid = !!levelKemungkinanId && !!levelDampakId;

  const step2Valid =
    !!responRisiko &&
    (responRisiko !== "mengurangi" || rencanaTidakPenanganan.trim().length > 0);

  const next = () => {
    if (active === 0 && !step0Valid) {
      notifications.show({ title: "Belum lengkap", message: "Isi Risiko + 4 klasifikasi (Jenis, Sumber, Kategori, Area) dulu", color: "orange" });
      return;
    }
    if (active === 1 && !step1Valid) {
      notifications.show({ title: "Belum lengkap", message: "Pilih Level Kemungkinan & Level Dampak", color: "orange" });
      return;
    }
    if (active === 2 && !step2Valid) {
      notifications.show({ title: "Belum lengkap", message: "Isi Respon + Rencana Penanganan (untuk Mengurangi)", color: "orange" });
      return;
    }
    setActive((a) => Math.min(a + 1, 3));
  };
  const prev = () => setActive((a) => Math.max(a - 1, 0));

  const handleAiAssist = async () => {
    if (!risiko.trim() && !penyebab.trim() && !dampak.trim()) {
      notifications.show({ title: "AI", message: "Isi dulu Risiko / Penyebab / Dampak singkat, baru klik AI", color: "orange" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/risk-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: [risiko, penyebab, dampak].filter(Boolean).join(". "),
          lists: {
            sasaran: sasaranData.map((x: any) => ({ id: x.id, nama: x.nama })),
            kegiatan: kegiatanData.map((x: any) => ({ id: x.id, nama: x.nama })),
            prosesBisnis: prosesData.map((x: any) => ({ id: x.id, nama: x.nama })),
            jenisRisiko: jenisData.map((x: any) => ({ id: x.id, nama: x.nama })),
            sumberRisiko: sumberData.map((x: any) => ({ id: x.id, nama: x.nama })),
            kategori: kategoriData.map((x: any) => ({ id: x.id, nama: x.nama })),
            areaDampak: areaData.map((x: any) => ({ id: x.id, nama: x.nama })),
            levelKemungkinan: lkData.map((x: any) => ({ id: x.id, nama: x.nama })),
            levelDampak: ldData.map((x: any) => ({ id: x.id, nama: x.nama })),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "AI gagal");
      const s = data.suggestion;
      const byName = (arr: any[], name: string) => arr.find((x: any) => x.nama === name);
      if (s?.jenisRisiko && byName(jenisData, s.jenisRisiko)) setJenisRisikoId(String(byName(jenisData, s.jenisRisiko).id));
      if (s?.sumberRisiko && byName(sumberData, s.sumberRisiko)) setSumberRisikoId(String(byName(sumberData, s.sumberRisiko).id));
      if (s?.kategori && byName(kategoriData, s.kategori)) setKategoriRisikoId(String(byName(kategoriData, s.kategori).id));
      if (s?.areaDampak && byName(areaData, s.areaDampak)) setAreaDampakId(String(byName(areaData, s.areaDampak).id));
      if (s?.penyebab && !penyebab) setPenyebab(s.penyebab);
      if (s?.dampak && !dampak) setDampak(s.dampak);
      if (s?.levelKemungkinan && byName(lkData, s.levelKemungkinan)) setLevelKemungkinanId(String(byName(lkData, s.levelKemungkinan).id));
      if (s?.levelDampak && byName(ldData, s.levelDampak)) setLevelDampakId(String(byName(ldData, s.levelDampak).id));
      if (s?.responRisiko) setResponRisiko(s.responRisiko);
      notifications.show({ title: "AI", message: "Saran diterapkan, periksa kembali sebelum lanjut", color: "green" });
    } catch (e: any) {
      notifications.show({ title: "AI gagal", message: e?.message || "Coba lagi", color: "red" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (andAddAnother: boolean) => {
    setSaving(true);
    try {
      const payload = {
        identifikasi: {
          risiko: risiko.trim(),
          penyebab: penyebab.trim() || null,
          dampak: dampak.trim() || null,
          jenisRisikoId: Number(jenisRisikoId),
          sumberRisikoId: Number(sumberRisikoId),
          kategoriRisikoId: Number(kategoriRisikoId),
          areaDampakId: Number(areaDampakId),
          ...(sasaranId ? { sasaranId: Number(sasaranId) } : {}),
          ...(kegiatanId ? { kegiatanId: Number(kegiatanId) } : {}),
          ...(prosesBisnisId ? { prosesBisnisId: Number(prosesBisnisId) } : {}),
          tahun: tahunDari,
        },
        analisis: {
          pengendalianUraian: pengendalianUraian.trim() || null,
          pengendalianEfektivitas: (pengendalianEfektivitas as any) || null,
          ...(levelKemungkinanId ? { levelKemungkinanId: Number(levelKemungkinanId) } : {}),
          ...(levelDampakId ? { levelDampakId: Number(levelDampakId) } : {}),
        },
        evaluasi: {
          responRisiko: responRisiko as any,
          ...(residualKemungkinanId ? { residualLevelKemungkinanId: Number(residualKemungkinanId) } : {}),
          ...(residualDampakId ? { residualLevelDampakId: Number(residualDampakId) } : {}),
        },
        rencana: responRisiko === "mengurangi" ? {
          rencanaTidakPenanganan: rencanaTidakPenanganan.trim() || null,
          targetOutput: targetOutput.trim() || null,
          targetWaktu: targetWaktu.trim() || null,
          penanggungJawab: penanggungJawab.trim() || null,
          ...(residualKemungkinanId ? { residualLevelKemungkinanId: Number(residualKemungkinanId) } : {}),
          ...(residualDampakId ? { residualLevelDampakId: Number(residualDampakId) } : {}),
        } : null,
      };

      const res = await fetch("/api/risk-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Gagal menyimpan";
        const det = data?.details ? ` (${JSON.stringify(data.details)})` : "";
        throw new Error(msg + det);
      }
      notifications.show({ title: "Tersimpan", message: `Risiko ID ${data.identifikasi?.id} tersimpan (identifikasi+analisis+evaluasi${data.rencana ? "+RTP" : ""})`, color: "green" });
      clearDraft();
      if (andAddAnother) {
        setRisiko(""); setPenyebab(""); setDampak("");
        setRencanaTidakPenanganan(""); setTargetOutput(""); setTargetWaktu(""); setPenanggungJawab("");
        setActive(0);
      } else {
        router.push("/manajemen-risiko/identifikasi");
      }
    } catch (e: any) {
      notifications.show({ title: "Gagal", message: e?.message || "Gagal menyimpan", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingLists) {
    return <Center h={300}><Loader /></Center>;
  }

  return (
    <Stack gap="md">
      <Stepper active={active} onStepClick={setActive} size="sm">
        <Stepper.Step label="Identifikasi" description="Konteks + Risiko">
          <Stack gap="md" mt="md">
            <Card withBorder padding="md" radius="md">
              <Title order={6} mb="xs">A. Konteks — Darimana risiko ini?</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select label="Sasaran" placeholder="Pilih sasaran" data={sasaranData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={sasaranId} onChange={(v) => { setSasaranId(v || ""); setKegiatanId(""); setProsesBisnisId(""); }} searchable clearable />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select label="Kegiatan" placeholder={sasaranId ? "Pilih kegiatan" : "Pilih sasaran dulu"} data={filteredKegiatan.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={kegiatanId} onChange={(v) => { setKegiatanId(v || ""); setProsesBisnisId(""); }} searchable clearable />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select label="Proses Bisnis" placeholder={kegiatanId ? "Pilih proses" : "Pilih kegiatan dulu"} data={filteredProses.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={prosesBisnisId} onChange={(v) => setProsesBisnisId(v || "")} searchable clearable />
                </Grid.Col>
              </Grid>
              <Text size="xs" c="dimmed" mt="xs">Tahun: {tahunDari} (ikut periode aktif). Kosongkan konteks jika risiko lintas-unit.</Text>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Title order={6}>B. Detail Risiko — Apa risikonya?</Title>
                <Button size="xs" variant="light" onClick={handleAiAssist} loading={aiLoading}>✨ Bantu AI</Button>
              </Group>
              <Textarea label="Risiko *" placeholder="Contoh: Data survei terlambat dikumpulkan sehingga laporan terlambat" minRows={2} value={risiko} onChange={(e) => setRisiko(e.currentTarget.value)} />
              <Grid mt="xs">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select label="Jenis Risiko *" data={jenisData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={jenisRisikoId} onChange={(v) => setJenisRisikoId(v || "")} searchable />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select label="Sumber Risiko *" data={sumberData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={sumberRisikoId} onChange={(v) => setSumberRisikoId(v || "")} searchable />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select label="Kategori *" data={kategoriData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={kategoriRisikoId} onChange={(v) => setKategoriRisikoId(v || "")} searchable />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select label="Area Dampak *" data={areaData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={areaDampakId} onChange={(v) => setAreaDampakId(v || "")} searchable />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea label="Penyebab" placeholder="Faktor penyebab" minRows={2} value={penyebab} onChange={(e) => setPenyebab(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea label="Dampak" placeholder="Akibat jika terjadi" minRows={2} value={dampak} onChange={(e) => setDampak(e.currentTarget.value)} />
                </Grid.Col>
              </Grid>
            </Card>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Analisis" description="Inheren + Pengendalian">
          <Card withBorder padding="md" radius="md" mt="md">
            <Title order={6} mb="xs">Pengendalian yang sudah dilakukan</Title>
            <Textarea label="Uraian Pengendalian" placeholder="Contoh: Verifikasi berlapis oleh ketua tim" minRows={2} value={pengendalianUraian} onChange={(e) => setPengendalianUraian(e.currentTarget.value)} />
            <Select mt="xs" label="Efektivitas" placeholder="Pilih jika sudah diketahui" data={[{ value: "efektif", label: "Efektif" }, { value: "cukup_efektif", label: "Cukup efektif" }, { value: "kurang_efektif", label: "Kurang efektif" }, { value: "tidak_efektif", label: "Tidak efektif" }]} value={pengendalianEfektivitas} onChange={(v) => setPengendalianEfektivitas(v || "")} clearable />
          </Card>
          <Card withBorder padding="md" radius="md" mt="md">
            <Title order={6} mb="xs">Risiko Aktual (Inheren)</Title>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select label="Level Kemungkinan *" data={lkData.map((x: any) => ({ value: String(x.id), label: `${x.nama} (skala ${x.skala})` }))} value={levelKemungkinanId} onChange={(v) => setLevelKemungkinanId(v || "")} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select label="Level Dampak *" data={ldData.map((x: any) => ({ value: String(x.id), label: `${x.nama} (skala ${x.skala})` }))} value={levelDampakId} onChange={(v) => setLevelDampakId(v || "")} />
              </Grid.Col>
            </Grid>
            <Group mt="md" gap="xs">
              <Text size="sm">Besaran: <b>{besaran || "-"}</b></Text>
              {besaran > 0 && <Badge color={levelInfo.warna}>{levelInfo.label}</Badge>}
              <Text size="xs" c="dimmed">(6-11 Hijau sesuai matriks terbaru)</Text>
            </Group>
          </Card>
        </Stepper.Step>

        <Stepper.Step label="Evaluasi & RTP" description="Respon + Rencana">
          <Card withBorder padding="md" radius="md" mt="md">
            <Select label="Respon Risiko *" data={[{ value: "mengurangi", label: "Mengurangi Risiko" }, { value: "mentransfer", label: "Mengalihkan Risiko" }, { value: "menghindari", label: "Menghindari Risiko" }, { value: "menerima", label: "Menerima Risiko" }]} value={responRisiko} onChange={(v) => setResponRisiko(v || "mengurangi")} />
            <Grid mt="xs">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select label="Residual Target — Kemungkinan" data={lkData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={residualKemungkinanId} onChange={(v) => setResidualKemungkinanId(v || "")} clearable />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select label="Residual Target — Dampak" data={ldData.map((x: any) => ({ value: String(x.id), label: x.nama }))} value={residualDampakId} onChange={(v) => setResidualDampakId(v || "")} clearable />
              </Grid.Col>
            </Grid>
          </Card>
          {responRisiko === "mengurangi" ? (
            <Card withBorder padding="md" radius="md" mt="md">
              <Title order={6} mb="xs">Rencana Tindak Penanganan (RTP)</Title>
              <Textarea label="Rencana Penanganan *" placeholder="Tuliskan tindak penanganan" minRows={2} value={rencanaTidakPenanganan} onChange={(e) => setRencanaTidakPenanganan(e.currentTarget.value)} />
              <Grid mt="xs">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Target Output" value={targetOutput} onChange={(e) => setTargetOutput(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput label="Target Waktu" placeholder="cth: 30/06/2026" value={targetWaktu} onChange={(e) => setTargetWaktu(e.currentTarget.value)} />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput label="Penanggung Jawab" value={penanggungJawab} onChange={(e) => setPenanggungJawab(e.currentTarget.value)} />
                </Grid.Col>
              </Grid>
            </Card>
          ) : (
            <Card withBorder padding="md" mt="md"><Text size="sm" c="dimmed">Respon selain “Mengurangi” tidak wajib RTP. Lanjut ke Review.</Text></Card>
          )}
        </Stepper.Step>

        <Stepper.Step label="Review" description="Cek & Simpan">
          <Card withBorder padding="md" radius="md" mt="md">
            <Title order={6} mb="xs">Ringkasan</Title>
            <Stack gap="xs">
              <Text size="sm"><b>Risiko:</b> {risiko || "-"}</Text>
              <Text size="sm"><b>Penyebab:</b> {penyebab || "-"}</Text>
              <Text size="sm"><b>Dampak:</b> {dampak || "-"}</Text>
              <Group gap="xs">
                <Text size="sm">Besaran Aktual: <b>{besaran || "-"}</b></Text>
                {besaran > 0 && <Badge color={levelInfo.warna}>{levelInfo.label}</Badge>}
                <Text size="sm">Respon: <b>{responRisiko}</b></Text>
              </Group>
              {responRisiko === "mengurangi" && <Text size="sm"><b>RTP:</b> {rencanaTidakPenanganan || "-"}</Text>}
            </Stack>
          </Card>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="md">
        <Group>
          <Button variant="default" onClick={prev} disabled={active === 0}>Kembali</Button>
          <Button variant="subtle" onClick={saveDraft}>Simpan Draft</Button>
        </Group>
        <Group>
          {active < 3 ? (
            <Button onClick={next}>Lanjut</Button>
          ) : (
            <>
              <Button variant="light" onClick={() => handleSubmit(true)} loading={saving}>Simpan & Tambah Lagi</Button>
              <Button onClick={() => handleSubmit(false)} loading={saving}>Simpan Risiko</Button>
            </>
          )}
        </Group>
      </Group>
    </Stack>
  );
}
