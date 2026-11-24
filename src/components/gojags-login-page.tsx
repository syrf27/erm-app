"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Center,
  Group,
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
        .login-page { min-height: 100svh; display: grid; grid-template-columns: minmax(390px, 0.82fr) 1.18fr; background: #eef3f8; }
        .login-panel { display: flex; align-items: center; justify-content: center; padding: clamp(28px, 6vw, 88px); background: linear-gradient(155deg, #fbfcfe 0%, #f4f7fb 100%); border-right: 1px solid #d7e1ec; }
        .login-art { position: relative; min-height: 100svh; overflow: hidden; display: grid; place-items: center; padding: clamp(24px, 4vw, 64px); background: linear-gradient(145deg, #dce8f4 0%, #edf3f9 52%, #d3e1ef 100%); box-shadow: inset 18px 0 44px rgba(67, 105, 143, .08); }
        .login-art::before { content: ""; position: absolute; width: min(92%, 920px); aspect-ratio: 1; background: url("/gojags.png") center / contain no-repeat; opacity: .095; transform: translate(7%, 3%); filter: saturate(.8); pointer-events: none; }
        .login-art img { position: relative; z-index: 1; width: min(108%, 1050px); height: auto; max-height: calc(100svh - 105px); object-fit: contain; object-position: center; filter: drop-shadow(0 28px 42px rgba(23, 48, 76, .18)); }
        @media (max-width: 760px) { .login-page { grid-template-columns: 1fr; } .login-panel { min-height: 100svh; padding: 28px 22px; } .login-art { display: none; } }
      `}</style>

      <section className="login-panel">
        <Paper w="100%" maw={420} p={0} bg="transparent">
          <Stack gap="xl">
            <Stack gap={8}>
              <Group gap="sm" mb="sm">
                <Image src="/bps-logo.svg" alt="BPS" w={48} h={48} fit="contain" />
                <Image src="/corpu.png" alt="BPS Corporate University" w={48} h={48} fit="contain" />
              </Group>
              <Text size="md" fw={800} c="blue.7" tt="uppercase" style={{ letterSpacing: 2 }}>
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
        <Image src="/assets/app_final_v2.png" alt="Tampilan GOJAGS Risk di desktop dan mobile" />
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
