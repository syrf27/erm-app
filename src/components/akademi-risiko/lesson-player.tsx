"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ActionIcon, Badge, Button, Group, SegmentedControl, Select, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconArrowRight, IconArrowsMaximize, IconArrowsMinimize, IconPlayerPause, IconPlayerPlay, IconRefresh, IconRotateClockwise, IconZoomScan } from "@tabler/icons-react";
import { firstLesson, type InteractiveLesson } from "@/lib/akademi-risiko/lesson";
import { calculate, canAdvance, controls, cost, initialSimulation, level, order, reducer, type SimulationState } from "@/lib/akademi-risiko/simulation";
import styles from "./lesson.module.css";

const stage = ["Penyelenggara", "Jaringan", "Server LMS", "Peserta", "Pembelajaran", "Target layanan"];
const palette = { normal: "#2f9e44", warning: "#f08c00", failed: "#e03131", protected: "#1971c2", recovering: "#7950f2" };

function MiniHeatmap({ state, residual = false }: { state: SimulationState; residual?: boolean }) {
  const stats = calculate(state);
  const x = residual ? stats.residualImpact : state.impact;
  const y = residual ? stats.residualLikelihood : state.likelihood;
  return <div aria-label={`Peta risiko 5 kali 5. ${residual ? "Residual" : "Inheren"}: kemungkinan ${y || "belum dipilih"}, dampak ${x || "belum dipilih"}`}>
    <div className={styles.heatmap}>{Array.from({ length: 25 }, (_, i) => {
      const row = 5 - Math.floor(i / 5), col = i % 5 + 1, value = row * col;
      return <div key={i} className={`${styles.heatcell} ${x === col && y === row ? styles.point : ""}`} data-score={value <= 5 ? "low" : value <= 11 ? "medium" : value <= 17 ? "high" : "critical"} title={`Kemungkinan ${row}, dampak ${col}: skor ${value}`} aria-hidden="true">{value}</div>;
    })}{x > 0 && y > 0 && <span className={styles.heatdot} style={{ left: `${(x - .5) * 20}%`, top: `${(5 - y + .5) * 20}%` }} aria-hidden="true" />}</div>
    <Text size="xs" c="dimmed" mt={5}>Dampak → · Kemungkinan ↑</Text>
  </div>;
}

