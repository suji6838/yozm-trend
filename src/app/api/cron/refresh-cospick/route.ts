import { NextRequest, NextResponse } from "next/server";
import { COSPICK_SCORE_MAX, refreshCospickAndExitCheck } from "@/lib/cospick";
import { beginCronRun, getCronRuns, hasRecentOkRun } from "@/lib/cronRunLog";
import { sendNtfy } from "@/lib/ntfy";
import { kstHHmm } from "@/lib/time";

// 30개 종목 스크리닝(거래량순위 2회 + 지수 2회 + 종목별 일별차트 최대 30회) +
// 추적 중인 보유 종목 체크(종목당 1회, 최대 5거래일치 누적)를 한 요청에서 800ms 간격으로
// 순차 처리하므로 여유있게 설정.
export const maxDuration = 300;

// 본 크론(09:10/14:00)이 누락/실패한 때를 위해 각각 1시간 뒤 백업 크론이 같은 경로를 한 번
// 더 호출한다. 최근 이 시간 안에 성공한 실행이 있으면 백업은 아무것도 하지 않고 끝난다.
const SKIP_IF_OK_WITHIN_MS = 3 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 백업 크론은 ?backup=1로 호출된다 — 본 크론과 수동 호출은 항상 실행한다.
  const isBackup = req.nextUrl.searchParams.get("backup") === "1";
  const runs = await getCronRuns("cospick");
  const finish = await beginCronRun("cospick", runs);
  if (isBackup && hasRecentOkRun(runs, SKIP_IF_OK_WITHIN_MS)) {
    await finish("skipped", "recent ok run");
    return NextResponse.json({ ok: true, skipped: true });
  }

  const time = kstHHmm();

  let result;
  try {
    result = await refreshCospickAndExitCheck();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh cospick snapshot:", error);
    const sent = await sendNtfy(`코스픽 ${time} 스캔 실패`, message);
    await finish("error", `${message} (ntfy ${sent ? "sent" : "failed"})`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const { snapshot, exitItems } = result;

  let buySent: boolean;
  if (snapshot.candidates.length === 0) {
    // 스코어링에 최소 점수 기준이 없어(clean+risky 보충) 후보가 0개인 건 "조건 미달"이
    // 아니라 전체 종목의 데이터 조회 자체가 실패했다는 뜻이다 — 정상적인 "쉬는 날"로
    // 오해하지 않도록 실패 알림으로 구분해서 보낸다.
    buySent = await sendNtfy(
      `코스픽 ${time} 매수 추천`,
      "조건 충족 종목 없음 — 현금 보유 (원인: 스캔 실패로 추정)",
    );
  } else {
    const lines = snapshot.candidates.map(
      (c) =>
        `[${c.market}] ${c.name} ${c.price.toLocaleString("ko-KR")}원 (${
          c.changePct >= 0 ? "+" : ""
        }${c.changePct}%) 점수 ${c.score.total}/${COSPICK_SCORE_MAX}`,
    );
    buySent = await sendNtfy(`코스픽 ${time} 매수 추천`, lines.join("\n"));
  }

  let exitSent: boolean;
  if (exitItems.length === 0) {
    exitSent = await sendNtfy(`코스픽 ${time} 보유 종목 체크`, "추적 중인 추천 종목이 없습니다.");
  } else {
    const lines = exitItems.map(
      (i) =>
        `${i.name} ${i.entryPrice.toLocaleString("ko-KR")}→${i.currentPrice.toLocaleString(
          "ko-KR",
        )} (${i.changePct >= 0 ? "+" : ""}${i.changePct}%) ${i.action}`,
    );
    const sellCount = exitItems.filter((i) => i.sell).length;
    exitSent = await sendNtfy(
      `코스픽 ${time} 보유 종목 체크 (매도 ${sellCount} · 홀딩 ${exitItems.length - sellCount})`,
      lines.join("\n"),
    );
  }

  // 알림이 하나라도 안 나갔으면 "ok"로 남기지 않는다 — 백업 크론이 다시 시도하도록.
  const notified = buySent && exitSent;
  await finish(
    notified ? "ok" : "error",
    `candidates ${snapshot.candidates.length}, exit ${exitItems.length}, ntfy buy ${
      buySent ? "sent" : "failed"
    } / exit ${exitSent ? "sent" : "failed"}`,
  );

  return NextResponse.json({
    ok: true,
    notified,
    generatedAt: snapshot.generatedAt,
    scanned: snapshot.scanned,
    candidateCount: snapshot.candidates.length,
    exitCheckCount: exitItems.length,
  });
}
