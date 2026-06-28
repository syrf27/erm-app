import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit-log";

import { checkPermission } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  const isAllowed = await checkPermission("audit-logs", "read");
  if (!isAllowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const result = await getAuditLogs({
      userId,
      action,
      resource,
      startDate,
      endDate,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
