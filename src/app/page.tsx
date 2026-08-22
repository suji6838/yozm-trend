import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyAnalysis, DailyAnalysis } from "@/lib/dailyAnalysis";
import { getCospickSnapshot, CospickSnapshot, getExitCheck, ExitCheckItem } from "@/lib/cospick";

// 캐시 미스 시 네이버+데이터랩+Gemini 2회 호출이 순차적으로 걸려 20~45초까지
// 걸릴 수 있어서, Vercel 기본 실행시간 제한(약 10초)에 걸리지 않도록 연장.
// 코스픽 스냅샷은 별도 cron(refresh-cospick)에서 미리 캐시를 채워두므로 보통은 즉시 반환됨.
export const maxDuration = 60;

export default async function Home() {
  let analysis: DailyAnalysis | null = null;
  try {
    analysis = await getDailyAnalysis();
  } catch (error) {
    console.error("Failed to build daily analysis:", error);
  }

  let cospick: CospickSnapshot | null = null;
  try {
    cospick = await getCospickSnapshot();
  } catch (error) {
    console.error("Failed to build cospick snapshot:", error);
  }

  let exitCheck: ExitCheckItem[] = [];
  try {
    exitCheck = await getExitCheck();
  } catch (error) {
    console.error("Failed to build exit check:", error);
  }

  const trends = analysis && analysis.trends.length > 0 ? analysis.trends : TRENDS;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <Suspense>
        <HomeClient trends={trends} analysis={analysis} cospick={cospick} exitCheck={exitCheck} />
      </Suspense>
      <Footer />
    </div>
  );
}
