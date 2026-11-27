"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActionIcon, Badge, Button, Card, Group, NumberInput, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconArrowsMaximize, IconPlayerPause, IconPlayerPlay, IconRefresh, IconZoomScan } from "@tabler/icons-react";
import { academyLessons, type AcademyLesson } from "@/lib/akademi-risiko/curriculum";
import { BPS_MAX_RISK_TOLERANCE, BPS_RISK_MATRIX, bpsRiskColor, bpsRiskLevel, bpsRiskScore } from "@/lib/akademi-risiko/bps-risk-matrix";
import styles from "./lesson.module.css";

type PersistedProgress = { completed?: boolean; step?: number };
const sourceLabel = "Ketentuan resmi SE Sestama BPS No. 2 Tahun 2026";

function SourceBadge({ official = false }: { official?: boolean }) {
  return <Badge color={official ? "blue" : "grape"} variant="light">{official ? sourceLabel : "Ilustrasi pembelajaran"}</Badge>;
}

function Heatmap({ likelihood, impact }: { likelihood: number; impact: number }) {
  const score = bpsRiskScore(likelihood, impact);
  return <div>
    <div className={styles.heatmap} aria-label="Matriks Analisis Risiko 5 kali 5 BPS">
      {Array.from({ length: 25 }, (_, index) => {
        const row = 5 - Math.floor(index / 5);
        const column = (index % 5) + 1;
        const cellScore = BPS_RISK_MATRIX[row - 1][column - 1];
        const selected = likelihood === row && impact === column;
        return <div key={`${row}-${column}`} className={`${styles.heatcell} ${selected ? styles.point : ""}`} data-score={cellScore <= 5 ? "low" : cellScore <= 11 ? "medium" : cellScore <= 15 ? "high" : "critical"} title={`Kemungkinan ${row}, dampak ${column}: ${cellScore}`}>{cellScore}</div>;
      })}
    </div>
    <Text size="xs" c="dimmed" mt={6}>Kemungkinan ↑ · Dampak → {score ? `· Titik latihan: ${score} (${bpsRiskLevel(score)})` : "· Pilih kemungkinan dan dampak"}</Text>
  </div>;
}

