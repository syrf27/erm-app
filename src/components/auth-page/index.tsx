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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/navigation";

type AuthPageType = "login" | "register" | "forgotPassword";

export const AuthPage = ({ type = "login" }: { type?: AuthPageType }) => {
  const { mutate: login, isPending: isLoggingIn } = useLogin();
  const { mutate: register, isPending: isRegistering } = useRegister();
  const { mutate: forgotPassword, isPending: isSending } = useForgotPassword();
  const router = useRouter();

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = (values: { email: string; password?: string }) => {
    if (type === "login") {
      login(values);
    } else if (type === "register") {
      register(values);
    } else if (type === "forgotPassword") {
      forgotPassword(values);
    }
  };

  const titleText =
    type === "login"
      ? "Sign in"
      : type === "register"
        ? "Create an account"
        : "Forgot your password?";

  const isLoading =
    type === "login" ? isLoggingIn :
    type === "register" ? isRegistering :
    isSending;

  return (
    <Center mih="100vh">
      <Container size="xs">
        <Card withBorder shadow="md" p="xl" radius="md">
          <Stack>
            <Title order={2} ta="center">
              {titleText}
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              email: <b>demo@refine.dev</b> | password: <b>demodemo</b>
            </Text>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <TextInput
                  label="Email"
                  placeholder="demo@refine.dev"
                  {...form.getInputProps("email")}
                />
                {type !== "forgotPassword" && (
                  <PasswordInput
                    label="Password"
                    placeholder="********"
                    {...form.getInputProps("password")}
                  />
                )}
                <Button type="submit" fullWidth mt="md" loading={isLoading}>
                  {type === "login"
                    ? "Sign in"
                    : type === "register"
                      ? "Register"
                      : "Send reset link"}
                </Button>
              </Stack>
            </form>
            <Stack gap={4}>
              {type === "login" && (
                <Anchor
                  size="sm"
                  onClick={() => router.push("/register")}
                  ta="center"
                >
                  {"Don't have an account? Register"}
                </Anchor>
              )}
              {type === "login" && (
                <Anchor
                  size="sm"
                  onClick={() => router.push("/forgot-password")}
                  ta="center"
                >
                  Forgot password?
                </Anchor>
              )}
              {(type === "register" || type === "forgotPassword") && (
                <Anchor
                  size="sm"
                  onClick={() => router.push("/login")}
                  ta="center"
                >
                  Back to login
                </Anchor>
              )}
            </Stack>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
};
