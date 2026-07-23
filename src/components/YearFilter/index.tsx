"use client";

import { Group, NumberInput } from "@mantine/core";

export const currentYear = new Date().getFullYear();

interface YearFilterProps {
  tahunDari: number;
  tahunSampai: number;
  onChange: (dari: number, sampai: number) => void;
}

export function YearFilter({ tahunDari, tahunSampai, onChange }: YearFilterProps) {
  return (
    <Group gap="xs">
      <NumberInput
        label="Dari Tahun"
        value={tahunDari}
        onChange={(v) => onChange(Number(v) || currentYear, tahunSampai)}
        min={2000}
        max={currentYear + 10}
        w={110}
      />
      <NumberInput
        label="Sampai Tahun"
        value={tahunSampai}
        onChange={(v) => onChange(tahunDari, Number(v) || currentYear)}
        min={2000}
        max={currentYear + 10}
        w={110}
      />
    </Group>
  );
}
