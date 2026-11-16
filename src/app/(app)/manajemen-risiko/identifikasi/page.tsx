"use client";

import dynamic from "next/dynamic";

const UniverIdentifikasi = dynamic(
  () => import("@/components/univer-identifikasi-poc").then((module) => module.UniverIdentifikasiPoc),
  { ssr: false }
);

export default function IdentifikasiRisikoPage() {
  return <UniverIdentifikasi />;
}
