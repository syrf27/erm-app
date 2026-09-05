import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/access-control";
import { getGojagsOfficeConfig, getGojagsOfficeHeaders, normalizeMeeting } from "@/lib/gojags-office";

export async function GET(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission("upload", "read", { ipAddress, userAgent });

    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { baseUrl } = getGojagsOfficeConfig();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || "";
    const page = searchParams.get("page") || "1";

    if (keyword.length < 2) {
      return NextResponse.json({ data: [], meta: { message: "Keyword minimal 2 karakter" } });
    }

    const upstreamUrl = new URL("/api/tr-rapat", baseUrl);
    upstreamUrl.searchParams.set("keyword", keyword);
    upstreamUrl.searchParams.set("search", keyword);
    upstreamUrl.searchParams.set("q", keyword);
    upstreamUrl.searchParams.set("page", page);

    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: getGojagsOfficeHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      return NextResponse.json(
        { error: "Gagal mengambil data rapat dari GOJAGS Office", detail: message.slice(0, 300) },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const rawMeetings = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
      ? payload
      : [];

    return NextResponse.json({
      data: rawMeetings.map(normalizeMeeting),
      pagination: {
        currentPage: payload?.current_page ?? payload?.meta?.current_page ?? null,
        lastPage: payload?.last_page ?? payload?.meta?.last_page ?? null,
        total: payload?.total ?? payload?.meta?.total ?? rawMeetings.length,
      },
    });
  } catch (error: any) {
    console.error("GOJAGS Office meeting search error:", error);

    if (error?.message === "GOJAGS_OFFICE_API_KEY_RAPAT is not configured") {
      return NextResponse.json({ error: "GOJAGS Office API key belum dikonfigurasi" }, { status: 500 });
    }

    return NextResponse.json({ error: "Gagal mencari data rapat" }, { status: 500 });
  }
}
