import { NextRequest, NextResponse } from "next/server";
import { COSPICK_SCORE_MAX, refreshCospickSnapshot } from "@/lib/cospick";
import { sendNtfy } from "@/lib/ntfy";

// 30개 종목 스크리닝(거래량순위 1회 + 지수 2회 + 종목별 일별차트 최대 30회)이
// 순차 호출로 걸려 30~60초 정도 소요될 수 있어 여유있게 설정.
export const maxDuration = 90;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let snapshot;
  try {
    snapshot = await refreshCospickSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh cospick snapshot:", error);
    await sendNtfy("코스픽 14:00 매수 추천 실패", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (snapshot.candidates.length === 0) {
    await sendNtfy("코스픽 14:00 매수 추천", "조건 충족 종목 없음 — 현금 보유");
  } else {
    const lines = snapshot.candidates.map(
      (c) =>
        `${c.name} ${c.price.toLocaleString("ko-KR")}원 (${
          c.changePct >= 0 ? "+" : ""
        }${c.changePct}%) 점수 ${c.score.total}/${COSPICK_SCORE_MAX}`,
    );
    await sendNtfy("코스픽 14:00 매수 추천", lines.join("\n"));
  }

  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    scanned: snapshot.scanned,
    candidateCount: snapshot.candidates.length,
  });
}
