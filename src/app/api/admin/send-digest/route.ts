import { NextRequest, NextResponse } from "next/server";
import { runDigestSend } from "@/lib/sendDigest";
import { getAdminUser } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDigestSend();

  const redirectUrl = new URL("/admin", req.url);
  redirectUrl.searchParams.set("sent", String(result.sentCount));
  redirectUrl.searchParams.set("failed", String(result.failedCount));
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
