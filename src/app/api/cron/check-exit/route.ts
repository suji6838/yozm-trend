import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getExitCheck } from "@/lib/cospick";
import { sendNtfy } from "@/lib/ntfy";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("exit-check", { expire: 0 });
  const items = await getExitCheck();

  if (items.length === 0) {
    await sendNtfy("코스픽 09:10 매도 체크", "어제 추천된 종목이 없습니다.");
  } else {
    const lines = items.map(
      (i) =>
        `${i.name} ${i.entryPrice.toLocaleString("ko-KR")}→${i.currentPrice.toLocaleString(
          "ko-KR",
        )} (${i.changePct >= 0 ? "+" : ""}${i.changePct}%) ${i.action}`,
    );
    await sendNtfy("코스픽 09:10 매도 체크", lines.join("\n"));
  }

  return NextResponse.json({ ok: true, items });
}
