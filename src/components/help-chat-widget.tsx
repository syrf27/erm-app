"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconMessageCircleQuestion, IconSend, IconX } from "@tabler/icons-react";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo, saya bisa bantu menjelaskan cara menggunakan GOJAGS Risk. Coba tanyakan hal seperti cara menambahkan risiko, upload bukti dukung, atau kenapa kolom tertentu terkunci.",
};

export function HelpChatWidget() {
  const pathname = usePathname();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  useEffect(() => {
    if (!opened) return;

    fetch(`/api/help-chat?path=${encodeURIComponent(pathname)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data?.suggestions)) {
          setSuggestions(data.suggestions);
        }
      })
      .catch(() => {
        setSuggestions([]);
      });
  }, [opened, pathname]);

  useEffect(() => {
    if (!opened) return;
    window.setTimeout(() => {
      viewportRef.current?.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 0);
  }, [messages, opened]);

  const askQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setInput("");
    setLoading(true);
    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", content: trimmed },
    ]);

    try {
      const response = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, path: pathname }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Gagal memuat bantuan.");
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            data?.answer ||
            "Saya belum menemukan panduan yang sesuai. Coba gunakan kata kunci lain ya.",
        },
      ]);

      if (Array.isArray(data?.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            error?.message ||
            "Maaf, bantuan belum bisa dibuka sekarang. Silakan coba lagi sebentar.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 220,
      }}
    >
      {opened && (
        <Paper
          withBorder
          shadow="xl"
          radius="lg"
          mb="sm"
          style={{
            width: "min(420px, calc(100vw - 48px))",
            overflow: "hidden",
          }}
        >
          <Group justify="space-between" px="md" py="sm" bg="var(--mantine-color-blue-light)">
            <Stack gap={0}>
              <Text fw={700} size="sm">
                Bantuan GOJAGS Risk
              </Text>
              <Text size="xs" c="dimmed">
                Jawaban mengacu pada FAQ aplikasi
              </Text>
            </Stack>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setOpened(false)}
              aria-label="Tutup bantuan"
            >
              <IconX size={18} />
            </ActionIcon>
          </Group>

          <ScrollArea h={340} viewportRef={viewportRef} px="md" py="sm">
            <Stack gap="sm">
              {messages.map((message) => (
                <Box
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      message.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <Paper
                    radius="md"
                    px="sm"
                    py={8}
                    bg={
                      message.role === "user"
                        ? "var(--mantine-color-blue-filled)"
                        : "var(--mantine-color-gray-light)"
                    }
                    c={message.role === "user" ? "white" : undefined}
                    style={{
                      maxWidth: "86%",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.45,
                    }}
                  >
                    <Text size="sm">{message.content}</Text>
                  </Paper>
                </Box>
              ))}
              {loading && (
                <Text size="sm" c="dimmed">
                  Sedang mencari panduan yang paling sesuai...
                </Text>
              )}
            </Stack>
          </ScrollArea>

          {suggestions.length > 0 && (
            <Stack gap={6} px="md" pb="xs">
              <Text size="xs" c="dimmed">
                Pertanyaan yang bisa dicoba
              </Text>
              <Group gap={6}>
                {suggestions.slice(0, 3).map((suggestion) => (
                  <Button
                    key={suggestion}
                    size="compact-xs"
                    variant="light"
                    onClick={() => askQuestion(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </Group>
            </Stack>
          )}

          <Box
            component="form"
            px="md"
            pb="md"
            onSubmit={(event) => {
              event.preventDefault();
              askQuestion(input);
            }}
          >
            <Group align="flex-end" gap="xs" wrap="nowrap">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="Tulis pertanyaan bantuan..."
                autosize
                minRows={1}
                maxRows={3}
                maxLength={500}
                style={{ flex: 1 }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    askQuestion(input);
                  }
                }}
              />
              <ActionIcon
                type="submit"
                size="lg"
                variant="filled"
                disabled={!input.trim() || loading}
                aria-label="Kirim pertanyaan"
              >
                <IconSend size={18} />
              </ActionIcon>
            </Group>
          </Box>
        </Paper>
      )}

      <Tooltip label="Bantuan aplikasi" position="left">
        <ActionIcon
          size={54}
          radius="xl"
          variant="filled"
          color="blue"
          style={{ boxShadow: "var(--mantine-shadow-md)" }}
          onClick={() => setOpened((current) => !current)}
          aria-label="Buka bantuan aplikasi"
        >
          {opened ? <IconX size={24} /> : <IconMessageCircleQuestion size={26} />}
        </ActionIcon>
      </Tooltip>
    </Box>
  );
}
