import { NextRequest, NextResponse } from "next/server";
import { getCurrentPrice } from "@/lib/kis";
import { getAdminUser } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code") ?? "005930";
  try {
    const price = await getCurrentPrice(code);
    return NextResponse.json({ code, price });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
