"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Center,
  Image,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconBrandGoogle, IconBuildingBank } from "@tabler/icons-react";

interface GojagsLoginPageProps {
  authBaseUrl: string;
  clientId?: string;
}

function buildSsoUrl(authBaseUrl: string, realm: "sso" | "google", clientId?: string) {
  const normalizedBaseUrl = authBaseUrl.replace(/\/+$/, "");
  const authUrl = normalizedBaseUrl.endsWith("/auth")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/auth`;
  const url = new URL(`${authUrl}/gojags/sso/${realm}`);
  if (clientId) url.searchParams.set("client_id", clientId);
  return url.toString();
}

function LoginContent({ authBaseUrl, clientId }: GojagsLoginPageProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");
  const handleSsoLogin = (realm: "sso" | "google") => {
    window.location.href = buildSsoUrl(authBaseUrl, realm, clientId);
  };

  return (
    <main className="login-page">
      <style>{`
        * { box-sizing: border-box; }
        .login-page { min-height: 100svh; display: grid; grid-template-columns: minmax(390px, 0.82fr) 1.18fr; background: #f4f7fb; }
        .login-panel { display: flex; align-items: center; justify-content: center; padding: clamp(28px, 6vw, 88px); }
        .login-art { position: relative; min-height: 100svh; overflow: hidden; display: grid; place-items: center; padding: clamp(24px, 4vw, 64px); background: radial-gradient(ellipse at 78% 18%, #e5f1fb 0, transparent 42%), linear-gradient(145deg, #f5f8fc, #e9eff6); }
        .login-art::before { content: ""; position: absolute; width: min(72%, 680px); aspect-ratio: 1; border-radius: 50%; background: linear-gradient(145deg, rgba(32, 132, 220, .10), rgba(42, 174, 145, .07)); filter: blur(1px); }
        .login-art img { position: relative; z-index: 1; width: 100%; height: auto; max-height: calc(100svh - 150px); object-fit: contain; object-position: center; filter: drop-shadow(0 28px 42px rgba(23, 48, 76, .14)); }
        .login-brand { position: absolute; z-index: 2; top: 38px; left: 44px; color: #43556a; }
        @media (max-width: 760px) { .login-page { grid-template-columns: 1fr; } .login-panel { min-height: 100svh; padding: 28px 22px; } .login-art { display: none; } }
      `}</style>

      <section className="login-panel">
        <Paper w="100%" maw={420} p={0} bg="transparent">
          <Stack gap="xl">
            <Stack gap={8}>
              <Image src="/bps-logo.svg" alt="BPS" w={52} h={52} fit="contain" mb="sm" />
              <Text size="sm" fw={700} c="blue.7" tt="uppercase" style={{ letterSpacing: 1.4 }}>
                GOJAGS Risk
              </Text>
              <Title order={1} size={36} fw={700} c="#16283f" style={{ letterSpacing: -1.1 }}>
                Selamat datang
              </Title>
              <Text c="dimmed" size="sm">Masuk dengan akun GOJAGS Anda.</Text>
            </Stack>

            {(error || reason) && (
              <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light" radius="md">
                {reason === "unauthorized"
                  ? "Sesi Anda berakhir. Silakan masuk kembali."
                  : "Login gagal. Periksa akun Anda atau hubungi administrator."}
              </Alert>
            )}

            <Stack gap="sm">
              <Button
                fullWidth
                size="lg"
                radius="md"
                leftSection={<IconBuildingBank size={19} />}
                onClick={() => handleSsoLogin("sso")}
                styles={{ root: { height: 54, fontWeight: 650, boxShadow: "0 8px 20px rgba(25, 118, 210, .18)" } }}
              >
                Masuk dengan akun BPS
              </Button>
              <Button
                fullWidth
                size="md"
                radius="md"
                variant="default"
                leftSection={<IconBrandGoogle size={18} />}
                onClick={() => handleSsoLogin("google")}
                styles={{ root: { height: 50, fontWeight: 600, borderColor: "#d9e1eb" } }}
              >
                Masuk dengan akun Google
              </Button>
            </Stack>

            <Text size="xs" c="dimmed" ta="left">
              Akses aplikasi mengikuti hak akses akun Anda.
            </Text>
          </Stack>
        </Paper>
      </section>

      <section className="login-art" aria-label="GOJAGS Risk visual">
        <Image src="/assets/app_with_bg.png" alt="GOJAGS Risk" />
        <div className="login-brand">
          <Text size="xs" fw={600} tt="uppercase" style={{ letterSpacing: 2, opacity: .9 }}>
            Pusat Pendidikan dan Pelatihan · BPS
          </Text>
        </div>
      </section>
    </main>
  );
}

export function GojagsLoginPage(props: GojagsLoginPageProps) {
  return (
    <Suspense fallback={<Center mih="100vh">Memuat...</Center>}>
      <LoginContent {...props} />
    </Suspense>
  );
}
