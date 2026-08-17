import { NextRequest, NextResponse } from "next/server";
import { runDigestSend } from "@/lib/sendDigest";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDigestSend();
  return NextResponse.json({ ok: true, ...result });
}
