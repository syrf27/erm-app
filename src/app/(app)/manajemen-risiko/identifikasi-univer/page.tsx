"use client";

import dynamic from "next/dynamic";

const UniverIdentifikasiPoc = dynamic(
  () => import("@/components/univer-identifikasi-poc").then((module) => module.UniverIdentifikasiPoc),
  { ssr: false }
);

export default function IdentifikasiUniverPage() {
  return <UniverIdentifikasiPoc />;
}
