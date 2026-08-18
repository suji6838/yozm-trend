import { NextRequest, NextResponse } from "next/server";
import { getDatalabSearchTrend } from "@/lib/naver";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const keyword = req.nextUrl.searchParams.get("keyword") ?? "AI";

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  try {
    const result = await getDatalabSearchTrend({
      startDate: formatDate(start),
      endDate: formatDate(end),
      timeUnit: "date",
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
