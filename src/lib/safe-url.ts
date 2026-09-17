const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function isSafeAppUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const url = value.trim();
  if (!url || CONTROL_CHARACTERS.test(url) || url.includes("\\")) return false;

  if (url.startsWith("/")) {
    return !url.startsWith("//");
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSafeDocumentHref(value: unknown): string | null {
  if (!isSafeAppUrl(value)) return null;

  const url = value.trim();
  return url.startsWith("/uploads/")
    ? url.replace("/uploads/", "/api/uploads/")
    : url;
}
