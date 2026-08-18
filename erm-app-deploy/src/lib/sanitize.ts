import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS
 * Only allows safe text content, strips all HTML tags and attributes
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content of removed tags
  });
}

/**
 * Sanitize text for safe display in HTML context
 * Escapes HTML special characters
 */
export function escapeHtml(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&": "&",
    "<": "<",
    ">": ">",
    '"': '"',
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitize text for safe display - allows only safe formatting
 * Use this for content that might have basic formatting like line breaks
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ["br", "p"], // Only allow basic formatting
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize object properties recursively
 * Useful for sanitizing entire API response objects before rendering
 */
export function sanitizeObject(
  obj: Record<string, any>,
  fieldsToSanitize: string[]
): Record<string, any> {
  const sanitized = { ...obj };
  for (const field of fieldsToSanitize) {
    if (sanitized[field] && typeof sanitized[field] === "string") {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  }
  return sanitized;
}

// Fields that commonly contain user input and need sanitization
export const RISK_FIELDS_TO_SANITIZE = [
  "risiko",
  "penyebab",
  "dampak",
  "pengendalianUraian",
  "responRisiko",
  "rencanaTidakPenanganan",
  "targetOutput",
  "dokumenPendukung",
] as const;

export function sanitizeRiskData(risk: Record<string, any>): Record<string, any> {
  return sanitizeObject(risk, [...RISK_FIELDS_TO_SANITIZE]);
}