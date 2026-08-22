import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCospickSnapshot } from "@/lib/cospick";

// 20개 종목 스크리닝(거래량순위 1회 + 지수 2회 + 종목별 일별차트 최대 20회)이
// 순차 호출로 걸려 20~40초 정도 소요될 수 있어 여유있게 설정.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("cospick-snapshot", { expire: 0 });
  const snapshot = await getCospickSnapshot();

  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    scanned: snapshot.scanned,
    candidateCount: snapshot.candidates.length,
  });
}
