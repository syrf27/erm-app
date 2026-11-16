"use client";

import dynamic from "next/dynamic";

const RiskRegister = dynamic(
  () => import("@/components/univer-identifikasi-poc").then((module) => module.UniverIdentifikasiPoc),
  { ssr: false }
);

export default function RencanaPenangananPage() {
  return <RiskRegister initialStage="rencana" />;
}
