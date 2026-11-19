"use client";

import { Stack, Title, Text, Group, Button } from "@mantine/core";
import { RiskWizard } from "@/components/risk-wizard/RiskWizard";
import Link from "next/link";

export default function RegisterRisikoPage() {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Register Risiko — Mode Panduan (Wizard)</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Input step-by-step: Identifikasi → Analisis → Evaluasi & RTP → Review.
            Untuk input massal tetap gunakan Mode Spreadsheet.
          </Text>
        </div>
        <Button component={Link} href="/manajemen-risiko/identifikasi" variant="light">
          ← Mode Spreadsheet
        </Button>
      </Group>
      <RiskWizard />
    </Stack>
  );
}
