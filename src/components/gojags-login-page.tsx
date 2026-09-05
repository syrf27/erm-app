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
} from "@mantine/core";
import { IconAlertCircle, IconBuildingBank, IconWorld } from "@tabler/icons-react";

interface GojagsLoginPageProps {
  authBaseUrl: string;
  clientId?: string;
}

const appName = "Sistem Informasi Manajemen Risiko";

function buildSsoUrl(authBaseUrl: string, realm: "sso" | "google", clientId?: string) {
  const normalizedBaseUrl = authBaseUrl.replace(/\/+$/, "");
  const authUrl = normalizedBaseUrl.endsWith("/auth")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/auth`;
  const url = new URL(`${authUrl}/gojags/sso/${realm}`);

  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }

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
    <>
      <style>{`
        @media (max-width: 768px) {
          .auth-container {
            flex-direction: column !important;
          }
          .auth-left-pane {
            display: none !important;
          }
          .auth-right-pane {
            padding: 24px !important;
            flex: 1 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="auth-container" style={{ display: "flex", minHeight: "100vh" }}>
        <div
          className="auth-left-pane"
          style={{
            flex: 3,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Image
            src="/pusdiklat.webp"
            alt="Background"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(0,41,94,0.82) 0%, rgba(0,25,60,0.78) 100%)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "32px 40px",
            }}
          >
            <Group gap="md" wrap="nowrap">
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: 8,
                  backdropFilter: "blur(4px)",
                }}
              >
                <Image
                  src="/bps-logo.svg"
                  alt="Pusdiklat BPS"
                  w={48}
                  h={48}
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div style={{ textAlign: "left" }}>
                <Text size="xs" c="white" style={{ lineHeight: 1.4, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  BADAN PUSAT STATISTIK
                </Text>
                <Text size="xs" c="white" style={{ lineHeight: 1.4, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  PUSAT PENDIDIKAN DAN PELATIHAN
                </Text>
              </div>
            </Group>

            <Group gap="md" wrap="nowrap">
              <div style={{ textAlign: "right" }}>
                <Text size="xs" c="white" style={{ lineHeight: 1.4, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  BADAN PUSAT STATISTIK
                </Text>
                <Text size="xs" c="white" style={{ lineHeight: 1.4, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  CORPORATE UNIVERSITY
                </Text>
              </div>
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: 8,
                  backdropFilter: "blur(4px)",
                }}
              >
                <Image
                  src="/corpu.png"
                  alt="Corpu BPS"
                  w={48}
                  h={48}
                  style={{ objectFit: "contain" }}
                />
              </div>
            </Group>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              textAlign: "center",
              padding: "0 40px 60px",
            }}
          >
            <Text
              style={{
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: 8,
                letterSpacing: "-0.5px",
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {appName}
            </Text>
          </div>
        </div>

        <div
          className="auth-right-pane"
          style={{
            flex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8f9fa",
            position: "relative",
          }}
        >
          <Paper
            shadow="0"
            p={0}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "transparent",
            }}
          >
            <Stack gap="lg">
              <div>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: 4,
                  }}
                >
                  Selamat Datang
                </Text>
                <Text size="sm" c="dimmed">
                  Silakan masuk menggunakan akun GOJAGS Anda
                </Text>
              </div>

              {(error || reason) && (
                <Alert
                  icon={<IconAlertCircle size={18} />}
                  color="red"
                  variant="light"
                  radius="md"
                  styles={{ message: { fontSize: 14 } }}
                >
                  {reason === "unauthorized"
                    ? "Sesi Anda telah berakhir, silakan login kembali."
                    : "Login gagal. Silakan coba lagi atau hubungi admin jika akun belum terdaftar."}
                </Alert>
              )}

              <Stack gap="md">
                <Button
                  fullWidth
                  size="md"
                  radius="md"
                  leftSection={<IconBuildingBank size={18} />}
                  onClick={() => handleSsoLogin("sso")}
                  styles={{
                    root: {
                      backgroundColor: "#00529b",
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "#003d7a",
                      },
                    },
                  }}
                >
                  Badan Pusat Statistik
                </Button>

                <Button
                  fullWidth
                  size="md"
                  radius="md"
                  variant="default"
                  leftSection={<IconWorld size={18} />}
                  onClick={() => handleSsoLogin("google")}
                  styles={{
                    root: {
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                    },
                  }}
                >
                  Selain Badan Pusat Statistik
                </Button>
              </Stack>

              <Text size="xs" c="dimmed" ta="center" lh={1.6}>
                GOJAGS digunakan hanya untuk autentikasi. Hak akses tetap mengikuti role dan permission di GOJAGS Risk.
              </Text>
            </Stack>
          </Paper>
        </div>
      </div>
    </>
  );
}

export function GojagsLoginPage(props: GojagsLoginPageProps) {
  return (
    <Suspense fallback={<Center mih="100vh">Loading...</Center>}>
      <LoginContent {...props} />
    </Suspense>
  );
}
