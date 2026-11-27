"use client";

import Link from "next/link";
import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconBook2, IconPlayerPlay } from "@tabler/icons-react";
import { academyLessons, academyTracks } from "@/lib/akademi-risiko/curriculum";

export default function AkademiRisikoPage() {
  return <main style={{ maxWidth: 1120, margin: "auto", padding: "12px 0 40px" }}>
    <Text c="blue" fw={800} size="xs" style={{ letterSpacing: ".15em" }}>AKADEMI RISIKO</Text>
    <Title mt="sm" mb="xs">Belajar manajemen risiko melalui keputusan</Title>
    <Text c="dimmed" maw={780}>Kurikulum interaktif berdasarkan Surat Edaran Sekretaris Utama BPS Nomor 2 Tahun 2026. Kasus Pusdiklat pada Akademi diberi label ilustrasi pembelajaran dan bukan data atau kejadian aktual.</Text>
    <Card withBorder radius="lg" mt="xl" p="xl" style={{ background: "linear-gradient(120deg, var(--mantine-color-blue-light), var(--mantine-color-body))" }}>
      <Group justify="space-between" align="end" gap="xl"><div><Badge color="blue" variant="light">MULAI DARI JALUR DASAR</Badge><Title order={2} mt="sm">Pahami sasaran sebelum menilai risiko</Title><Text mt="sm" c="dimmed" maw={650}>Mulai dari tujuan program pelatihan, petakan ketidakpastian, lalu lihat bagaimana keputusan pengelolaan risiko membantu sasaran tetap tercapai.</Text></div><Button component={Link} href={`/akademi-risiko/belajar/${academyLessons[0].id}`} leftSection={<IconPlayerPlay size={18} />} rightSection={<IconArrowRight size={18} />}>Mulai Modul 1</Button></Group>
    </Card>
    {academyTracks.map((track) => <section key={track} style={{ marginTop: 38 }}><Group mb="md"><IconBook2 size={22} /><Title order={2}>{track === "Dasar" ? "Dasar: Mengenal Manajemen Risiko BPS" : "Praktik Terbimbing: Mengelola Risiko Kegiatan Pusdiklat"}</Title></Group><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">{academyLessons.filter((lesson) => lesson.track === track).map((lesson) => <Card key={lesson.id} withBorder radius="lg" p="lg"><Stack gap="sm" h="100%"><Group justify="space-between"><Badge variant="light" color={track === "Dasar" ? "blue" : "grape"}>MODUL {lesson.number}</Badge><Text size="xs" c="dimmed">±{lesson.duration} menit</Text></Group><Title order={3} size="h4">{lesson.title}</Title><Text size="sm" c="dimmed" style={{ flex: 1 }}>{lesson.summary}</Text><Text size="xs" c="dimmed">Rujukan: {lesson.traceability.source}</Text><Button component={Link} href={`/akademi-risiko/belajar/${lesson.id}`} variant="light" rightSection={<IconArrowRight size={16} />}>Buka lesson</Button></Stack></Card>)}</SimpleGrid></section>)}
  </main>;
}
