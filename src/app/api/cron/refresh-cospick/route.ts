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
    // 스코어링에 최소 점수 기준이 없어(clean+risky 보충) 후보가 0개인 건 "조건 미달"이
    // 아니라 전체 종목의 데이터 조회 자체가 실패했다는 뜻이다 — 정상적인 "쉬는 날"로
    // 오해하지 않도록 실패 알림으로 구분해서 보낸다.
    await sendNtfy(
      "⚠️ 코스픽 14:00 스캔 실패",
      `종목 ${snapshot.scanned}개 전체 데이터 조회 실패 — API 상태 확인 필요`,
    );
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
