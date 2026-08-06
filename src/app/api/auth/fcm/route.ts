import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = JSON.parse(auth.value);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Save token associated with authenticated user
    await prisma.fcmToken.upsert({
      where: { token },
      update: { userId: user.id },
      create: { token, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM POST Subscription Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await prisma.fcmToken.deleteMany({
      where: { token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FCM DELETE Subscription Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
