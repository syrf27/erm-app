/**
 * Interakt WhatsApp client — port of `EpdNotificationService::sendInterakt`
 * from pusdiklat-gojags-backend to erm-app (Next.js).
 *
 * Contract (must match gojags-backend):
 *  POST {INTERAKT_ENDPOINT}
 *  Headers: Authorization: {scheme} {apiKey}, Content-Type: application/json
 *  Body: { countryCode: "+62", phoneNumber, callbackData, type: "Template",
 *          template: { name, languageCode, bodyValues, buttonValues? } }
 *  Success: HTTP 2xx + json.result === true + string json.id
 */

export type InteraktConfig = {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  authScheme: string;
  languageCode: string;
  buttonIndex: number;
  timeoutMs: number;
  webhookSecret: string;
};

export function getInteraktConfig(): InteraktConfig | null {
  const enabled = process.env.INTERAKT_ENABLED === "true";
  const endpoint = process.env.INTERAKT_ENDPOINT || "https://api.interakt.ai/v1/public/message/";
  const apiKey = process.env.INTERAKT_API_KEY || "";
  if (!enabled || !apiKey || !endpoint) return null;

  return {
    enabled,
    endpoint,
    apiKey,
    authScheme: process.env.INTERAKT_AUTH_SCHEME || "Basic",
    languageCode: process.env.INTERAKT_LANGUAGE_CODE || "id",
    buttonIndex: Number(process.env.INTERAKT_BUTTON_INDEX || "0"),
    timeoutMs: Number(process.env.INTERAKT_TIMEOUT_MS || "15000"),
    webhookSecret: process.env.INTERAKT_WEBHOOK_SECRET || "",
  };
}

export function isInteraktConfigured(): boolean {
  return getInteraktConfig() !== null;
}

/**
 * Same normalization as gojags `interaktPhone()`:
 * "08.." -> "62..", "8.." -> "62..", valid only /^628\d{7,12}$/.
 * Returns phone WITHOUT leading "62" because Interakt wants
 * { countryCode: "+62", phoneNumber: "<without 62>" } separately.
 */
export function normalizeInteraktPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  if (!/^628\d{7,12}$/.test(digits)) return null;
  return digits.slice(2);
}

/** Display form: +62... (for logging / admin UI). */
export function formatInteraktPhoneInternational(value: string | null | undefined): string | null {
  const short = normalizeInteraktPhone(value);
  return short ? `+62${short}` : null;
}

/**
 * Same as gojags `dynamicButtonValues()`: Interakt URL-button takes
 * path+query only, keyed by button index.
 */
export function buildInteraktButtonValues(url: string, buttonIndex = 0): Record<string, string[]> {
  let path = "";
  try {
    const parsed = new URL(url);
    path = parsed.pathname.replace(/^\//, "");
    if (parsed.search) path += parsed.search;
  } catch {
    path = url.replace(/^https?:\/\/[^/]+\//, "");
  }
  return { [String(buttonIndex)]: [path] };
}

export type SendInteraktParams = {
  phone: string; // short form (without 62), use normalizeInteraktPhone() first
  callbackData: string; // correlation key, e.g. "erm:rtp:12:user:34:reminder"
  template: string;
  bodyValues: string[];
  buttonUrl?: string;
};

export async function sendInteraktTemplate(params: SendInteraktParams): Promise<string> {
  const config = getInteraktConfig();
  if (!config) throw new Error("Konfigurasi Interakt belum lengkap (INTERAKT_ENABLED/API_KEY/ENDPOINT).");
  if (!params.template) throw new Error("Nama template Interakt belum diisi.");
  if (!params.phone) throw new Error("Nomor WhatsApp tidak valid untuk Interakt.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `${config.authScheme} ${config.apiKey}`.trim(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        countryCode: "+62",
        phoneNumber: params.phone,
        callbackData: params.callbackData,
        type: "Template",
        template: {
          name: params.template,
          languageCode: config.languageCode,
          bodyValues: params.bodyValues,
          ...(params.buttonUrl
            ? { buttonValues: buildInteraktButtonValues(params.buttonUrl, config.buttonIndex) }
            : {}),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 429) {
        const err = new Error(`Interakt rate-limited (429): ${text.slice(0, 500)}`);
        (err as NodeJS.ErrnoException).code = "INTERAKT_RATE_LIMITED";
        throw err;
      }
      throw new Error(`Interakt HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    const json = (await response.json().catch(() => null)) as {
      result?: unknown;
      id?: unknown;
    } | null;
    if (!json || json.result !== true) {
      throw new Error("Provider WhatsApp menolak pesan atau memberikan respons tidak valid.");
    }
    if (typeof json.id !== "string" || !json.id.trim()) {
      throw new Error("Provider WhatsApp tidak mengembalikan message ID yang valid.");
    }
    return json.id;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Interakt timeout setelah ${config.timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// --- Webhook helpers (mirror gojags normalizeInteraktStatus) ---

export type InteraktDeliveryStatus = "sent" | "delivered" | "read" | "failed";

export function normalizeInteraktStatus(raw: unknown): InteraktDeliveryStatus | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const normalized = raw.toLowerCase().replace(/[-\s]/g, "_");
  const candidates: InteraktDeliveryStatus[] = ["delivered", "read", "failed", "sent"];
  const aliases: Record<string, InteraktDeliveryStatus> = {
    queued: "sent",
    accepted: "sent",
    undelivered: "failed",
    rejected: "failed",
  };
  for (const c of [...candidates, ...Object.keys(aliases)]) {
    if (normalized === c || normalized.endsWith(`_${c}`)) {
      return (aliases[c] as InteraktDeliveryStatus) ?? (c as InteraktDeliveryStatus);
    }
  }
  return null;
}

function pickDeep(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function firstScalar(payload: unknown, paths: string[]): string | null {
  for (const p of paths) {
    const v = pickDeep(payload, p);
    if ((typeof v === "string" || typeof v === "number") && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return null;
}

export function parseInteraktWebhook(payload: Record<string, unknown>): {
  providerMessageId: string | null;
  callbackData: string | null;
  status: InteraktDeliveryStatus | null;
} {
  return {
    providerMessageId: firstScalar(payload, [
      "data.message.id",
      "message.id",
      "messageId",
      "message_id",
      "id",
    ]),
    callbackData: firstScalar(payload, [
      "data.message.callbackData",
      "data.message.callback_data",
      "message.callbackData",
      "callbackData",
      "callback_data",
    ]),
    status: normalizeInteraktStatus(
      firstScalar(payload, [
        "data.message.message_status",
        "data.message.status",
        "data.eventType",
        "message.status",
        "eventType",
        "event_type",
        "event",
        "status",
        "type",
      ])
    ),
  };
}

export async function verifyInteraktSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = process.env.INTERAKT_WEBHOOK_SECRET || "";
  if (!secret || !signatureHeader || !rawBody) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  if (expected.length !== signatureHeader.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
