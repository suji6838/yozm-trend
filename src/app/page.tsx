import { Suspense } from "react";
import Header from "@/components/Header";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyAnalysis, DailyAnalysis } from "@/lib/dailyAnalysis";

// 캐시 미스 시 네이버+데이터랩+Gemini 2회 호출이 순차적으로 걸려 20~45초까지
// 걸릴 수 있어서, Vercel 기본 실행시간 제한(약 10초)에 걸리지 않도록 연장.
export const maxDuration = 60;

export default async function Home() {
  let analysis: DailyAnalysis | null = null;
  try {
    analysis = await getDailyAnalysis();
  } catch (error) {
    console.error("Failed to build daily analysis:", error);
  }

  const trends = analysis && analysis.trends.length > 0 ? analysis.trends : TRENDS;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <Suspense>
        <HomeClient trends={trends} analysis={analysis} />
      </Suspense>
    </div>
  );
}