function Diagram({ state, load, failed, affected, onInteract }: { state: SimulationState; load: number; failed: number; affected: number; onInteract: () => void }) {
  const active = state.step === 0 ? state.interacted : state.step === 1 ? state.interacted : state.step >= 2;
  const bad = state.step >= 2 && (state.step > 2 || state.interacted) && failed > 0;
  const mitigated = state.mitigationRun && state.step >= 6;
  const serverColor = bad ? palette.failed : load > 95 ? palette.warning : mitigated ? palette.protected : palette.normal;
  const connectionClass = `${styles.flow} ${bad ? styles.flowBad : ""} ${load > 90 ? styles.flowSlow : ""}`;
  const line = (d: string, key: string) => <path key={key} d={d} fill="none" stroke={active ? "#228be6" : "#adb5bd"} strokeWidth="4" strokeDasharray={active ? "12 12" : "none"} className={active ? connectionClass : ""} />;
  const node = (x: number, y: number, label: string, color: string, symbol: string, subtitle: string) => <g key={label}>
    <rect x={x} y={y} width="160" height="84" rx="16" fill="var(--mantine-color-body)" stroke={color} strokeWidth="3" />
    <circle cx={x + 25} cy={y + 25} r="14" fill={color} opacity=".16" /><text x={x + 25} y={y + 31} textAnchor="middle" fontSize="17" fill={color}>{symbol}</text>
    <text x={x + 48} y={y + 28} fontSize="17" fontWeight="700" fill="var(--mantine-color-text)">{label}</text>
    <text x={x + 15} y={y + 60} fontSize="14" fill="var(--mantine-color-dimmed)">{subtitle}</text>
  </g>;
  return <svg viewBox="0 0 900 470" role="img" aria-label={`Simulasi pelatihan: server ${bad ? "terganggu" : "berjalan"}, beban ${load} persen, ${affected} peserta terdampak`}>
    <defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#8eb9d9" opacity=".3" /></pattern></defs><rect width="900" height="470" fill="url(#dots)" />
    {line("M230 146 H320", "a")}{line("M480 146 H560", "b")}{line("M650 185 V275", "c")}{line("M560 320 H480", "d")}{line("M320 320 H230", "e")}
    {node(70, 105, stage[0], palette.normal, "▶", active ? "Pelatihan dimulai" : "Siap memulai")}
    {node(320, 105, stage[1], bad ? palette.failed : load > 95 ? palette.warning : palette.normal, "↔", bad ? "Timeout koneksi" : load > 95 ? "Antrean meningkat" : "Request mengalir")}
    {node(560, 105, stage[2], serverColor, "▤", bad ? "OVERLOAD" : `${load}% beban`)}
    {node(560, 275, stage[3], affected ? palette.failed : palette.normal, "♟", affected ? `${affected} terdampak` : "Belajar aktif")}
    {node(320, 275, stage[4], bad ? palette.warning : palette.normal, "◉", bad ? "Tertunda" : "Berjalan")}
    {node(70, 275, stage[5], bad ? palette.failed : palette.normal, "◎", bad ? "Tidak tercapai" : "Tercapai")}
    {state.step === 1 && state.interacted && <g><rect x="402" y="204" width="95" height="31" rx="14" fill="#fff4e6" stroke="#f08c00" /><text x="449" y="225" textAnchor="middle" fontSize="12" fill="#b35b00">Antrean +{Math.max(0, 1200 - 1000)}</text></g>}
    {bad && <g className={styles.riskPulse}><circle cx="641" cy="73" r="25" fill="#e03131" /><text x="641" y="81" fontSize="25" fontWeight="800" textAnchor="middle" fill="white">!</text></g>}
    {mitigated && state.selected.includes("backup") && node(742, 115, "Cadangan", palette.protected, "↪", "Failover siap")}
    {mitigated && <g><rect x="298" y="405" width="310" height="35" rx="17" fill="#e7f5ff" stroke="#228be6" /><text x="453" y="428" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1864ab">{state.selected.map(id => controls[id].label).join(" · ")}</text></g>}
    {state.step <= 2 && <g onClick={onInteract} style={{ cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter") onInteract(); }} aria-label="Jalankan peristiwa simulasi"><rect x="22" y="15" width="220" height="36" rx="18" fill="#e7f5ff" stroke="#228be6" /><text x="132" y="39" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1864ab">Klik untuk menjalankan →</text></g>}
    {state.step >= 3 && <g><rect x="22" y="15" width="240" height="36" rx="18" fill={bad ? "#fff5f5" : "#ebfbee"} stroke={bad ? "#e03131" : "#2f9e44"} /><text x="142" y="39" textAnchor="middle" fontSize="13" fontWeight="700" fill={bad ? "#c92a2a" : "#2b8a3e"}>{bad ? "Sebab → Peristiwa → Dampak" : "Layanan berjalan"}</text></g>}
  </svg>;
}

export function LessonPlayer({ lesson = firstLesson }: { lesson?: InteractiveLesson }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialSimulation);
  const [full, setFull] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const current = lesson.steps[state.step];
  const stats = useMemo(() => calculate(state), [state]);
  const progress = reducedMotion ? 1 : Math.min(1, state.elapsed / current.duration);
  const before = useMemo(() => calculate({ ...state, mitigationRun: false, retestRun: true, step: 7 }), [state]);
  const preRetest = useMemo(() => calculate({ ...state, retestRun: false, step: 7 }), [state]);
  const tween = (from: number, to: number) => Math.round(from + (to - from) * progress);
  const displayUsers = tween(state.step === 1 || state.step === 7 ? 500 : stats.activeUsers, stats.activeUsers);
  const baselineLoad = state.step === 1 || state.step === 7 ? 45 : state.step >= 6 ? before.serverLoad : stats.serverLoad;
  const displayLoad = tween(baselineLoad, stats.serverLoad);
  const displayCapacity = tween(state.step === 1 ? 550 : state.step === 7 ? preRetest.availableCapacity : state.step >= 6 ? before.availableCapacity : stats.availableCapacity, stats.availableCapacity);
  const displayFailed = tween(state.step === 7 || state.step <= 2 ? 0 : state.step >= 6 ? before.failedRequests : stats.failedRequests, stats.failedRequests);
  const displayAffected = tween(state.step === 7 || state.step <= 2 ? 0 : state.step >= 6 ? before.affectedUsers : stats.affectedUsers, stats.affectedUsers);
  const next = useCallback(() => { if (canAdvance(state) && state.step < 8) dispatch({ type: "STEP", step: state.step + 1 }); }, [state]);
  const prev = useCallback(() => dispatch({ type: "STEP", step: state.step - 1 }), [state.step]);
  const fullscreen = useCallback(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen?.(); }, []);
  useEffect(() => { try { const saved = localStorage.getItem(`akademi-risiko:${lesson.id}`); if (saved) dispatch({ type: "RESTORE", value: JSON.parse(saved) }); } catch {} restored.current = true; }, [lesson.id]);
  useEffect(() => { if (!restored.current) return; try { localStorage.setItem(`akademi-risiko:${lesson.id}`, JSON.stringify({ step: state.step, selected: state.selected, likelihood: state.likelihood, impact: state.impact, mitigationRun: state.mitigationRun, retestRun: state.retestRun, speed: state.speed })); } catch {} }, [lesson.id, state.step, state.selected, state.likelihood, state.impact, state.mitigationRun, state.retestRun, state.speed]);
  useEffect(() => { const fn = () => setFull(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", fn); return () => document.removeEventListener("fullscreenchange", fn); }, []);
  useEffect(() => { if (!state.playing || state.elapsed >= current.duration) return; const id = window.setInterval(() => dispatch({ type: "TICK", delta: .1 }), 100); return () => window.clearInterval(id); }, [state.playing, state.elapsed, current.duration]);
  useEffect(() => { const fn = (e: KeyboardEvent) => { const target = e.target as HTMLElement; if (["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable) return; if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); else if (e.code === "Space") { e.preventDefault(); dispatch({ type: "PLAY", value: !state.playing }); } else if (e.key.toLowerCase() === "r") dispatch({ type: "REPLAY" }); else if (e.key.toLowerCase() === "f") void fullscreen(); }; window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn); }, [next, prev, state.playing, fullscreen]);
  const interaction = () => {
    if (state.step <= 2) return <Button onClick={() => dispatch({ type: "EVENT", event: current.events[0] })} disabled={state.interacted}>{["Mulai pelatihan", "Picu lonjakan traffic", "Trigger Risk"][state.step]}</Button>;
    if (state.step === 4) return <><Group grow><Select label="Kemungkinan" data={[1,2,3,4,5].map(v => String(v))} value={state.likelihood ? String(state.likelihood) : null} onChange={v => v && dispatch({ type: "RATE", field: "likelihood", value: Number(v) })} placeholder="Pilih 1–5" /><Select label="Dampak" data={[1,2,3,4,5].map(v => String(v))} value={state.impact ? String(state.impact) : null} onChange={v => v && dispatch({ type: "RATE", field: "impact", value: Number(v) })} placeholder="Pilih 1–5" /></Group><MiniHeatmap state={state} /><Text size="sm">Skor inheren: <b>{state.likelihood && state.impact ? stats.inherentScore : "—"}</b> · {state.likelihood && state.impact ? level(stats.inherentScore) : "Pilih kedua nilai"}</Text>{state.likelihood && state.impact && <Text size="xs" c="dimmed">Nilai ini mencerminkan penilaian Anda terhadap kemungkinan dan dampak.</Text>}</>;
    if (state.step === 5) return <><Text size="sm">Anggaran terpakai <b>{cost(state)}/{state.budget}</b></Text><div className={styles.controlGrid}>{order.map(id => { const c = controls[id], pressed = state.selected.includes(id); return <button key={id} type="button" className={styles.control} aria-pressed={pressed} disabled={!pressed && cost(state) + c.cost > state.budget} onClick={() => dispatch({ type: "SELECT", id })}><strong>{pressed ? "✓ " : "+ "}{c.label}</strong><small>Biaya {c.cost} · {c.days} hari · Efektivitas {c.effectiveness}%</small><small>Kemungkinan −{c.likelihood} · Dampak −{c.impact}</small></button>; })}</div></>;
    if (state.step === 6) return <><Text size="sm">Kontrol: {state.selected.map(id => controls[id].label).join(", ") || "Belum dipilih"}</Text><Button disabled={!cost(state)} onClick={() => dispatch({ type: "RUN_MITIGATION" })}>Run Mitigation Simulation</Button></>;
    if (state.step === 7) return <><Button onClick={() => dispatch({ type: "RETEST" })} disabled={!state.mitigationRun}>Uji ulang lonjakan traffic</Button>{state.retestRun && <Text size="sm" fw={700} c={stats.failedRequests ? "orange" : "green"}>{stats.failedRequests ? stats.backup ? "Failover membantu, tetapi layanan masih melambat" : "Sebagian request gagal; pemulihan berjalan" : "Layanan tetap berjalan saat lonjakan"}</Text>}</>;
    if (state.step === 8) return <><div className={styles.comparison}><div>Inheren<strong>{stats.inherentScore} · {level(stats.inherentScore)}</strong>{before.affectedUsers} peserta terdampak · {before.recoveryMinutes} menit</div><div>Residual<strong>{stats.residualScore} · {level(stats.residualScore)}</strong>{stats.affectedUsers} peserta terdampak · {stats.recoveryMinutes} menit</div></div><Text size="sm">Biaya {stats.usedBudget}/{state.budget} · Efektivitas kontrol {stats.effectiveness}%</Text><MiniHeatmap state={state} residual={state.comparing} /><Group><Button variant="light" onClick={() => dispatch({ type: "COMPARE" })}>Compare Before/After</Button><Button variant="light" onClick={() => dispatch({ type: "STEP", step: 5 })}>Try Different Controls</Button><Button variant="light" onClick={() => dispatch({ type: "RESET" })}>Restart Simulation</Button></Group></>;
    return null;
  };
  return <div ref={rootRef} className={`${styles.shell} ${full ? styles.fullscreen : ""}`}>
    <header className={styles.header}><Group align="center"><Tooltip label="Kembali ke Akademi Risiko"><ActionIcon component={Link} href="/akademi-risiko" variant="light" size="lg" aria-label="Kembali ke Akademi Risiko"><IconArrowLeft size={19} /></ActionIcon></Tooltip><div className={styles.heading}><span className={styles.eyebrow}>{lesson.module}</span><h1>{lesson.title}</h1><span className={styles.muted}>Langkah {state.step + 1}/{lesson.steps.length} · ±{lesson.minutes} menit</span></div></Group><Tooltip label={full ? "Keluar layar penuh (F)" : "Layar penuh (F)"}><ActionIcon onClick={() => void fullscreen()} variant="light" size="lg" aria-label={full ? "Keluar layar penuh" : "Layar penuh"}>{full ? <IconArrowsMinimize size={19} /> : <IconArrowsMaximize size={19} />}</ActionIcon></Tooltip></header>
    <div className={styles.metrics} aria-live="polite">{[["Peserta aktif", displayUsers], ["Beban server", `${displayLoad}%`], ["Kapasitas tersedia", displayCapacity], ["Request gagal", displayFailed], ["Peserta terdampak", displayAffected], ["Downtime", `${tween(state.step >= 6 ? before.recoveryMinutes : 0, stats.recoveryMinutes)} menit`], ["Efektivitas kontrol", `${tween(state.step >= 6 ? 0 : stats.effectiveness, stats.effectiveness)}%`], ["Skor risiko", state.step >= 8 ? `${stats.residualScore} · ${level(stats.residualScore)}` : state.step >= 4 ? state.likelihood && state.impact ? `${stats.inherentScore} · ${level(stats.inherentScore)}` : "Belum dinilai" : "Rendah"]].map(([label,value]) => <div className={styles.metric} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className={styles.layout}><section className={styles.visual} aria-label="Kanvas simulasi"><div ref={sceneRef} className={`${styles.scene} ${state.playing ? "" : styles.paused}`}><Diagram key={`${state.step}-${state.revision}`} state={state} load={displayLoad} failed={displayFailed} affected={displayAffected} onInteract={() => state.step <= 2 && dispatch({ type: "EVENT", event: current.events[0] })} /><div className={styles.sceneCaption}>{state.phase.toUpperCase()} · {Math.max(70,99.9 - displayFailed / stats.traffic * 50).toFixed(1)}% ketersediaan</div></div><div className={styles.toolbar}><Tooltip label="Langkah sebelumnya (←)"><ActionIcon onClick={prev} disabled={!state.step} variant="light" aria-label="Langkah sebelumnya"><IconArrowLeft size={18}/></ActionIcon></Tooltip><Tooltip label="Putar ulang langkah (R)"><ActionIcon onClick={() => dispatch({ type: "REPLAY" })} variant="light" aria-label="Putar ulang langkah"><IconRotateClockwise size={18}/></ActionIcon></Tooltip><Tooltip label={state.playing ? "Jeda (Space)" : "Lanjutkan (Space)"}><ActionIcon onClick={() => dispatch({ type: "PLAY", value: !state.playing })} variant="light" aria-label={state.playing ? "Jeda animasi" : "Lanjutkan animasi"}>{state.playing ? <IconPlayerPause size={18}/> : <IconPlayerPlay size={18}/>}</ActionIcon></Tooltip><Tooltip label="Reset simulasi"><ActionIcon onClick={() => dispatch({ type: "RESET" })} variant="light" aria-label="Reset simulasi"><IconRefresh size={18}/></ActionIcon></Tooltip><Tooltip label="Fit to view"><ActionIcon onClick={() => { sceneRef.current?.scrollTo({ left: 0, behavior: "smooth" }); sceneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }} variant="light" aria-label="Fit to view"><IconZoomScan size={18}/></ActionIcon></Tooltip><Tooltip label={full ? "Keluar layar penuh (F)" : "Layar penuh (F)"}><ActionIcon onClick={() => void fullscreen()} variant="light" aria-label={full ? "Keluar layar penuh" : "Layar penuh"}>{full ? <IconArrowsMinimize size={18}/> : <IconArrowsMaximize size={18}/>}</ActionIcon></Tooltip><Tooltip label="Kecepatan animasi"><SegmentedControl size="xs" aria-label="Kecepatan animasi" value={String(state.speed)} onChange={v => dispatch({ type: "SPEED", value: Number(v) as 0.5 | 1 | 2 })} data={[{label:"0.5×",value:"0.5"},{label:"1×",value:"1"},{label:"2×",value:"2"}]} /></Tooltip><Tooltip label="Langkah berikutnya (→)"><ActionIcon onClick={next} disabled={!canAdvance(state) || state.step === 8} variant="light" aria-label="Langkah berikutnya"><IconArrowRight size={18}/></ActionIcon></Tooltip></div></section>
    <aside className={styles.panel}><div><Badge variant="light">{current.type}</Badge><Text size="xs" c="dimmed" mt={8}>LANGKAH {state.step + 1} / {lesson.steps.length}</Text><h2>{current.title}</h2><p>{current.description}</p><div className={styles.insight}><strong>Inti pembelajaran</strong><br/>{current.insight}</div><div className={styles.changes}><strong>Apa yang berubah</strong>{current.changes.map(change => <div key={change}>• {change}</div>)}</div><div className={styles.interaction}>{interaction()}</div></div><div className={styles.panelFooter}><Button variant="default" onClick={prev} disabled={!state.step}>Kembali</Button><Button onClick={next} disabled={!canAdvance(state) || state.step === 8}>{state.step === 8 ? "Selesai" : "Lanjut"}</Button></div></aside></div>
  </div>;
}
