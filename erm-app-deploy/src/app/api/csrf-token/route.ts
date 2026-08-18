import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const cookieStore = request.cookies;
  let token = cookieStore.get("csrf_token")?.value;

  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    const response = NextResponse.json({ csrfToken: token });
    response.cookies.set("csrf_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ csrfToken: token });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ csrfToken: "use GET" });
}
