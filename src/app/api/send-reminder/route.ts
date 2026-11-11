import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkPermission } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { sendRtpPushNotification } from "@/lib/push-notification";
import { getRtpWhatsAppPreview, sendRtpWhatsAppReminder } from "@/lib/whatsapp-notification";

export async function POST(req: Request) {
  try {
    const isAllowed = await checkPermission("users", "update");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { rtpId, channel, manualRecipients } = await req.json();
    if (!rtpId) {
      return NextResponse.json({ error: "Missing rtpId" }, { status: 400 });
    }

    const id = Number(rtpId);
    if (channel === "preview") {
      return NextResponse.json({
        success: true,
        whatsapp: await getRtpWhatsAppPreview(id, Array.isArray(manualRecipients) ? manualRecipients : []),
      });
    }

    const cookieStore = await cookies();
    let sentBy = "unknown";
    try {
      const auth = cookieStore.get("auth")?.value;
      if (auth) sentBy = JSON.parse(auth).email || sentBy;
    } catch {
      // Keep the reminder log even if the legacy auth cookie is malformed.
    }

    const push = channel !== "whatsapp" ? await sendRtpPushNotification(id) : null;
    if (channel !== "whatsapp") {
      await prisma.reminderLog.create({
        data: {
          rencanaPenangananId: id,
          channel: "push",
          recipientName: "Tim Kerja",
          status: "sent",
          sentBy,
        },
      });
    }
    const whatsapp = channel !== "push"
      ? await sendRtpWhatsAppReminder(id, Array.isArray(manualRecipients) ? manualRecipients : [])
      : null;

    if (whatsapp) {
      const deliveryLogs = whatsapp.deliveryLogs ?? [];
      if (deliveryLogs.length > 0) {
        await prisma.reminderLog.createMany({
          data: deliveryLogs.map((log) => ({
            rencanaPenangananId: id,
            channel: "whatsapp",
            recipientName: log.recipientName,
            recipientPhone: log.recipientPhone,
            recipientSource: log.recipientSource,
            status: log.status,
            providerMessageId: log.providerMessageId,
            error: log.error,
            sentBy,
          })),
        });
      } else if (!whatsapp.configured || whatsapp.errors.length > 0) {
        await prisma.reminderLog.create({
          data: {
            rencanaPenangananId: id,
            channel: "whatsapp",
            recipientName: "-",
            status: "failed",
            error: !whatsapp.configured ? "Provider WhatsApp belum dikonfigurasi" : whatsapp.errors.join("; "),
            sentBy,
          },
        });
      }
    }

    return NextResponse.json({ success: true, push, whatsapp });
  } catch (error: any) {
    console.error("Error sending reminder:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
