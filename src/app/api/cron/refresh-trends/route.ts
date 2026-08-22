import { NextRequest, NextResponse } from "next/server";
import { refreshDailyAnalysis } from "@/lib/dailyAnalysis";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const analysis = await refreshDailyAnalysis();
    return NextResponse.json({
      ok: true,
      generatedAt: analysis.generatedAt,
      trendCount: analysis.trends.length,
      topTrendCount: analysis.topTrends.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh daily analysis:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
