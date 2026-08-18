"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_STORAGE_KEY } from "@/providers/auth-provider/auth-provider.client";

const TOUR_START_EVENT = "erm:start-tour";

type StepDef = {
  selector?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
};

const STEP_DEFS: StepDef[] = [
  {
    title: "Selamat Datang! 👋",
    description:
      "Tur singkat ini akan memperkenalkan fitur-fitur utama aplikasi ERM. " +
      "Tekan <b>Lanjut</b> untuk memulai, atau tombol <b>✕</b> untuk melewati tur ini.",
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    side: "right",
    title: "Dashboard",
    description:
      "Halaman ringkasan statistik risiko organisasi: total risiko, progres analisis, " +
      "rencana penanganan, dan matriks risiko.",
  },
  {
    selector: '[data-tour="nav-manajemen-risiko"]',
    side: "right",
    title: "Modul Manajemen Risiko",
    description:
      "Inti siklus manajemen risiko berbasis ISO 31000: <b>Penetapan Konteks → Identifikasi → " +
      "Analisis → Evaluasi → Rencana Penanganan → Matriks Risiko</b>.",
  },
  {
    selector: '[data-tour="nav-pemantauan-risiko"]',
    side: "right",
    title: "Pemantauan Risiko",
    description:
      "Pantau perkembangan dan status implementasi rencana penanganan risiko.",
  },
  {
    selector: '[data-tour="nav-bank-risiko"]',
    side: "right",
    title: "Bank Risiko",
    description:
      "Pustaka referensi risiko (risk library) yang dapat digunakan ulang antar unit kerja.",
  },
  {
    selector: '[data-tour="nav-repositori"]',
    side: "right",
    title: "Repositori Dokumen",
    description:
      "Kelola, unggah, dan unduh dokumen terkait penerapan manajemen risiko.",
  },
  {
    selector: '[data-tour="tour-notifikasi"]',
    side: "bottom",
    title: "Notifikasi",
    description:
      "Pemberitahuan terbaru seputar aktivitas risiko yang relevan untuk Anda.",
  },
  {
    selector: '[data-tour="tour-theme"]',
    side: "bottom",
    title: "Mode Tampilan",
    description:
      "Beralih antara mode terang dan gelap sesuai kenyamanan Anda.",
  },
  {
    selector: '[data-tour="tour-profile"]',
    side: "bottom",
    title: "Menu Profil",
    description:
      "Akses informasi akun dan logout. Menu <b>Lihat Panduan</b> di sini dapat membuka " +
      "kembali tur ini kapan pun Anda butuh.",
  },
  {
    selector: '[data-tour="tour-year-filter"]',
    side: "right",
    title: "Filter Tahun",
    description:
      "Batasi data yang ditampilkan pada rentang tahun tertentu.",
  },
  {
    selector: '[data-tour="tour-kpi"]',
    title: "Kartu KPI",
    description:
      "Ringkasan jumlah risiko yang teridentifikasi, sudah dianalisis, dan yang telah " +
      "memiliki rencana penanganan.",
  },
  {
    selector: '[data-tour="tour-heatmap"]',
    title: "Matriks Risiko (Inheren)",
    description:
      "Peta panas sebaran risiko berdasarkan kemungkinan × dampak. " +
      "Selamat menggunakan aplikasi ERM! 🎉",
  },
];

interface WelcomeTourProps {
  /** Called right before the tour starts (e.g. to expand the sidebar). */
  onBeforeStart?: () => void;
}

function isTourCompleted(): boolean {
  try {
    return JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) ?? "false") === true;
  } catch {
    return false;
  }
}

function markTourCompleted() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(true));
  } catch {
    // Ignore localStorage errors
  }
  fetch("/api/auth/tour", { method: "POST" }).catch((e) => console.error(e));
}

export function WelcomeTour({ onBeforeStart }: WelcomeTourProps) {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = useRef(false);
  const replayPendingRef = useRef(false);
  const suppressMarkRef = useRef(false);
  const mountedRef = useRef(true);

  const startTour = useCallback(() => {
    if (driverRef.current) return;

    // Drop steps whose target is not in the DOM (permission-filtered menu
    // items, collapsed sidebar, small screens hiding header actions, ...).
    const steps: DriveStep[] = STEP_DEFS.filter(
      (def) => !def.selector || document.querySelector(def.selector) !== null
    ).map((def) =>
      def.selector
        ? {
            element: def.selector,
            popover: { title: def.title, description: def.description, side: def.side },
          }
        : { popover: { title: def.title, description: def.description } }
    );
    if (steps.length === 0) return;

    driverRef.current = driver({
      showProgress: true,
      progressText: "{{current}} dari {{total}}",
      nextBtnText: "Lanjut ›",
      prevBtnText: "‹ Kembali",
      doneBtnText: "Selesai",
      allowClose: true,
      stagePadding: 6,
      stageRadius: 8,
      steps,
      onDestroyed: () => {
        driverRef.current = null;
        if (!suppressMarkRef.current) {
          markTourCompleted();
        }
      },
    });
    driverRef.current.drive();
  }, []);

  const scheduleTourStart = useCallback(
    (delayMs: number) => {
      onBeforeStart?.();
      if (timerRef.current) clearTimeout(timerRef.current);
      // Give the layout a moment to re-render (e.g. sidebar expanding)
      // before anchoring the first highlight. Guarded by mountedRef so a
      // pending start is a no-op after unmount.
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) startTour();
      }, delayMs);
    },
    [onBeforeStart, startTour]
  );

  // Auto-start once on the dashboard for users who haven't completed the tour.
  // The timer must live in timerRef with no effect cleanup: scheduleTourStart
  // gets a new identity on every layout re-render (identity load,
  // notification polling, ...), and a cleanup here would keep cancelling the
  // pending start before it ever fires.
  useEffect(() => {
    if (pathname !== "/" || autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (isTourCompleted()) return;
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) scheduleTourStart(500);
    }, 900);
  }, [pathname, scheduleTourStart]);

  // Replay support: "Lihat Panduan" dispatches the window event from anywhere.
  useEffect(() => {
    const handler = () => {
      if (pathname === "/") {
        scheduleTourStart(500);
      } else {
        replayPendingRef.current = true;
        router.push("/");
      }
    };
    window.addEventListener(TOUR_START_EVENT, handler);
    return () => window.removeEventListener(TOUR_START_EVENT, handler);
  }, [pathname, router, scheduleTourStart]);

  // Start the pending replay once we land on the dashboard.
  useEffect(() => {
    if (pathname === "/" && replayPendingRef.current) {
      replayPendingRef.current = false;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) scheduleTourStart(500);
      }, 900);
    }
  }, [pathname, scheduleTourStart]);

  // If the user navigates away mid-tour (e.g. browser back), end the tour
  // without marking it completed so it still shows on their next visit.
  useEffect(() => {
    if (driverRef.current) {
      suppressMarkRef.current = true;
      driverRef.current.destroy();
      suppressMarkRef.current = false;
    }
  }, [pathname]);

  // Cleanup on unmount (logout, etc.). Do not clear timerRef here: in React
  // StrictMode (dev) this cleanup runs once on the simulated unmount, which
  // would kill the pending auto-start timer; the mountedRef guard inside the
  // timeout callbacks already makes them no-op after a real unmount.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (driverRef.current) {
        suppressMarkRef.current = true;
        driverRef.current.destroy();
        suppressMarkRef.current = false;
      }
    };
  }, []);

  return null;
}
