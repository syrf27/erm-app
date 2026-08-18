import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth");
  if (!auth?.value) return null;

  try {
    const parsed = JSON.parse(auth.value);
    const email = parsed.email;
    if (!email) return null;

    return prisma.user.findUnique({ where: { email } });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error("custom-notifications GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, readAll } = body;

    if (readAll) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (id) {
      const notification = await prisma.notification.findUnique({
        where: { id: Number(id) },
      });

      if (!notification || notification.userId !== user.id) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      await prisma.notification.update({
        where: { id: Number(id) },
        data: { isRead: true },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid Request Payload" }, { status: 400 });
  } catch (error: any) {
    console.error("custom-notifications PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
