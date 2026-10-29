import { NextResponse } from "next/server";
import { parseInteraktWebhook, verifyInteraktSignature } from "@/lib/interakt";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/interakt/webhook
 * Mirror of gojags `InteraktWebhookController` + `handleInteraktWebhook`.
 *
 * Gojags menyimpan ke tr_epd_notifikasi_webhook + update tr_epd_notifikasi.
 * ERM belum punya tabel delivery, jadi webhook ini:
 *  1. verifikasi HMAC (header Interakt-Signature),
 *  2. parse callbackData "erm:rtp:{rtpId}:user:{userId}:{kind}",
 *  3. audit ke AuditLog (resource=whatsapp_delivery),
 *  4. kembalikan { result: true } agar Interakt tidak retry.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (rawBody.length > 65536) {
    return NextResponse.json({ result: false, message: "Payload too large" }, { status: 413 });
  }

  const signature = req.headers.get("Interakt-Signature") ?? req.headers.get("interakt-signature");
  if (!(await verifyInteraktSignature(rawBody, signature))) {
    return NextResponse.json({ result: false, message: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ result: false, message: "Invalid JSON" }, { status: 422 });
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ result: false, message: "Empty payload" }, { status: 422 });
  }

  const event = parseInteraktWebhook(payload);
  const match = event.callbackData?.match(/^erm:rtp:(\d+):user:(\d+):([a-z_]+)$/);

  try {
    await prisma.auditLog.create({
      data: {
        userId: match?.[2] ?? "interakt",
        userName: "interakt-webhook",
        action: `whatsapp.${event.status ?? "unknown"}`,
        resource: "whatsapp_delivery",
        resourceId: event.callbackData ?? event.providerMessageId ?? undefined,
        details: {
          rtpId: match?.[1] ? Number(match[1]) : null,
          kind: match?.[3] ?? null,
          providerMessageId: event.providerMessageId,
          status: event.status,
        },
      },
    });
  } catch (error) {
    // Audit gagal tidak boleh membuat Interakt retry terus.
    console.error("Interakt webhook audit failed", error);
  }

  console.info("Interakt webhook", {
    callbackData: event.callbackData,
    providerMessageId: event.providerMessageId,
    status: event.status,
  });

  return NextResponse.json({ result: true, message: "Webhook accepted." });
}
