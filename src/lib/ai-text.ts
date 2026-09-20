import { sanitizeHtml } from "@/lib/server-sanitize";

export function safePlainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}
