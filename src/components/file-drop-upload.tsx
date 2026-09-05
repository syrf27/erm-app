"use client";

import { useRef, useState } from "react";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { IconFileText, IconUpload } from "@tabler/icons-react";

interface FileDropUploadProps {
  accept?: string;
  currentFileName?: string;
  disabled?: boolean;
  helperText?: string;
  loading?: boolean;
  onFileSelect: (file: File) => void;
  size?: "sm" | "md";
}

export function FileDropUpload({
  accept = "*",
  currentFileName,
  disabled = false,
  helperText = "Klik untuk memilih berkas atau tarik berkas ke area ini",
  loading = false,
  onFileSelect,
  size = "md",
}: FileDropUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDisabled = disabled || loading;

  const openFilePicker = () => {
    if (!isDisabled) inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || isDisabled) return;
    onFileSelect(file);
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept={accept === "*" ? undefined : accept}
        hidden
        onChange={(event) => {
          handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <Box
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isDisabled) setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isDisabled) event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        style={{
          border: `1.5px dashed ${isDragging ? "var(--mantine-color-blue-5)" : "var(--mantine-color-gray-4)"}`,
          borderRadius: "var(--mantine-radius-md)",
          background: isDragging
            ? "light-dark(var(--mantine-color-blue-0), rgba(34, 139, 230, 0.12))"
            : "light-dark(var(--mantine-color-gray-0), rgba(255, 255, 255, 0.04))",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          padding: size === "sm" ? "10px 12px" : "18px 20px",
          transition: "border-color 120ms ease, background 120ms ease",
        }}
      >
        <Group gap="sm" wrap="nowrap" align="center">
          {loading ? (
            <Loader size={size === "sm" ? 18 : 24} />
          ) : (
            <IconUpload size={size === "sm" ? 20 : 28} color="var(--mantine-color-blue-6)" />
          )}
          <Stack gap={2}>
            <Text size={size === "sm" ? "xs" : "sm"} fw={600}>
              {loading ? "Mengunggah berkas..." : "Pilih atau tarik berkas"}
            </Text>
            <Text size="xs" c="dimmed">
              {helperText}
            </Text>
            {currentFileName && (
              <Text size="xs" c="blue" fw={500} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <IconFileText size={14} />
                {currentFileName}
              </Text>
            )}
          </Stack>
        </Group>
      </Box>
    </Box>
  );
}
