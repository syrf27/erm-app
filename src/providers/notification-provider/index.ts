"use client";

import { notifications } from "@mantine/notifications";
import type { NotificationProvider } from "@refinedev/core";
import { createElement } from "react";
import { UndoableNotification } from "./undoable-notification";

export const notificationProvider: NotificationProvider = {
  open: ({ key, message, type, description, cancelMutation, undoableTimeout }) => {
    if (type === "progress") {
      const id = key || `progress-${Date.now()}`;
      notifications.show({
        id,
        message: createElement(UndoableNotification, {
          message,
          cancelMutation,
          undoableTimeout,
          closeNotification: () => notifications.hide(id),
        }),
        autoClose: false,
        withCloseButton: false,
        color: "blue",
      });
    } else {
      notifications.show({
        id: key,
        title: type === "success" ? "Berhasil" : "Gagal",
        message: description || message,
        color: type === "success" ? "green" : "red",
        autoClose: 5000,
      });
    }
  },
  close: (key) => {
    notifications.hide(key);
  },
};
