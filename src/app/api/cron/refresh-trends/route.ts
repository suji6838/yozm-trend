import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getDailyAnalysis } from "@/lib/dailyAnalysis";
import { getInvestmentSnapshot } from "@/lib/investmentAnalysis";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("daily-analysis", { expire: 0 });
  const analysis = await getDailyAnalysis();

  let investmentError: string | null = null;
  let investmentGeneratedAt: string | null = null;
  try {
    revalidateTag("investment-snapshot", { expire: 0 });
    const snapshot = await getInvestmentSnapshot();
    investmentGeneratedAt = snapshot.generatedAt;
  } catch (error) {
    investmentError = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh investment snapshot:", error);
  }

  return NextResponse.json({
    ok: true,
    generatedAt: analysis.generatedAt,
    trendCount: analysis.trends.length,
    topTrendCount: analysis.topTrends.length,
    investmentGeneratedAt,
    investmentError,
  });
}
