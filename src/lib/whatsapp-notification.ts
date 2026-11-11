import { prisma } from "@/lib/prisma";
import {
  getInteraktConfig,
  normalizeInteraktPhone,
  sendInteraktTemplate,
} from "@/lib/interakt";

type WhatsAppProvider = "interakt" | "graph" | "both";

type WhatsAppReminderResult = {
  configured: boolean;
  provider: WhatsAppProvider;
  attempted: number;
  sent: number;
  skipped: number;
  errors: string[];
  messageIds?: string[];
  deliveryLogs?: WhatsAppDeliveryLog[];
};

export type WhatsAppDeliveryLog = {
  recipientName: string;
  recipientPhone: string | null;
  recipientSource: "team" | "user" | "manual";
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  error?: string;
};

export type WhatsAppReminderRecipient = {
  id: number | string;
  name: string;
  email?: string | null;
  whatsappNumber: string | null;
  source: "team" | "user" | "manual";
};

export type ManualWhatsAppRecipient = {
  phone: string;
  name?: string;
};

export type WhatsAppReminderPreview = {
  rtpId: number;
  teamName: string;
  risk: string;
  recipients: WhatsAppReminderRecipient[];
};

function getProvider(): WhatsAppProvider {
  const raw = (process.env.WHATSAPP_PROVIDER || "").toLowerCase();
  if (raw === "graph" || raw === "meta") return "graph";
  if (raw === "both") return "both";
  // Default: Interakt jika dikonfigurasi (migrasi dari Meta Cloud API),
  // fallback ke graph agar setup lama tetap jalan.
  return "interakt";
}

