import { authProviderServer } from "@providers/auth-provider/auth-provider.server";
import { redirect } from "next/navigation";
import { GojagsLoginPage } from "@/components/gojags-login-page";

const DEFAULT_GOJAGS_AUTH_BASE_URL = "https://gojags-api.bps.go.id/auth";

export default async function Login() {
  const data = await getData();

  if (data.authenticated) {
    redirect(data?.redirectTo || "/");
  }

  return (
    <GojagsLoginPage
      authBaseUrl={process.env.GOJAGS_AUTH_BASE_URL || process.env.AUTH_BASE_URL || DEFAULT_GOJAGS_AUTH_BASE_URL}
      clientId={process.env.CLIENT_ID_GOJAGS || process.env.GOJAGS_CLIENT_ID}
    />
  );
}

async function getData() {
  const { authenticated, redirectTo, error } = await authProviderServer.check();

  return {
    authenticated,
    redirectTo,
    error,
  };
}
