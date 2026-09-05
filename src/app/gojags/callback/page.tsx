"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Center, Loader, Stack, Text, Title } from "@mantine/core";

const PERMISSIONS_STORAGE_KEY = "rm_permissions";
const PROFILE_STORAGE_KEY = "rm_profile";
const TOUR_STORAGE_KEY = "rm_tour_completed";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh_token");

    if (!token) {
      window.location.href = "/login?error=no_token";
      return;
    }
    const ssoToken = token;

    async function finalizeLogin() {
      try {
        const response = await fetch("/api/auth/gojags/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: ssoToken, refreshToken }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Login GOJAGS gagal");
        }

        document.cookie = `auth=${encodeURIComponent(
          JSON.stringify({
            name: payload.name,
            email: payload.email,
            role: payload.role,
          })
        )}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(payload.permissions || []));
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(Boolean(payload.tourCompleted)));
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ avatar: payload.avatar }));

        window.location.href = "/";
      } catch (err: any) {
        setError(err?.message || "Login GOJAGS gagal");
      }
    }

    finalizeLogin();
  }, [searchParams]);

  return (
    <Center mih="100vh" px="md">
      <Stack align="center" gap="md" maw={460}>
        {error ? (
          <>
            <Alert color="red" radius="md" title="Login Gagal">
              {error}
            </Alert>
            <Text size="sm" c="dimmed" ta="center">
              Anda akan tetap berada di halaman ini agar pesan error bisa dibaca. Silakan kembali ke halaman login dan coba lagi.
            </Text>
          </>
        ) : (
          <>
            <Loader size="lg" />
            <Title order={3} ta="center">
              Menyiapkan sesi Anda...
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Tunggu sebentar, kami sedang menghubungkan akun GOJAGS dengan GOJAGS Risk.
            </Text>
          </>
        )}
      </Stack>
    </Center>
  );
}

export default function GojagsCallbackPage() {
  return (
    <Suspense fallback={<Center mih="100vh"><Loader /></Center>}>
      <CallbackContent />
    </Suspense>
  );
}