function GoalCanvas({ selectedGoal, condition, onGoal, onCondition }: { selectedGoal: string | null; condition: boolean; onGoal: (value: string) => void; onCondition: () => void }) {
  const goals = ["Akses peserta", "Materi relevan", "Pengajar & fasilitas", "Jadwal pelatihan", "Kompetensi peserta", "Akuntabilitas"];
  const active = selectedGoal !== null;
  return <svg viewBox="0 0 920 480" role="img" aria-label="Peta sasaran dan risiko program pelatihan" style={{ width: "100%", minWidth: 680 }}>
    <defs><pattern id="academy-dots" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#228be6" opacity=".17" /></pattern></defs>
    <rect width="920" height="480" fill="url(#academy-dots)" />
    <rect x="334" y="175" width="255" height="118" rx="22" fill="#e7f5ff" stroke="#228be6" strokeWidth="3" />
    <text x="461" y="218" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1864ab">Program Pelatihan</text><text x="461" y="247" textAnchor="middle" fontSize="15" fill="#495057">Kegiatan ilustratif Pusdiklat</text><text x="461" y="272" textAnchor="middle" fontSize="14" fill="#868e96">Pilih sasaran yang ingin dijaga</text>
    {goals.map((goal, index) => {
      const positions = [[55, 42], [374, 24], [688, 42], [55, 340], [374, 360], [688, 340]][index] as [number, number];
      const isActive = selectedGoal === goal;
      const x = positions[0], y = positions[1];
      const cx = x < 200 ? 265 : x > 600 ? 655 : 460;
      const cy = y < 100 ? 175 : 293;
      return <g key={goal} onClick={() => onGoal(goal)} style={{ cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onGoal(goal); }} aria-label={`Pilih sasaran ${goal}`}>
        <path d={`M${x + 88} ${y + 45} L${cx} ${cy}`} stroke={isActive ? "#f08c00" : "#bac8d3"} strokeWidth={isActive ? 5 : 3} strokeDasharray={isActive ? "10 9" : "0"} />
        <rect x={x} y={y} width="176" height="90" rx="16" fill={isActive ? "#fff4e6" : "var(--mantine-color-body)"} stroke={isActive ? "#f08c00" : "#ced4da"} strokeWidth="2" />
        <text x={x + 88} y={y + 42} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--mantine-color-text)">{goal}</text><text x={x + 88} y={y + 66} textAnchor="middle" fontSize="12" fill="#868e96">sasaran ilustratif</text>
      </g>;
    })}
    {active && <g onClick={onCondition} style={{ cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onCondition(); }} aria-label="Buka kondisi ketidakpastian">
      <rect x="326" y="312" width="270" height="70" rx="16" fill={condition ? "#fff5f5" : "#f8f9fa"} stroke={condition ? "#e03131" : "#adb5bd"} strokeWidth="2" />
      <text x="461" y="341" textAnchor="middle" fontSize="15" fontWeight="700" fill={condition ? "#c92a2a" : "#495057"}>{condition ? "Data kebutuhan belum lengkap" : "Buka ketidakpastian"}</text><text x="461" y="364" textAnchor="middle" fontSize="12" fill="#868e96">contoh ilustratif</text>
    </g>}
    {condition && <g><path d="M460 382 V427" stroke="#e03131" strokeWidth="4" strokeDasharray="8 8" /><rect x="290" y="425" width="342" height="38" rx="18" fill="#fff5f5" stroke="#e03131" /><text x="461" y="450" textAnchor="middle" fontSize="13" fontWeight="700" fill="#c92a2a">Risiko: program tidak sesuai kebutuhan</text></g>}
  </svg>;
}

