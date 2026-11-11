"use client";

import { useState } from "react";
import { ActionIcon, Box, Stack, Tooltip } from "@mantine/core";
import { IconMessageCircleQuestion, IconRobot, IconSparkles, IconX } from "@tabler/icons-react";

export function FloatingToolsMenu() {
  const [opened, setOpened] = useState(false);

  const openChat = () => {
    window.dispatchEvent(new CustomEvent("open-help-chat-widget"));
    setOpened(false);
  };

  const openAi = () => {
    window.dispatchEvent(new CustomEvent("open-risk-ai-widget"));
    setOpened(false);
  };

  return (
    <Box style={{ position: "fixed", right: 24, bottom: 24, zIndex: 220 }}>
      {opened && (
        <Stack gap="xs" mb="sm" align="center">
          <Tooltip label="Bantuan aplikasi" position="left">
            <ActionIcon size={46} radius="xl" variant="filled" color="blue" onClick={openChat} aria-label="Buka bantuan aplikasi">
              <IconMessageCircleQuestion size={22} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Bantu isi risiko dengan AI" position="left">
            <ActionIcon size={46} radius="xl" variant="filled" color="violet" onClick={openAi} aria-label="Buka bantuan AI">
              <IconSparkles size={22} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      )}
      <Tooltip label={opened ? "Tutup menu bantuan" : "Buka menu bantuan"} position="left">
        <div className="floating-ai-wrapper">
          <span className="floating-ai-ping" aria-hidden />
          <ActionIcon
            size={58}
            radius="xl"
            variant="filled"
            color="indigo"
            className="floating-ai-btn"
            style={{ boxShadow: "var(--mantine-shadow-md)" }}
            onClick={() => setOpened((current) => !current)}
            aria-label={opened ? "Tutup menu bantuan" : "Buka menu bantuan"}
          >
            {opened ? (
              <IconX size={26} />
            ) : (
              <IconRobot className="floating-ai-icon" size={30} stroke={1.8} />
            )}
          </ActionIcon>
        </div>
      </Tooltip>
    </Box>
  );
}
