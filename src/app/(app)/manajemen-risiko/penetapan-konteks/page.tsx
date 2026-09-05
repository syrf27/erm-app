"use client";

import { Suspense } from "react";

import { Card, Group, SegmentedControl, Stack, Tabs, Text, Title } from "@mantine/core";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CrudTable } from "./crud-table";

const tabGroups = [
  {
    value: "sasaran-peraturan",
    label: "Sasaran dan Peraturan",
    description: "Tim kerja, kegiatan, sasaran, proses bisnis, pemangku kepentingan, dan regulasi.",
    tabs: [
      { value: "teams", label: "Tim Kerja" },
      { value: "kegiatan", label: "Kegiatan" },
      { value: "sasaran", label: "Sasaran" },
      { value: "proses-bisnis", label: "Proses Bisnis" },
      { value: "pemangku-kepentingan", label: "Pemangku Kepentingan" },
      { value: "peraturan-perundangan", label: "Peraturan Perundangan" },
    ],
  },
  {
    value: "klasifikasi",
    label: "Klasifikasi Risiko",
    description: "Taksonomi risiko yang dipakai saat identifikasi.",
    tabs: [
      { value: "jenis-risiko", label: "Jenis Risiko" },
      { value: "sumber-risiko", label: "Sumber Risiko" },
      { value: "kategori-risiko", label: "Kategori Risiko" },
      { value: "area-dampak", label: "Area Dampak" },
    ],
  },
  {
    value: "penilaian",
    label: "Penilaian",
    description: "Level, kriteria, dan matriks untuk menghitung risiko.",
    tabs: [
      { value: "level-kemungkinan", label: "Level Kemungkinan" },
      { value: "level-dampak", label: "Level Dampak" },
      { value: "kriteria-kemungkinan", label: "Kriteria Kemungkinan" },
      { value: "kriteria-dampak", label: "Kriteria Dampak" },
      { value: "level-risiko", label: "Level Risiko" },
      { value: "matriks-risiko", label: "Matriks Risiko" },
      { value: "selera-risiko", label: "Selera Risiko" },
    ],
  },
  {
    value: "penanganan",
    label: "Penanganan",
    description: "Pilihan strategi penanganan risiko.",
    tabs: [{ value: "opsi-penanganan", label: "Opsi Penanganan" }],
  },
];

const tabs = tabGroups.flatMap((group) => group.tabs);

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get("tab") || "sasaran";
  const activeGroup =
    tabGroups.find((group) => group.tabs.some((tab) => tab.value === activeTab)) ??
    tabGroups[0];
  const visibleTabs = activeGroup.tabs;

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Penetapan Konteks</Title>
        <Text c="dimmed" size="sm" mt={4}>
          Kelola data referensi yang menjadi dasar proses manajemen risiko.
        </Text>
      </div>

      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-end" gap="md">
            <div>
              <Text fw={600}>Kelompok Data</Text>
              <Text size="sm" c="dimmed">
                {activeGroup.description}
              </Text>
            </div>
            <Text size="sm" c="dimmed">
              {visibleTabs.length} menu
            </Text>
          </Group>

          <SegmentedControl
            value={activeGroup.value}
            onChange={(groupValue) => {
              const nextGroup = tabGroups.find((group) => group.value === groupValue);
              const nextTab = nextGroup?.tabs[0]?.value ?? "sasaran";
              router.push(`${pathname}?tab=${nextTab}`, { scroll: false });
            }}
            data={tabGroups.map((group) => ({
              value: group.value,
              label: group.label,
            }))}
            fullWidth
          />
        </Stack>
      </Card>

      <Tabs
        value={activeTab}
        onChange={(value) =>
          router.push(`${pathname}?tab=${value}`, { scroll: false })
        }
      >
        <Tabs.List>
          {visibleTabs.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} pt="md">
            {activeTab === tab.value && <CrudTable resource={tab.value} />}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
}

export default function PenetapanKonteksPage() {
  return (
    <Suspense fallback="Loading...">
      <PageContent />
    </Suspense>
  );
}
