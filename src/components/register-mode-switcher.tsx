"use client";

import { SegmentedControl } from "@mantine/core";
import { IconTable, IconForms } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

export function RegisterModeSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const value = pathname?.includes("/manajemen-risiko/register") ? "panduan" : "spreadsheet";

  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={(v) => {
        if (v === "panduan") router.push("/manajemen-risiko/register");
        else router.push("/manajemen-risiko/risk-register");
      }}
      data={[
        {
          value: "spreadsheet",
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconTable size={14} />
              Spreadsheet
            </span>
          ),
        },
        {
          value: "panduan",
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <IconForms size={14} />
              Tampilan Tabel
            </span>
          ),
        },
      ]}
    />
  );
}
