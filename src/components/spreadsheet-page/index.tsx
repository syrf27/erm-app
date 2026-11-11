"use client";

import {
  useEffect,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-react";

// Tinggi topbar aplikasi (AppShell header) - toolbar sticky menempel di
// bawahnya sehingga tetap terlihat saat halaman digulir.
const APP_HEADER_HEIGHT = 60;

interface SpreadsheetPageProps {
  title: string;
  description?: string;
  // Jumlah perubahan belum disimpan (dirty rows). Dipakai untuk indikator,
  // shortcut simpan, dan peringatan meninggalkan halaman.
  dirtyCount: number;
  saving: boolean;
  onSave: () => void;
  // Pencarian dibuat uncontrolled agar setiap ketikan tidak memicu re-render
  // seluruh halaman (termasuk HotTable) yang membuat input terasa lambat.
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  // Aksi khusus halaman (mis. "Tambah Risiko" atau "Lanjutkan Data Belum Lengkap")
  actions?: ReactNode;
  children: ReactNode;
}

export function SpreadsheetPage({
  title,
  description,
  dirtyCount,
  saving,
  onSave,
  onSearchChange,
  onSearchKeyDown,
  actions,
  children,
}: SpreadsheetPageProps) {
  // Shortcut Ctrl+S / Cmd+S untuk menyimpan perubahan.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, saving]);

  // Peringatan saat meninggalkan halaman (reload/tutup tab) jika masih ada
  // perubahan yang belum disimpan.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  return (
    <Stack gap="sm">
      <Box
        style={{
          position: "sticky",
          top: APP_HEADER_HEIGHT,
          zIndex: 100,
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          paddingBottom: 8,
        }}
      >
        <Group justify="space-between" align="flex-end" gap="sm">
          <Title order={3}>{title}</Title>
          <Group gap="sm">
            {actions}
            <TextInput
              placeholder="Cari & Tandai Sel..."
              size="xs"
              leftSection={<IconSearch size={14} />}
              defaultValue=""
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              style={{ width: 220 }}
            />
            {dirtyCount > 0 && (
              <Badge
                variant="light"
                color="orange"
                title={`${dirtyCount} baris memiliki perubahan belum disimpan`}
              >
                {dirtyCount} perubahan belum disimpan
              </Badge>
            )}
            <Button onClick={onSave} loading={saving} leftSection={<IconDeviceFloppy size={16} />}>
              Simpan Perubahan
            </Button>
          </Group>
        </Group>
        {description && (
          <Text size="sm" c="dimmed" mt={6}>
            {description}
          </Text>
        )}
      </Box>
      {children}
    </Stack>
  );
}
