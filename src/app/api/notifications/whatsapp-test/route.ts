import { NextResponse } from "next/server";
import { checkPermission } from "@/lib/access-control";
import {
  getInteraktConfig,
  normalizeInteraktPhone,
  sendInteraktTemplate,
} from "@/lib/interakt";

/**
 * POST /api/notifications/whatsapp-test
 * Mirror of gojags `EpdNotificationService::sendTest(..., 'whatsapp')`.
 * Body: { phone: "08...", template?: string, variables?: string[] }
 */
export async function POST(req: Request) {
  try {
    const isAllowed = await checkPermission("users", "update");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      phone?: string;
      template?: string;
      variables?: string[];
    };
    const phone = normalizeInteraktPhone(body.phone ?? "");
    if (!phone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid. Gunakan format 08... / +62..." },
        { status: 400 }
      );
    }

    const config = getInteraktConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Interakt belum dikonfigurasi (INTERAKT_ENABLED/API_KEY)." },
        { status: 422 }
      );
    }

    const template = body.template || process.env.INTERAKT_TEMPLATE_TEST || "test_pengiriman_notifikasi";
    const messageId = await sendInteraktTemplate({
      phone,
      callbackData: `erm:test:${Date.now()}`,
      template,
      bodyValues: body.variables ?? ["ERM Test", "Pesan test notifikasi WhatsApp via Interakt"],
    });

    return NextResponse.json({ success: true, messageId, template, to: `+62${phone}` });
  } catch (error) {
    console.error("WhatsApp test failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
