"use client";

import { Group, Pagination as MantinePagination, Select, Text, Stack, Box } from "@mantine/core";

export interface PaginationProps {
  /** Current page number (1-indexed) */
  current: number;
  /** Total number of items */
  total: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page size options (default: [10, 20, 50, 100]) */
  pageSizeOptions?: number[];
  /** Show page size selector */
  showSizeChanger?: boolean;
  /** Show total count text */
  showTotal?: boolean;
  /** Custom total text renderer */
  totalText?: (total: number, range: [number, number]) => string;
}

export function Pagination({
  current,
  total,
  pageSize,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showSizeChanger = true,
  showTotal = true,
  totalText,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  const defaultTotalText = totalText
    ? totalText(total, [start, end])
    : `Menampilkan ${start}-${end} dari ${total} data`;

  return (
    <Stack gap="xs">
      {showTotal && (
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed">
            {defaultTotalText}
          </Text>
          {showSizeChanger && onPageSizeChange && (
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" c="dimmed">
                Data per halaman:
              </Text>
              <Select
                value={String(pageSize)}
                onChange={(val) => onPageSizeChange(Number(val))}
                data={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
                size="xs"
                w={70}
                comboboxProps={{ withinPortal: false }}
              />
            </Group>
          )}
        </Group>
      )}
      <Group justify="center">
        <MantinePagination
          total={totalPages}
          value={current}
          onChange={onChange}
          size="sm"
          withEdges
          siblings={1}
          boundaries={1}
        />
      </Group>
    </Stack>
  );
}
