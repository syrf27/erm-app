"use client";

import { Title, Text, SimpleGrid, Paper } from "@mantine/core";
import { IconSubtask, IconAlertTriangle, IconChecklist } from "@tabler/icons-react";

export default function DashboardPage() {
  return (
    <>
      <Title order={3} mb="lg">Dashboard</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Paper shadow="xs" p="md" withBorder>
          <IconSubtask size={32} />
          <Title order={4} mt="sm">Penetapan Konteks</Title>
          <Text c="dimmed" size="sm">9 area konteks risiko terdefinisi</Text>
        </Paper>
        <Paper shadow="xs" p="md" withBorder>
          <IconAlertTriangle size={32} />
          <Title order={4} mt="sm">Identifikasi Risiko</Title>
          <Text c="dimmed" size="sm">Kelola identifikasi risiko</Text>
        </Paper>
        <Paper shadow="xs" p="md" withBorder>
          <IconChecklist size={32} />
          <Title order={4} mt="sm">Pemantauan Risiko</Title>
          <Text c="dimmed" size="sm">Pantau perkembangan risiko</Text>
        </Paper>
      </SimpleGrid>
    </>
  );
}
