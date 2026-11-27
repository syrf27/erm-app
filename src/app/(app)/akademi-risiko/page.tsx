"use client";

import Link from "next/link";
import { Button, Card, Text, Title } from "@mantine/core";
import { IconArrowRight, IconPlayerPlay } from "@tabler/icons-react";
import { firstLesson } from "@/lib/akademi-risiko/lesson";

export default function AkademiRisikoPage() {
  return <main style={{ maxWidth: 1040, margin: "auto", padding: "12px 0 40px" }}>
    <Text c="blue" fw={800} size="xs" style={{ letterSpacing: ".15em" }}>AKADEMI RISIKO</Text>
    <Title mt="sm" mb="xs">Belajar dengan melihat risiko terjadi</Title>
    <Text c="dimmed" maw={650}>Jalankan pelatihan, picu gangguan, pilih pengendalian, lalu amati bagaimana keputusan Anda mengubah layanan dan tingkat risiko.</Text>
    <Card withBorder radius="lg" mt="xl" p="xl" style={{ background: "linear-gradient(120deg, var(--mantine-color-blue-light), var(--mantine-color-body))" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24, alignItems: "center" }}>
        <div><Text size="sm" fw={700} c="blue">{firstLesson.module} · ±{firstLesson.minutes} menit</Text><Title order={2} mt="sm">{firstLesson.title}</Title><Text mt="sm" c="dimmed">Satu simulasi visual dalam sembilan langkah. Lihat sebab, peristiwa, dampak, mitigasi, dan risiko residual pada proses pelatihan LMS.</Text><Button component={Link} href={`/akademi-risiko/belajar/${firstLesson.id}`} mt="lg" leftSection={<IconPlayerPlay size={18}/>} rightSection={<IconArrowRight size={18}/>}>Mulai simulasi</Button></div>
        <svg viewBox="0 0 420 230" role="img" aria-label="Aliran peserta menuju LMS dan target layanan" style={{ width: "100%", maxHeight: 260 }}><path d="M85 115 H165 M245 115 H325" stroke="#228be6" strokeWidth="5" strokeDasharray="10 9"/><rect x="14" y="70" width="100" height="90" rx="17" fill="#e7f5ff" stroke="#228be6" strokeWidth="3"/><rect x="160" y="70" width="100" height="90" rx="17" fill="#e7f5ff" stroke="#228be6" strokeWidth="3"/><rect x="306" y="70" width="100" height="90" rx="17" fill="#ebfbee" stroke="#2f9e44" strokeWidth="3"/><text x="64" y="121" textAnchor="middle" fill="#1864ab" fontSize="16">Peserta</text><text x="210" y="121" textAnchor="middle" fill="#1864ab" fontSize="16">LMS</text><text x="356" y="121" textAnchor="middle" fill="#2b8a3e" fontSize="16">Tujuan</text></svg>
      </div>
    </Card>
  </main>;
}
