import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/access-control";
import { sendRtpPushNotification } from "@/lib/push-notification";
import { sendRtpWhatsAppReminder } from "@/lib/whatsapp-notification";

export async function POST(req: Request) {
  try {
    const isAllowed = await checkPermission("users", "update");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { rtpId } = await req.json();
    if (!rtpId) {
      return NextResponse.json({ error: "Missing rtpId" }, { status: 400 });
    }

    const id = Number(rtpId);
    await sendRtpPushNotification(id);
    const whatsapp = await sendRtpWhatsAppReminder(id);

    return NextResponse.json({ success: true, whatsapp });
  } catch (error: any) {
    console.error("Error sending reminder:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
