"use client";

import { Suspense, useState } from "react";

import { Box, Card, ScrollArea, Stack, Text, TextInput, Title, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CrudTable } from "./crud-table";

const tabs = [
  { value: "teams", label: "Tim Kerja" },
  { value: "sasaran", label: "Sasaran" },
  { value: "kegiatan", label: "Kegiatan" },
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
  { value: "matriks-risiko", label: "Matriks Risiko" },
  { value: "selera-risiko", label: "Selera Risiko" },
  { value: "opsi-penanganan", label: "Opsi Penanganan" },
];

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [menuSearch, setMenuSearch] = useState("");
  const requestedTab = searchParams.get("tab");
  const activeTab = tabs.find((tab) => tab.value === requestedTab) ?? tabs[1];
  const visibleTabs = tabs.filter((tab) => tab.label.toLocaleLowerCase("id").includes(menuSearch.trim().toLocaleLowerCase("id")));

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Data Referensi Risiko</Title>
        <Text c="dimmed" size="sm" mt={4}>
          Kelola data yang digunakan dalam risk register dan penilaian risiko.
        </Text>
      </div>

      <Box className="risk-reference-layout">
        <Card withBorder radius="md" p="sm" className="risk-reference-nav">
          <Stack gap="sm">
            <TextInput
              aria-label="Cari jenis data referensi"
              placeholder="Cari jenis data..."
              leftSection={<IconSearch size={16} />}
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.currentTarget.value)}
            />
            <ScrollArea type="auto" className="risk-reference-nav-scroll">
              <nav aria-label="Jenis data referensi">
                <Stack gap={2}>
                  {visibleTabs.map((tab) => {
                    const selected = tab.value === activeTab.value;
                    return (
                      <UnstyledButton
                        key={tab.value}
                        className={`risk-reference-nav-item${selected ? " risk-reference-nav-item--active" : ""}`}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => router.push(`${pathname}?tab=${tab.value}`, { scroll: false })}
                      >
                        {tab.label}
                      </UnstyledButton>
                    );
                  })}
                  {visibleTabs.length === 0 && (
                    <Text size="sm" c="dimmed" px="sm" py="md">
                      Jenis data tidak ditemukan.
                    </Text>
                  )}
                </Stack>
              </nav>
            </ScrollArea>
            <Text size="xs" c="dimmed" px="xs">
              {visibleTabs.length} dari {tabs.length} jenis data
            </Text>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="md" className="risk-reference-content">
          <Stack gap="md">
            <div>
              <Title order={4}>{activeTab.label}</Title>
              <Text size="sm" c="dimmed">
                Lihat dan kelola data {activeTab.label.toLocaleLowerCase("id")}.
              </Text>
            </div>
            <CrudTable key={activeTab.value} resource={activeTab.value} />
          </Stack>
        </Card>
      </Box>
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
