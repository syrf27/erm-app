"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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
// bawahnya sehingga tetap terlihat saat tabel digulir.
const APP_HEADER_HEIGHT = 60;
const TOOLBAR_BOTTOM_GAP = 16;

const SpreadsheetTableHeightContext = createContext<number | undefined>(
  undefined
);

export function useSpreadsheetTableHeight() {
  return useContext(SpreadsheetTableHeightContext);
}

interface SpreadsheetPageProps {
  title: string;
  description?: string;
  // Jumlah perubahan belum disimpan (dirty rows). Dipakai untuk indikator,
  // shortcut simpan, dan peringatan meninggalkan halaman.
  dirtyCount: number;
  saving: boolean;
  onSave: () => void;
  searchValue: string;
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
  searchValue,
  onSearchChange,
  onSearchKeyDown,
  actions,
  children,
}: SpreadsheetPageProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number | undefined>(undefined);

  const computeTableHeight = useCallback(() => {
    if (typeof window === "undefined") return;
    const toolbarEl = toolbarRef.current;
    // Toolbar sticky selalu dimulai tepat di bawah topbar; ukur posisi bawah
    // toolbar agar tabel mengisi sisa viewport yang tersedia.
    const toolbarBottom = toolbarEl
      ? toolbarEl.getBoundingClientRect().bottom
      : APP_HEADER_HEIGHT;
    const available = window.innerHeight - toolbarBottom - TOOLBAR_BOTTOM_GAP;
    setTableHeight(Math.max(320, Math.floor(available)));
  }, []);

  useLayoutEffect(() => {
    computeTableHeight();
    const toolbarEl = toolbarRef.current;
    const observer = new ResizeObserver(() => computeTableHeight());
    if (toolbarEl) observer.observe(toolbarEl);
    window.addEventListener("resize", computeTableHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", computeTableHeight);
    };
  }, [computeTableHeight]);

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
    <SpreadsheetTableHeightContext.Provider value={tableHeight}>
      <Stack gap="sm">
        <Box
          ref={toolbarRef}
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
                value={searchValue}
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
    </SpreadsheetTableHeightContext.Provider>
  );
}
