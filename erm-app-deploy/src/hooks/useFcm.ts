import { useEffect, useState } from "react";
import { getFcmToken, onMessageListener, isFcmSupported } from "@/lib/firebase";
import { notifications } from "@mantine/notifications";

export const useFcm = (identity: any) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof window !== "undefined" ? Notification.permission : "default"
  );

  const enableNotifications = async () => {
    if (!isFcmSupported()) return;
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === "granted") {
        const token = await getFcmToken();
        if (token) {
          setFcmToken(token);
          await fetch("/api/auth/fcm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          notifications.show({
            title: "Notifikasi Aktif",
            message: "Browser ini berhasil terdaftar untuk menerima push notifications.",
            color: "green",
          });
        }
      } else {
        notifications.show({
          title: "Akses Ditolak",
          message: "Izin notifikasi tidak diberikan. Harap aktifkan izin di pengaturan browser Anda.",
          color: "red",
        });
      }
    } catch (err) {
      console.error("FCM activation error:", err);
    }
  };

  useEffect(() => {
    if (!isFcmSupported() || !identity) return;

    // Automatically register if permission is already granted
    if (Notification.permission === "granted") {
      const initializeFCM = async () => {
        try {
          const token = await getFcmToken();
          if (token) {
            setFcmToken(token);
            await fetch("/api/auth/fcm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
          }
        } catch (err) {
          console.error("FCM Auto Initialisation error:", err);
        }
      };
      initializeFCM();
    }

    // Handle foreground message listener
    const unsubscribe = onMessageListener((payload) => {
      console.log("Foreground notification received:", payload);
      notifications.show({
        title: payload.notification?.title || "Notifikasi Baru",
        message: payload.notification?.body || "Ada pembaruan data ERM.",
        color: "blue",
      });
    });

    return () => {
      unsubscribe();
    };
  }, [identity]);

  return { fcmToken, permissionStatus, enableNotifications };
};
