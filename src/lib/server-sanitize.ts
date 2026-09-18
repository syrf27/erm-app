import sanitize from "sanitize-html";

/**
 * Server-only sanitizers for API validation. Keeping these separate avoids
 * loading jsdom in serverless functions while still parsing untrusted markup.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  return sanitize(dirty, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
}

export function sanitizeRichText(dirty: string): string {
  if (!dirty) return "";

  return sanitize(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  });
}
