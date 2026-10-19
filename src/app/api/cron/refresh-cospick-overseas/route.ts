import { NextRequest, NextResponse } from "next/server";
import { OVERSEAS_SCORE_MAX, refreshOverseasCospickSnapshot } from "@/lib/cospickOverseas";
import { beginCronRun, getCronRuns, hasRecentOkRun } from "@/lib/cronRunLog";
import { isUsMarketOpenToday } from "@/lib/kis";
import { sendNtfy } from "@/lib/ntfy";

// 50개 안팎 고정 종목 리스트를 순차 조회(약 800ms 간격)하므로 40~80초 정도 소요될 수 있어
// 여유있게 설정. 매수 후보 스캔과 보유 종목(매도/홀딩) 체크를 같은 요청에서 함께 처리한다
// (둘 다 전일 종가 기준이라 스캔에서 받은 일별시세를 그대로 재사용).
export const maxDuration = 120;

// 본 크론(20:00)이 누락/실패한 날을 위해 1시간 뒤 백업 크론이 같은 경로를 한 번 더 호출한다.
// 최근 이 시간 안에 성공한 실행이 있으면 백업은 아무것도 하지 않고 끝난다.
const SKIP_IF_OK_WITHIN_MS = 3 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 백업 크론은 ?backup=1로 호출된다 — 본 크론과 수동 호출은 항상 실행한다.
  const isBackup = req.nextUrl.searchParams.get("backup") === "1";
  const runs = await getCronRuns("cospick-overseas");
  const finish = await beginCronRun("cospick-overseas", runs);
  if (isBackup && hasRecentOkRun(runs, SKIP_IF_OK_WITHIN_MS)) {
    await finish("skipped", "recent ok run");
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 미국 휴장일에는 직전 거래일 데이터로 같은 추천이 반복될 뿐이라 스캔도 알림도 하지 않는다
  // (보유 종목 목록도 그대로 둔다).
  if (!(await isUsMarketOpenToday())) {
    await finish("skipped", "market closed");
    return NextResponse.json({ ok: true, skipped: true, reason: "market closed" });
  }

  let snapshot;
  try {
    snapshot = await refreshOverseasCospickSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh overseas cospick snapshot:", error);
    const sent = await sendNtfy("해외 코스픽 20:00 스캔 실패", message);
    await finish("error", `${message} (ntfy ${sent ? "sent" : "failed"})`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  let buySent: boolean;
  if (snapshot.candidates.length === 0) {
    // 스코어링에 최소 점수 기준이 없어(clean+risky 보충) 후보가 0개인 건 "조건 미달"이
    // 아니라 전체 종목의 데이터 조회 자체가 실패했거나, 조회된 종목이 전부 당일 급등이라
    // 제외됐다는 뜻이다 — 둘을 구분해 알린다.
    buySent = await sendNtfy(
      "해외 코스픽 매수 추천",
      snapshot.surgeExcluded
        ? `조건 충족 종목 없음 — 현금 보유 (원인: 급등 종목 ${snapshot.surgeExcluded}개 제외)`
        : "조건 충족 종목 없음 — 현금 보유 (원인: 스캔 실패로 추정)",
    );
  } else {
    const lines = snapshot.candidates.map(
      (c) =>
        `${c.name} $${c.price.toFixed(2)} (${c.changePct >= 0 ? "+" : ""}${c.changePct}%) 점수 ${
          c.score.total
        }/${OVERSEAS_SCORE_MAX}`,
    );
    buySent = await sendNtfy("해외 코스픽 매수 추천", lines.join("\n"));
  }

  let exitSent: boolean;
  if (snapshot.exitCheck.length === 0) {
    exitSent = await sendNtfy("해외 코스픽 보유 종목 체크", "추적 중인 추천 종목이 없습니다.");
  } else {
    const lines = snapshot.exitCheck.map(
      (item) =>
        `${item.name} $${item.entryPrice.toFixed(2)}→$${item.currentPrice.toFixed(2)} (${
          item.changePct >= 0 ? "+" : ""
        }${item.changePct}%) ${item.action}`,
    );
    const sellCount = snapshot.exitCheck.filter((i) => i.sell).length;
    exitSent = await sendNtfy(
      `해외 코스픽 보유 종목 체크 (매도 ${sellCount} · 홀딩 ${snapshot.exitCheck.length - sellCount})`,
      lines.join("\n"),
    );
  }

  // 알림이 하나라도 안 나갔으면 "ok"로 남기지 않는다 — 백업 크론이 다시 시도하도록.
  const notified = buySent && exitSent;
  await finish(
    notified ? "ok" : "error",
    `candidates ${snapshot.candidates.length}, exit ${snapshot.exitCheck.length}, ntfy buy ${
      buySent ? "sent" : "failed"
    } / exit ${exitSent ? "sent" : "failed"}`,
  );

  return NextResponse.json({
    ok: true,
    notified,
    generatedAt: snapshot.generatedAt,
    scanned: snapshot.scanned,
    candidateCount: snapshot.candidates.length,
    exitCheckCount: snapshot.exitCheck.length,
  });
}
