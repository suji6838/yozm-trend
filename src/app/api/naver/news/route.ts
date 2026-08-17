import { NextRequest, NextResponse } from "next/server";
import { searchNaverNews } from "@/lib/naver";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") ?? "AI";
  try {
    const items = await searchNaverNews(query, 10);
    return NextResponse.json({ query, items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