function InteractivePanel({ lesson, completed, onComplete }: { lesson: AcademyLesson; completed: boolean; onComplete: () => void }) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [condition, setCondition] = useState(false);
  const [likelihood, setLikelihood] = useState(0);
  const [impact, setImpact] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const score = bpsRiskScore(likelihood, impact);

  if (lesson.interaction === "goal-map") return <Stack gap="sm"><Text size="sm" fw={700}>Eksplorasi peta tujuan</Text><div style={{ overflowX: "auto" }}><GoalCanvas selectedGoal={selectedGoal} condition={condition} onGoal={setSelectedGoal} onCondition={() => setCondition(true)} /></div><Text size="sm" c="dimmed">{condition ? `Hubungan terlihat: kondisi informasi dapat memengaruhi sasaran “${selectedGoal}”. Ini contoh, bukan temuan Pusdiklat.` : selectedGoal ? "Sekarang buka ketidakpastian untuk melihat risiko dan dampaknya." : "Mulai dengan memilih salah satu sasaran pada kanvas."}</Text>{condition && <Button onClick={onComplete}>Tandai eksplorasi selesai</Button>}</Stack>;

  if (lesson.interaction === "matrix") return <Stack gap="md"><SourceBadge official /><Group grow><Select label="Level kemungkinan" placeholder="Pilih 1–5" data={[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value}` }))} value={likelihood ? String(likelihood) : null} onChange={(value) => setLikelihood(Number(value || 0))} /><Select label="Level dampak" placeholder="Pilih 1–5" data={[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value}` }))} value={impact ? String(impact) : null} onChange={(value) => setImpact(Number(value || 0))} /></Group><Heatmap likelihood={likelihood} impact={impact} />{score > 0 && <Card withBorder p="sm"><Text fw={700}>Besaran risiko {score} · {bpsRiskLevel(score)}</Text><Text size="sm" c="dimmed">Dibaca dari sel matriks BPS, bukan {likelihood} × {impact}. Contoh ini hanya latihan.</Text></Card>}<Button disabled={!score} onClick={onComplete}>Simpan penilaian latihan</Button></Stack>;

  if (lesson.interaction === "appetite") return <Stack gap="sm"><SourceBadge official /><NumberInput label="Selera unit (contoh latihan; maksimal 11)" min={1} max={11} defaultValue={8} /><Select label="Pilih skor risiko latihan" placeholder="Pilih skor" data={[7, 11, 12, 17, 21].map(String)} value={choice} onChange={setChoice} />{choice && <Card withBorder p="sm"><Text fw={700}>{Number(choice) <= BPS_MAX_RISK_TOLERANCE ? "Tetap dipantau" : "Perlu evaluasi dan/atau RTP"}</Text><Text size="sm" c="dimmed">Batas toleransi BPS adalah {BPS_MAX_RISK_TOLERANCE}. Nilai dalam toleransi bukan berarti tidak lagi dipantau.</Text></Card>}<Button disabled={!choice} onClick={onComplete}>Konfirmasi keputusan latihan</Button></Stack>;

  const options: Record<string, { prompt: string; choices: string[]; explanation: string }> = {
    "risk-chain": { prompt: "Pilih unsur yang merupakan peristiwa risiko.", choices: ["Materi belum diperbarui", "Materi pelatihan tidak sesuai kebutuhan", "Kompetensi peserta tidak tercapai"], explanation: "Peristiwa adalah kondisi yang terjadi; penyebab memicunya dan dampak menjelaskan konsekuensi terhadap sasaran." },
    "principle-match": { prompt: "Tindakan mana yang menunjukkan prinsip inklusif?", choices: ["Menilai risiko sendiri", "Melibatkan pengajar dan penyelenggara", "Menunggu masalah terjadi"], explanation: "Prinsip inklusif menempatkan pemangku kepentingan yang relevan dalam proses." },
    "role-map": { prompt: "Siapa yang menyetujui lingkup, konteks, dan kriteria pada tingkat eselon II?", choices: ["Kepala Pusdiklat sebagai Pemilik Risiko", "Setiap ketua tim secara otomatis", "Peserta pelatihan"], explanation: "Pedoman menempatkan Kepala Pusdiklat sebagai Pemilik Risiko eselon II; Pengelola Risiko memerlukan penunjukan." },
    "cycle-map": { prompt: "Apa yang dilakukan ketika informasi berubah?", choices: ["Biarkan register tetap", "Tinjau kembali tahap yang relevan", "Hapus risiko"], explanation: "Proses MR bersifat berulang; informasi baru dapat memerlukan peninjauan kembali." },
    "dilemma": { prompt: "Evidence RTP belum tersedia pada waktu pelaporan. Respons yang paling dapat dipertanggungjawabkan?", choices: ["Nyatakan selesai tanpa evidence", "Catat kondisi, tindak lanjuti evidence, dan eskalasi bila perlu", "Hapus catatan RTP"], explanation: "Keputusan yang baik membutuhkan informasi yang dapat ditelusuri dan eskalasi sesuai kebutuhan." },
    context: { prompt: "Mulai dari elemen apa sebelum menilai risiko?", choices: ["Sasaran dan proses bisnis", "Warna heatmap", "Rencana biaya"], explanation: "Lingkup, sasaran, proses, stakeholder, konteks, dan kriteria membentuk dasar penilaian." },
    identification: { prompt: "Informasi stakeholder digunakan untuk apa?", choices: ["Merumuskan penyebab, peristiwa, dan dampak", "Menentukan warna tanpa evidence", "Menghapus pengendalian yang ada"], explanation: "Identifikasi yang baik memanfaatkan informasi yang relevan dan pengendalian yang sudah ada." },
    rtp: { prompt: "Manakah RTP tambahan, bukan pengendalian rutin?", choices: ["Kehadiran pengajar yang sudah terjadwal", "Menetapkan pengajar cadangan dengan target dan PIC", "Mencatat pelatihan telah berlangsung"], explanation: "RTP adalah tindakan tambahan yang spesifik, terukur, terjadwal, dan memiliki PIC serta evidence." },
    monitoring: { prompt: "Pernyataan mana yang tepat?", choices: ["RTP selesai pasti efektif", "Risiko tidak terjadi sekali pasti terkendali", "Evidence dan penilaian ulang tetap diperlukan"], explanation: "Status RTP dan tidak terjadinya risiko belum cukup membuktikan efektivitas pengendalian." },
    integrated: { prompt: "Dasar kualitas keputusan pada kasus terpadu adalah…", choices: ["Skor akhir saja", "Alasan, evidence, peran, dan keterkaitan sasaran", "Jumlah kartu yang dipilih"], explanation: "Manajemen risiko mendukung keputusan melalui alasan yang dapat ditelusuri dan terkait sasaran." },
  };
  const config = options[lesson.interaction] ?? options.integrated;
  return <Stack gap="sm"><SourceBadge official={lesson.interaction === "role-map" || lesson.interaction === "rtp" || lesson.interaction === "monitoring"} /><Text fw={700}>{config.prompt}</Text>{config.choices.map((item) => <Button key={item} variant={choice === item ? "filled" : "light"} justify="flex-start" onClick={() => setChoice(item)}>{item}</Button>)}{choice && <Card withBorder p="sm"><Text size="sm">{config.explanation}</Text></Card>}<Button disabled={!choice || completed} onClick={onComplete}>{completed ? "Interaksi selesai" : "Simpan pilihan latihan"}</Button></Stack>;
}

