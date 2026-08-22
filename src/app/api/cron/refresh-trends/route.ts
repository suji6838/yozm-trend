import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getDailyAnalysis } from "@/lib/dailyAnalysis";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("daily-analysis", { expire: 0 });
  const analysis = await getDailyAnalysis();

  return NextResponse.json({
    ok: true,
    generatedAt: analysis.generatedAt,
    trendCount: analysis.trends.length,
    topTrendCount: analysis.topTrends.length,
  });
}
