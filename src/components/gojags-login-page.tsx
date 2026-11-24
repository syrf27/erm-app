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
        .login-art { position: relative; min-height: 100svh; overflow: hidden; background: #10253f; }
        .login-art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
        .login-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(145deg, rgba(7, 25, 47, .18) 18%, rgba(7, 25, 47, .08) 55%, rgba(7, 25, 47, .48)); }
        .login-brand { position: relative; z-index: 1; align-self: flex-end; margin: 0 0 44px 44px; color: white; text-shadow: 0 2px 18px rgba(0,0,0,.35); }
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