export function BpsLessonPlayer({ lesson }: { lesson: AcademyLesson }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [full, setFull] = useState(false);
  const [complete, setComplete] = useState(false);
  const rootId = `academy-${lesson.id}`;
  const current = lesson.steps[step];
  const nextLesson = academyLessons[academyLessons.findIndex((item) => item.id === lesson.id) + 1];

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(`akademi-risiko:${lesson.id}`) || "{}") as PersistedProgress; setStep(Math.max(0, Math.min(lesson.steps.length - 1, saved.step || 0))); setComplete(Boolean(saved.completed)); } catch { /* stored progress is optional */ }
  }, [lesson.id, lesson.steps.length]);
  useEffect(() => { try { localStorage.setItem(`akademi-risiko:${lesson.id}`, JSON.stringify({ step, completed: complete })); } catch { /* do not block lesson */ } }, [complete, lesson.id, step]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if (["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName)) return; if (event.key === "ArrowRight" && (complete || step < lesson.steps.length - 1)) setStep((value) => Math.min(lesson.steps.length - 1, value + 1)); if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1)); if (event.code === "Space") { event.preventDefault(); setPlaying((value) => !value); } if (event.key.toLowerCase() === "r") { setStep(0); setComplete(false); } if (event.key.toLowerCase() === "f") document.getElementById(rootId)?.requestFullscreen?.(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [complete, lesson.steps.length, rootId, step]);
  useEffect(() => { const handler = () => setFull(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", handler); return () => document.removeEventListener("fullscreenchange", handler); }, []);
  const progress = useMemo(() => Math.round(((step + (complete ? 1 : 0)) / lesson.steps.length) * 100), [complete, lesson.steps.length, step]);
  const canNext = complete || step < lesson.steps.length - 1;

  return <div id={rootId} className={styles.shell}>
    <header className={styles.header}><Group align="center"><Tooltip label="Kembali ke Akademi Risiko"><ActionIcon component={Link} href="/akademi-risiko" variant="light" size="lg" aria-label="Kembali ke Akademi Risiko"><IconArrowLeft size={19} /></ActionIcon></Tooltip><div className={styles.heading}><span className={styles.eyebrow}>{lesson.track} · Modul {lesson.number}</span><h1>{lesson.title}</h1><span className={styles.muted}>Langkah {step + 1}/{lesson.steps.length} · ±{lesson.duration} menit · {progress}% terselesaikan</span></div></Group><Tooltip label="Layar penuh (F)"><ActionIcon onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.getElementById(rootId)?.requestFullscreen?.())} variant="light" size="lg" aria-label="Layar penuh"><IconArrowsMaximize size={19} /></ActionIcon></Tooltip></header>
    <div className={styles.metrics} aria-live="polite">{[["Jalur", lesson.track], ["Status", complete ? "Interaksi selesai" : "Eksplorasi"], ["Sumber", "SE Sestama BPS 2/2026"], ["Data", "Ilustrasi pembelajaran"]].map(([label, value]) => <div className={styles.metric} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className={styles.layout}><section className={styles.visual} aria-label="Kanvas pembelajaran interaktif"><div className={`${styles.scene} ${playing ? "" : styles.paused}`}><InteractivePanel lesson={lesson} completed={complete} onComplete={() => setComplete(true)} /></div><div className={styles.toolbar}><Tooltip label="Langkah sebelumnya (←)"><ActionIcon variant="light" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={!step} aria-label="Langkah sebelumnya"><IconArrowLeft size={18} /></ActionIcon></Tooltip><Tooltip label="Putar ulang lesson (R)"><ActionIcon variant="light" onClick={() => { setStep(0); setComplete(false); }} aria-label="Putar ulang lesson"><IconRefresh size={18} /></ActionIcon></Tooltip><Tooltip label={playing ? "Jeda (Space)" : "Lanjutkan (Space)"}><ActionIcon variant="light" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Jeda" : "Lanjutkan"}>{playing ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}</ActionIcon></Tooltip><Tooltip label="Fit to view"><ActionIcon variant="light" onClick={() => document.getElementById(rootId)?.scrollIntoView({ behavior: "smooth" })} aria-label="Fit to view"><IconZoomScan size={18} /></ActionIcon></Tooltip><Tooltip label="Langkah berikutnya (→)"><ActionIcon variant="light" onClick={() => setStep((value) => Math.min(lesson.steps.length - 1, value + 1))} disabled={!canNext || step === lesson.steps.length - 1} aria-label="Langkah berikutnya"><IconArrowRight size={18} /></ActionIcon></Tooltip></div></section>
      <aside className={styles.panel}><Stack gap="md"><div><SourceBadge official /><Text size="xs" c="dimmed" mt={10}>LANGKAH {step + 1} / {lesson.steps.length}</Text><h2>{current.title}</h2><Text>{current.text}</Text></div><Card withBorder p="sm"><Text size="sm" fw={700}>Inti pembelajaran</Text><Text size="sm">{current.insight}</Text></Card><div className={styles.changes}><strong>Apa yang berubah</strong>{current.changes.map((change) => <div key={change}>• {change}</div>)}</div><Card withBorder p="sm"><Text size="xs" fw={700} c="dimmed">KETERTELUSURAN INTERNAL</Text><Text size="sm" mt={4}>{lesson.traceability.source}</Text><Text size="xs" c="dimmed" mt={4}>{lesson.traceability.provision}</Text></Card></Stack><div className={styles.panelFooter}><Button variant="default" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={!step}>Kembali</Button>{step < lesson.steps.length - 1 ? <Button onClick={() => setStep((value) => value + 1)} disabled={!complete && step === lesson.steps.length - 1}>Lanjut</Button> : complete ? <Button component={Link} href={nextLesson ? `/akademi-risiko/belajar/${nextLesson.id}` : "/akademi-risiko"}>{nextLesson ? "Lesson berikutnya" : "Kembali ke Akademi"}</Button> : <Button disabled>Selesaikan interaksi</Button>}</div></aside></div>
  </div>;
}
