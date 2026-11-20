import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserContext, isAdminRole } from "@/lib/access-control";
import { OPEN_OBLIGATION_STATUSES } from "@/lib/risk-cycle";
import { notifyObligation } from "@/lib/pemantauan-service";

const REMINDER_INTERVAL_DAYS = 7;

/**
 * Job pengingat kewajiban tindak lanjut.
 * Dijalankan oleh cron: kirim header `x-reminder-secret` yang cocok dengan
 * REMINDER_JOB_SECRET, atau oleh Admin yang login.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.REMINDER_JOB_SECRET;
    const provided = request.headers.get("x-reminder-secret");
    let authorized = Boolean(secret && provided && secret === provided);
    if (!authorized) {
      const ctx = await getAuthUserContext();
      authorized = Boolean(ctx && isAdminRole(ctx.roleName));
    }
    if (!authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const cutoff = new Date(
      Date.now() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000
    );
    const due = await prisma.kewajibanTindakLanjut.findMany({
      where: {
        status: { in: OPEN_OBLIGATION_STATUSES },
        OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lt: cutoff } }],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    let sent = 0;
    for (const obligation of due) {
      const result = await notifyObligation(obligation.id);
      sent += result.sent;
    }

    return NextResponse.json({
      processed: due.length,
      notifications: sent,
      intervalDays: REMINDER_INTERVAL_DAYS,
    });
  } catch (error) {
    console.error("reminder job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
