import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  createConversationalHelpAnswer,
  getHelpSuggestions,
  searchHelpFaqs,
} from "@/lib/help-search";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserEmail() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth");
  if (!auth?.value) return null;

  try {
    const parsed = JSON.parse(auth.value);
    return typeof parsed.email === "string" ? parsed.email : null;
  } catch {
    return null;
  }
}

async function getFaqs() {
  return prisma.faq.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      order: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const email = await getAuthenticatedUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pathname = searchParams.get("path") ?? undefined;
    const faqs = await getFaqs();

    return NextResponse.json({
      suggestions: getHelpSuggestions(faqs, pathname),
    });
  } catch (error) {
    console.error("help-chat GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const email = await getAuthenticatedUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const pathname = typeof body.path === "string" ? body.path : undefined;

    if (!message) {
      return NextResponse.json(
        { error: "Pertanyaan belum diisi." },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Pertanyaan terlalu panjang. Ringkas menjadi maksimal 500 karakter." },
        { status: 400 }
      );
    }

    const faqs = await getFaqs();
    if (faqs.length === 0) {
      return NextResponse.json({
        answer:
          "FAQ aplikasi belum tersedia, jadi saya belum punya panduan yang bisa dijadikan acuan. Admin bisa menambahkan panduan dari menu FAQ.",
        confidence: "none",
        suggestions: [],
      });
    }

    const results = searchHelpFaqs(faqs, message, pathname);
    const best = results[0];
    const suggestions = getHelpSuggestions(faqs, pathname);

    if (!best || best.score < 4) {
      return NextResponse.json({
        answer:
          "Saya belum menemukan panduan yang benar-benar cocok dari FAQ. Mungkin yang kamu maksud salah satu topik di bawah ini?",
        confidence: "low",
        suggestions,
      });
    }

    return NextResponse.json({
      answer: createConversationalHelpAnswer(best),
      confidence: best.score >= 12 ? "high" : "medium",
      matchedFaq: {
        id: best.faq.id,
        question: best.faq.question,
      },
      suggestions: results
        .slice(1, 4)
        .map((result) => sanitizeHtml(result.faq.question).trim())
        .filter(Boolean),
    });
  } catch (error) {
    console.error("help-chat POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
