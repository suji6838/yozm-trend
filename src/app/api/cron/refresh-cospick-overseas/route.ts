import { NextRequest, NextResponse } from "next/server";
import { OVERSEAS_SCORE_MAX, refreshOverseasCospickSnapshot } from "@/lib/cospickOverseas";
import { sendNtfy } from "@/lib/ntfy";

// 50개 안팎 고정 종목 리스트를 순차 조회(약 800ms 간격)하므로 40~80초 정도 소요될 수 있어
// 여유있게 설정. 매수 후보 스캔과 매도 체크를 같은 요청에서 함께 처리한다(둘 다 전일 종가
// 기준이라 국내처럼 별도 크론이 필요 없음).
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let snapshot;
  try {
    snapshot = await refreshOverseasCospickSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh overseas cospick snapshot:", error);
    await sendNtfy("해외 코스픽 20:00 스캔 실패", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (snapshot.candidates.length === 0) {
    // 스코어링에 최소 점수 기준이 없어(clean+risky 보충) 후보가 0개인 건 "조건 미달"이
    // 아니라 전체 종목의 데이터 조회 자체가 실패했다는 뜻이다 — 정상적인 "쉬는 날"로
    // 오해하지 않도록 실패 알림으로 구분해서 보낸다.
    await sendNtfy("해외 코스픽 매수 추천", "조건 충족 종목 없음 — 현금 보유 (원인: 스캔 실패로 추정)");
  } else {
    const lines = snapshot.candidates.map(
      (c) =>
        `${c.name} $${c.price.toFixed(2)} (${c.changePct >= 0 ? "+" : ""}${c.changePct}%) 점수 ${
          c.score.total
        }/${OVERSEAS_SCORE_MAX}`,
    );
    await sendNtfy("해외 코스픽 매수 추천", lines.join("\n"));
  }

  if (snapshot.exitCheck.length === 0) {
    await sendNtfy("해외 코스픽 매도 체크", "어제 추천된 종목이 없습니다.");
  } else {
    const lines = snapshot.exitCheck.map(
      (item) =>
        `${item.name} $${item.entryPrice.toFixed(2)}→$${item.currentPrice.toFixed(2)} (${
          item.changePct >= 0 ? "+" : ""
        }${item.changePct}%) ${item.action}`,
    );
    await sendNtfy("해외 코스픽 매도 체크", lines.join("\n"));
  }

  return NextResponse.json({
    ok: true,
    generatedAt: snapshot.generatedAt,
    scanned: snapshot.scanned,
    candidateCount: snapshot.candidates.length,
    exitCheckCount: snapshot.exitCheck.length,
  });
}
