import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/access-control";
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

    const push = channel !== "whatsapp" ? await sendRtpPushNotification(id) : null;
    const whatsapp = channel !== "push"
      ? await sendRtpWhatsAppReminder(id, Array.isArray(manualRecipients) ? manualRecipients : [])
      : null;

    return NextResponse.json({ success: true, push, whatsapp });
  } catch (error: any) {
    console.error("Error sending reminder:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
