"use client";

import { Suspense } from "react";

import { Tabs, Title } from "@mantine/core";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CrudTable } from "./crud-table";

const tabs = [
  { value: "sasaran", label: "Sasaran" },
  { value: "proses-bisnis", label: "Proses Bisnis" },
  { value: "pemangku-kepentingan", label: "Pemangku Kepentingan" },
  { value: "peraturan-perundangan", label: "Peraturan Perundangan" },
  { value: "jenis-risiko", label: "Jenis Risiko" },
  { value: "sumber-risiko", label: "Sumber Risiko" },
  { value: "kategori-risiko", label: "Kategori Risiko" },
  { value: "area-dampak", label: "Area Dampak" },
  { value: "level-kemungkinan", label: "Level Kemungkinan" },
  { value: "level-dampak", label: "Level Dampak" },
  { value: "kriteria-kemungkinan", label: "Kriteria Kemungkinan" },
  { value: "kriteria-dampak", label: "Kriteria Dampak" },
  { value: "level-risiko", label: "Level Risiko" },
  { value: "selera-risiko", label: "Selera Risiko" },
  { value: "opsi-penanganan", label: "Opsi Penanganan" },
];

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || "sasaran";

  return (
    <>
      <Title order={3} mb="lg">
        Penetapan Konteks
      </Title>
      <Tabs
        value={activeTab}
        onChange={(value) =>
          router.push(`${pathname}?tab=${value}`, { scroll: false })
        }
      >
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} pt="md">
            <CrudTable resource={tab.value} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}

export default function PenetapanKonteksPage() {
  return (
    <Suspense fallback="Loading...">
      <PageContent />
    </Suspense>
  );
}
