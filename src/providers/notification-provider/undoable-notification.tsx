"use client";

import { useEffect, useState } from "react";
import { Button, Group, Text } from "@mantine/core";

interface UndoableNotificationProps {
  message: string;
  cancelMutation?: () => void;
  undoableTimeout?: number;
  closeNotification?: () => void;
}

export function UndoableNotification({
  message,
  cancelMutation,
  undoableTimeout = 0,
  closeNotification,
}: UndoableNotificationProps) {
  const [seconds, setSeconds] = useState(undoableTimeout);

  useEffect(() => {
    if (undoableTimeout <= 0) {
      closeNotification?.();
      return;
    }

    setSeconds(undoableTimeout);

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [undoableTimeout]);

  useEffect(() => {
    if (seconds <= 0) {
      closeNotification?.();
    }
  }, [seconds]);

  const handleUndo = () => {
    cancelMutation?.();
    closeNotification?.();
  };

  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" style={{ flex: 1 }}>
        {message} {seconds > 0 ? `(${seconds}s)` : ""}
      </Text>
      <Button
        size="compact-sm"
        color="red"
        variant="light"
        onClick={handleUndo}
      >
        Undo
      </Button>
    </Group>
  );
}
