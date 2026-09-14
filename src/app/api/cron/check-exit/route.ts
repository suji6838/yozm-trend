import { NextRequest, NextResponse } from "next/server";
import { refreshExitCheck } from "@/lib/cospick";
import { sendNtfy } from "@/lib/ntfy";
import { kstHHmm } from "@/lib/time";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const title = `코스픽 ${kstHHmm()} 매도 체크`;

  let items;
  try {
    items = await refreshExitCheck();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Failed to refresh exit check:", error);
    await sendNtfy(`${title} 실패`, message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (items.length === 0) {
    await sendNtfy(title, "최근 추천된 종목이 없습니다.");
  } else {
    const lines = items.map(
      (i) =>
        `${i.name} ${i.entryPrice.toLocaleString("ko-KR")}→${i.currentPrice.toLocaleString(
          "ko-KR",
        )} (${i.changePct >= 0 ? "+" : ""}${i.changePct}%) ${i.action}`,
    );
    await sendNtfy(title, lines.join("\n"));
  }

  return NextResponse.json({ ok: true, items });
}
