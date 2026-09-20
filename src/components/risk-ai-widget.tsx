"use client";
import { usePathname, useRouter } from "next/navigation";
import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

export function RiskAiWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const openAssistant = () => {
    if (pathname === "/manajemen-risiko/identifikasi") {
      window.dispatchEvent(new CustomEvent("open-risk-ai-assistant"));
    } else {
      router.push("/manajemen-risiko/identifikasi");
    }
  };
  return <Box style={{ position: "fixed", right: 24, bottom: 152, zIndex: 220 }}>
    <Tooltip label="Bantu isi risiko dengan AI" position="left">
      <ActionIcon size={54} radius="xl" variant="filled" color="violet" style={{ boxShadow: "var(--mantine-shadow-md)" }} onClick={openAssistant} aria-label="Buka bantuan isi risiko dengan AI">
        <IconSparkles size={26} />
      </ActionIcon>
    </Tooltip>
  </Box>;
}
