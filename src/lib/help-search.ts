import { sanitizeHtml } from "@/lib/sanitize";

export interface HelpFaq {
  id: number;
  question: string;
  answer: string;
  order: number;
}

export interface HelpSearchResult {
  faq: HelpFaq;
  score: number;
}

const STOPWORDS = new Set([
  "aku",
  "anda",
  "atau",
  "bagaimana",
  "bisa",
  "cara",
  "dan",
  "di",
  "dong",
  "gimana",
  "itu",
  "ini",
  "kan",
  "ke",
  "kok",
  "mau",
  "nya",
  "pada",
  "saya",
  "supaya",
  "untuk",
  "yang",
]);

const SYNONYMS: Record<string, string[]> = {
  akses: ["permission", "role", "hak", "izin"],
  ambil: ["import", "tarik", "masukkan"],
  bukti: ["evidence", "dokumen", "lampiran", "pendukung"],
  dokumen: ["berkas", "file", "pdf"],
  hapus: ["delete", "buang"],
  isi: ["input", "mengisi", "memasukkan", "tambah"],
  kolom: ["cell", "sel"],
  laporan: ["export", "unduh", "download"],
  login: ["masuk", "sso"],
  rapat: ["meeting", "presensi", "daftar", "hadir"],
  risiko: ["risk", "resiko"],
  simpan: ["save"],
  terkunci: ["locked", "disabled", "tidak", "gak", "nggak"],
  upload: ["unggah", "lampirkan"],
};

const PAGE_CONTEXTS = [
  {
    path: "/manajemen-risiko/penetapan-konteks",
    terms: ["penetapan", "konteks", "sasaran", "peraturan", "master"],
  },
  {
    path: "/manajemen-risiko/identifikasi",
    terms: ["identifikasi", "risiko", "sasaran", "kegiatan", "kolom", "terkunci"],
  },
  {
    path: "/manajemen-risiko/analisis",
    terms: ["analisis", "risiko", "kemungkinan", "dampak", "pengendalian"],
  },
  {
    path: "/manajemen-risiko/evaluasi",
    terms: ["evaluasi", "respon", "prioritas", "residual"],
  },
  {
    path: "/manajemen-risiko/rencana",
    terms: ["rencana", "penanganan", "mitigasi", "rtp", "residual"],
  },
  {
    path: "/pemantauan-risiko",
    terms: ["pemantauan", "realisasi", "bukti", "upload", "rapat", "presensi"],
  },
  {
    path: "/pelaporan-risiko",
    terms: ["pelaporan", "laporan", "export", "unduh", "approval"],
  },
  {
    path: "/bank-risiko",
    terms: ["bank", "risiko", "pencarian", "semantik"],
  },
  {
    path: "/repositori",
    terms: ["repositori", "dokumen", "resume", "ringkas", "download"],
  },
  {
    path: "/notification-center",
    terms: ["notifikasi", "pengingat", "reminder"],
  },
  {
    path: "/users",
    terms: ["pengguna", "user", "akses"],
  },
  {
    path: "/roles",
    terms: ["role", "permission", "akses"],
  },
  {
    path: "/faq",
    terms: ["faq", "bantuan", "panduan"],
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toReadableText(value: string) {
  const withBreaks = value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n")
    .replace(/<\s*\/li\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ");

  return sanitizeHtml(withBreaks)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenize(value: string) {
  const normalized = normalizeText(value);
  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [canonical, variants] of Object.entries(SYNONYMS)) {
      if (token === canonical || variants.includes(token)) {
        expanded.add(canonical);
        variants.forEach((variant) => expanded.add(variant));
      }
    }
  }

  return Array.from(expanded);
}

function getPageTerms(pathname?: string) {
  if (!pathname) return [];
  return PAGE_CONTEXTS.find((context) => pathname.startsWith(context.path))?.terms ?? [];
}

function scoreFaq(faq: HelpFaq, query: string, pathname?: string) {
  const question = normalizeText(faq.question);
  const answer = normalizeText(faq.answer);
  const searchable = `${question} ${answer}`;
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);
  const pageTerms = getPageTerms(pathname);

  let score = 0;

  if (question.includes(normalizedQuery)) score += 18;
  if (answer.includes(normalizedQuery)) score += 8;

  for (const token of queryTokens) {
    if (question.includes(token)) score += 6;
    if (answer.includes(token)) score += 2;
    if (searchable.split(" ").some((word) => isCloseToken(token, word))) score += 1;
  }

  for (const term of pageTerms) {
    if (question.includes(term)) score += 2;
    if (answer.includes(term)) score += 1;
  }

  return score;
}

function isCloseToken(a: string, b: string) {
  if (a === b || a.length < 4 || b.length < 4) return false;
  if (a.includes(b) || b.includes(a)) return true;
  return levenshtein(a, b) <= 1;
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0))
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function searchHelpFaqs(faqs: HelpFaq[], query: string, pathname?: string) {
  return faqs
    .map((faq) => ({ faq, score: scoreFaq(faq, query, pathname) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.faq.order - b.faq.order || a.faq.id - b.faq.id);
}

export function createConversationalHelpAnswer(result: HelpSearchResult) {
  const answer = toReadableText(result.faq.answer);
  if (!answer) {
    return "Saya menemukan topik yang mirip, tapi jawabannya belum tersedia di FAQ. Coba cek halaman FAQ atau hubungi admin aplikasi ya.";
  }

  return answer;
}

export function getHelpSuggestions(faqs: HelpFaq[], pathname?: string, limit = 4) {
  const pageTerms = getPageTerms(pathname);
  const scored = faqs
    .map((faq) => ({
      faq,
      score: pageTerms.reduce((total, term) => {
        const text = normalizeText(`${faq.question} ${faq.answer}`);
        return total + (text.includes(term) ? 1 : 0);
      }, 0),
    }))
    .sort((a, b) => b.score - a.score || a.faq.order - b.faq.order || a.faq.id - b.faq.id);

  return scored.slice(0, limit).map(({ faq }) => toReadableText(faq.question));
}
