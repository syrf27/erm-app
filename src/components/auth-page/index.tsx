"use client";

import {
  useLogin,
  useRegister,
  useForgotPassword,
} from "@refinedev/core";
import {
  Button,
  Card,
  Center,
  Container,
  PasswordInput,
  Stack,
  TextInput,
  Title,
  Text,
  Anchor,
  Alert,
  Paper,
  Image,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";
import { IconMail, IconLock, IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";

type AuthPageType = "login" | "register" | "forgotPassword";

const appName = "Sistem Informasi Manajemen Risiko";

export const AuthPage = ({ type = "login" }: { type?: AuthPageType }) => {
  const { mutate: login, isPending: isLoggingIn } = useLogin();
  const { mutate: register, isPending: isRegistering } = useRegister();
  const { mutate: forgotPassword, isPending: isSending } = useForgotPassword();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Format email tidak valid"),
      password: (value) => {
        if (type === "login" || type === "register") {
          return value.length < 1 ? "Password harus diisi" : null;
        }
        return null;
      },
    },
  });

  const handleSubmit = (values: { email: string; password?: string }) => {
    setError(null);
    const submitFn =
      type === "login" ? login :
      type === "register" ? register :
      forgotPassword;

    submitFn(values, {
      onError: (err: any) => {
        setError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
      },
      onSuccess: () => {
        setError(null);
      },
    });
  };

  const isLoading =
    type === "login" ? isLoggingIn :
    type === "register" ? isRegistering :
    isSending;

  if (type === "login") {
    return <LoginView form={form} handleSubmit={handleSubmit} isLoading={isLoading} error={error} />;
  }

  return <SecondaryAuthView type={type} form={form} handleSubmit={handleSubmit} isLoading={isLoading} error={error} />;
};

interface AuthViewProps {
  form: any;
  handleSubmit: (values: { email: string; password?: string }) => void;
  isLoading: boolean;
  error: string | null;
}

function LoginView({ form, handleSubmit, isLoading, error }: AuthViewProps) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          flex: 1,
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
        style={{
          flex: 1,
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
                Silakan masuk ke akun Anda
              </Text>
            </div>

            {error && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="red"
                variant="light"
                radius="md"
                styles={{ message: { fontSize: 14 } }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="Email"
                  placeholder="nama@email.com"
                  size="md"
                  radius="md"
                  leftSection={<IconMail size={18} />}
                  {...form.getInputProps("email")}
                  styles={{
                    input: {
                      backgroundColor: "white",
                      border: "1px solid #e0e0e0",
                      "&:focus": {
                        borderColor: "#00529b",
                      },
                    },
                  }}
                />

                <PasswordInput
                  label="Password"
                  placeholder="Masukkan password"
                  size="md"
                  radius="md"
                  leftSection={<IconLock size={18} />}
                  {...form.getInputProps("password")}
                  styles={{
                    input: {
                      backgroundColor: "white",
                      border: "1px solid #e0e0e0",
                      "&:focus": {
                        borderColor: "#00529b",
                      },
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  radius="md"
                  loading={isLoading}
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
                  Masuk
                </Button>
              </Stack>
            </form>

            <Stack gap={8} align="center">
              <Anchor
                size="sm"
                onClick={() => router.push("/forgot-password")}
                c="dimmed"
              >
                Lupa password?
              </Anchor>
              <Anchor
                size="sm"
                onClick={() => router.push("/register")}
                c="#00529b"
                fw={500}
              >
                Belum punya akun? Daftar
              </Anchor>
            </Stack>
          </Stack>
        </Paper>
      </div>
    </div>
  );
}

function SecondaryAuthView({ type, form, handleSubmit, isLoading, error }: AuthViewProps & { type: "register" | "forgotPassword" }) {
  const router = useRouter();
  const isRegister = type === "register";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
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
        <div style={{ position: "relative", zIndex: 1, color: "white", textAlign: "center", padding: "40px", maxWidth: 440 }}>
          <Text
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 12,
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {appName}
          </Text>
          <Text
            style={{
              fontSize: 18,
              opacity: 0.9,
              fontWeight: 500,
              textShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
          >
            {isRegister ? "Buat Akun Baru" : "Lupa Password"}
          </Text>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f9fa",
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Image
                src="/bps-logo.svg"
                alt="Pusdiklat BPS"
                w={40}
                h={40}
                style={{ objectFit: "contain" }}
              />
              <div>
                <Text size="xs" style={{ lineHeight: 1.3, fontWeight: 600, color: "#666" }}>
                  BADAN PUSAT STATISTIK
                </Text>
                <Text size="xs" style={{ lineHeight: 1.3, fontWeight: 600, color: "#666" }}>
                  PUSAT PENDIDIKAN DAN PELATIHAN
                </Text>
              </div>
            </div>

            <div>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 4,
                }}
              >
                {isRegister ? "Buat Akun Baru" : "Reset Password"}
              </Text>
              <Text size="sm" c="dimmed">
                {isRegister
                  ? "Daftar untuk mendapatkan akses sistem"
                  : "Masukkan email untuk mereset password Anda"}
              </Text>
            </div>

            {error && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="red"
                variant="light"
                radius="md"
                styles={{ message: { fontSize: 14 } }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="Email"
                  placeholder="nama@email.com"
                  size="md"
                  radius="md"
                  leftSection={<IconMail size={18} />}
                  {...form.getInputProps("email")}
                  styles={{
                    input: {
                      backgroundColor: "white",
                      border: "1px solid #e0e0e0",
                      "&:focus": { borderColor: "#00529b" },
                    },
                  }}
                />

                {isRegister && (
                  <PasswordInput
                    label="Password"
                    placeholder="Masukkan password"
                    size="md"
                    radius="md"
                    leftSection={<IconLock size={18} />}
                    {...form.getInputProps("password")}
                    styles={{
                      input: {
                        backgroundColor: "white",
                        border: "1px solid #e0e0e0",
                        "&:focus": { borderColor: "#00529b" },
                      },
                    }}
                  />
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  radius="md"
                  loading={isLoading}
                  styles={{
                    root: {
                      backgroundColor: "#00529b",
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      "&:hover": { backgroundColor: "#003d7a" },
                    },
                  }}
                >
                  {isRegister ? "Daftar" : "Kirim Link Reset"}
                </Button>
              </Stack>
            </form>

            <Anchor
              size="sm"
              onClick={() => router.push("/login")}
              ta="center"
              c="#00529b"
              fw={500}
            >
              Kembali ke login
            </Anchor>
          </Stack>
        </Paper>
      </div>
    </div>
  );
}
