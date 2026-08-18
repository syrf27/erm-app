import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_TOKEN_COOKIE = "csrf_token";

async function getStoredCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
}

export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  return token;
}

export async function validateCsrfToken(request: Request): Promise<boolean> {
  const submittedToken = 
    request.headers.get(CSRF_TOKEN_HEADER) ||
    (await request.clone().formData()).get("_csrf_token")?.toString();

  if (!submittedToken) return false;

  const storedToken = await getStoredCsrfToken();

  if (!storedToken) return false;

  return crypto.timingSafeEqual(
    Buffer.from(submittedToken, "hex"),
    Buffer.from(storedToken, "hex")
  );
}

export function getCsrfToken(): Promise<string | undefined> {
  return getStoredCsrfToken();
}

export const CSRF_TOKEN_HEADER_NAME = CSRF_TOKEN_HEADER;