function getInteraktTemplate(): string {
  return process.env.INTERAKT_TEMPLATE_RTP_REMINDER || "notif_mr";
}

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || "pengingat_penanganan_risiko",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "id",
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0",
  };
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return /^[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function normalizeManualRecipients(input: ManualWhatsAppRecipient[] = []): WhatsAppReminderRecipient[] {
  const recipients = new Map<string, WhatsAppReminderRecipient>();
  input.slice(0, 50).forEach((item, index) => {
    const phone = normalizeInteraktPhone(item?.phone);
    if (!phone) {
      throw new Error(`Nomor WhatsApp manual ke-${index + 1} tidak valid.`);
    }
    recipients.set(phone, {
      id: `manual:${phone}`,
      name: item.name?.trim() || `Penerima manual ${index + 1}`,
      email: null,
      whatsappNumber: phone,
      source: "manual",
    });
  });
  return Array.from(recipients.values());
}

async function loadRtpWhatsAppContext(rtpId: number, manualRecipients: ManualWhatsAppRecipient[] = []) {
  const rtp = await prisma.rencanaPenanganan.findUnique({
    where: { id: rtpId },
    include: { identifikasiRisiko: { include: { team: true } } },
  });
  if (!rtp?.identifikasiRisiko) {
    throw new Error("Rencana penanganan atau risiko tidak ditemukan");
  }

  const team = await prisma.team.findFirst({
    where: { nama: rtp.penanggungJawab || rtp.identifikasiRisiko.team?.nama || "" },
  });
  if (!team) {
    return {
      rtp,
      team: null,
      recipients: normalizeManualRecipients(manualRecipients),
    };
  }

  const manual = normalizeManualRecipients(manualRecipients);
  if (manual.length > 0) {
    return { rtp, team, recipients: manual };
  }

  // Nomor pada Tim Kerja adalah tujuan utama: satu pengingat untuk Ketua Tim.
  // Fallback ke nomor anggota lama agar data sebelum penambahan field tetap berjalan.
  if (team.whatsappNumber) {
    return {
      rtp,
      team,
      recipients: [{
        id: `team:${team.id}`,
        name: team.ketuaTim || "Ketua Tim",
        email: null,
        whatsappNumber: team.whatsappNumber,
        source: "team" as const,
      }],
    };
  }

  const teamMembers = await prisma.userTeam.findMany({
    where: { teamId: team.id },
    select: { user: { select: { id: true, name: true, email: true, whatsappNumber: true } } },
  });
  const recipients = new Map<number, WhatsAppReminderRecipient>();
  for (const { user } of teamMembers) {
    recipients.set(user.id, { ...user, source: "user" });
  }
  if (team.ketuaTim) {
    const ketua = await prisma.user.findFirst({
      where: { OR: [{ email: team.ketuaTim }, { name: team.ketuaTim }] },
      select: { id: true, name: true, email: true, whatsappNumber: true },
    });
    if (ketua) recipients.set(ketua.id, { ...ketua, source: "user" });
  }

  return { rtp, team, recipients: Array.from(recipients.values()) };
}

export async function getRtpWhatsAppPreview(
  rtpId: number,
  manualRecipients: ManualWhatsAppRecipient[] = []
): Promise<WhatsAppReminderPreview> {
  const { rtp, team, recipients } = await loadRtpWhatsAppContext(rtpId, manualRecipients);
  return {
    rtpId,
    teamName: team?.nama || rtp.penanggungJawab || "Tim belum ditentukan",
    risk: rtp.identifikasiRisiko?.risiko || "-",
    recipients,
  };
}

export async function sendRtpWhatsAppReminder(
  rtpId: number,
  manualRecipients: ManualWhatsAppRecipient[] = []
): Promise<WhatsAppReminderResult> {
  const provider = getProvider();
  const graphConfig = provider === "interakt" ? null : getWhatsAppConfig();
  const interaktConfig = provider === "graph" ? null : getInteraktConfig();
  if (!graphConfig && !interaktConfig) {
    return {
      configured: false,
      provider,
      attempted: 0,
      sent: 0,
      skipped: 0,
      errors: [],
      deliveryLogs: [],
    };
  }

  const { rtp, team, recipients } = await loadRtpWhatsAppContext(rtpId, manualRecipients);
  if (!team && recipients.length === 0) {
    return { configured: true, provider, attempted: 0, sent: 0, skipped: 0, errors: ["Tim penanggung jawab tidak ditemukan"] };
  }

  const evidenceUrl = process.env.EVIDENCE_DRIVE_URL || "https://drive.google.com/drive/folders/1ME4zKW6vP1GwQu1KCTnXKfgihRITtd3C?usp=sharing";
  // Tombol Interakt hanya menerima path+query (suffix ke base URL tombol di template),
  // jadi JANGAN pakai link Drive eksternal di sini — domain-nya akan ter-strip.
  // Tombol selalu mengarah ke halaman internal, link Drive tetap terkirim sebagai {{5}}.
  const appBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const actionUrl = appBase ? `${appBase}/pemantauan-risiko` : "";
  const variables = [
    team?.nama || rtp.penanggungJawab || "Penerima manual",
    rtp.identifikasiRisiko.risiko,
    rtp.rencanaTidakPenanganan || "Belum diisi",
    rtp.targetWaktu || "Belum ditentukan",
    evidenceUrl,
  ];
  const endpoint = graphConfig
    ? `https://graph.facebook.com/${graphConfig.apiVersion}/${graphConfig.phoneNumberId}/messages`
    : null;
  const result: WhatsAppReminderResult = {
    configured: true,
    provider,
    attempted: 0,
    sent: 0,
    skipped: 0,
    errors: [],
    messageIds: [],
    deliveryLogs: [],
  };

  const useInterakt = interaktConfig !== null && (provider === "interakt" || provider === "both");
  const useGraph = graphConfig !== null && endpoint !== null && (provider === "graph" || provider === "both");
  // Jika provider=both tapi salah satu belum terkonfigurasi, pakai yang tersedia.
  const sendViaInteraktFirst = interaktConfig !== null && provider !== "graph";

  for (const recipient of recipients) {
    const rawNumber = recipient.whatsappNumber;
    // HIGHLIGHT vs gojags: Interakt butuh nomor PENDEK (tanpa 62) + countryCode terpisah,
    // sedangkan Meta Graph butuh nomor FULL internasional (62...).
    const interaktTo = rawNumber ? normalizeInteraktPhone(rawNumber) : null;
    const graphTo = rawNumber ? normalizeWhatsAppNumber(rawNumber) : null;
    const to = sendViaInteraktFirst ? interaktTo ?? graphTo : graphTo ?? interaktTo;
    if (!to) {
      result.skipped += 1;
      result.deliveryLogs?.push({
        recipientName: recipient.name,
        recipientPhone: rawNumber,
        recipientSource: recipient.source,
        status: "skipped",
        error: "Nomor WhatsApp tidak valid atau belum diisi",
      });
      continue;
    }

    result.attempted += 1;
    const callbackData = `erm:rtp:${rtpId}:user:${recipient.id}:reminder`;
    // 1) Interakt (prioritas baru). bodyValues = {{1}}..{{5}} template.
    if ((sendViaInteraktFirst && interaktTo) || (useInterakt && !useGraph)) {
      try {
        const messageId = await sendInteraktTemplate({
          phone: interaktTo as string,
          callbackData,
          template: getInteraktTemplate(),
          bodyValues: variables,
          buttonUrl: actionUrl.startsWith("http") ? actionUrl : undefined,
        });
        result.sent += 1;
        result.messageIds?.push(messageId);
        result.deliveryLogs?.push({
          recipientName: recipient.name,
          recipientPhone: rawNumber,
          recipientSource: recipient.source,
          status: "sent",
          providerMessageId: messageId,
        });
        continue;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException)?.code;
        console.error("Interakt reminder failed", { rtpId, userId: recipient.id, error });
        // Rate-limit Interakt -> jangan langsung fallback spam; catat & lanjut.
        // Error lain + graph tersedia -> fallback ke graph di bawah.
        if (code === "INTERAKT_RATE_LIMITED" || !useGraph || !graphTo) {
          result.errors.push(`Gagal mengirim ke ${recipient.name}`);
          result.deliveryLogs?.push({
            recipientName: recipient.name,
            recipientPhone: rawNumber,
            recipientSource: recipient.source,
            status: "failed",
            error: error instanceof Error ? error.message : "Gagal mengirim WhatsApp",
          });
          continue;
        }
      }
    }
    // 2) Meta Graph API (setup lama, dipertahankan sebagai fallback).
    if (!useGraph || !graphTo) {
      result.errors.push(`Gagal mengirim ke ${recipient.name}`);
      continue;
    }
    try {
      const response = await fetch(endpoint as string, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(graphConfig as NonNullable<ReturnType<typeof getWhatsAppConfig>>).accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: graphTo,
          type: "template",
          template: {
            name: (graphConfig as NonNullable<ReturnType<typeof getWhatsAppConfig>>).templateName,
            language: { code: (graphConfig as NonNullable<ReturnType<typeof getWhatsAppConfig>>).language },
            components: [
              {
                type: "body",
                // Must match {{1}} through {{5}} in the approved template.
                parameters: variables.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      result.sent += 1;
      result.deliveryLogs?.push({
        recipientName: recipient.name,
        recipientPhone: rawNumber,
        recipientSource: recipient.source,
        status: "sent",
      });
    } catch (error) {
      console.error("WhatsApp reminder failed", { rtpId, userId: recipient.id, error });
      result.errors.push(`Gagal mengirim ke ${recipient.name}`);
      result.deliveryLogs?.push({
        recipientName: recipient.name,
        recipientPhone: rawNumber,
        recipientSource: recipient.source,
        status: "failed",
        error: error instanceof Error ? error.message : "Gagal mengirim WhatsApp",
      });
    }
  }

  return result;
}
