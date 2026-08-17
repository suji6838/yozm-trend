import { NextRequest, NextResponse } from "next/server";
import { runDigestSend } from "@/lib/sendDigest";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const key = formData.get("key");

  if (!key || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDigestSend();

  const redirectUrl = new URL("/admin", req.url);
  redirectUrl.searchParams.set("key", String(key));
  redirectUrl.searchParams.set("sent", String(result.sentCount));
  redirectUrl.searchParams.set("failed", String(result.failedCount));
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
