import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyAnalysis, DailyAnalysis } from "@/lib/dailyAnalysis";
import { getCospickSnapshot, CospickSnapshot, getExitCheck, ExitCheckItem } from "@/lib/cospick";

// 캐시 미스 시 네이버+데이터랩+Gemini 2회 호출이 순차적으로 걸려 20~45초까지
// 걸릴 수 있어서, Vercel 기본 실행시간 제한(약 10초)에 걸리지 않도록 연장.
// 코스픽/매도체크는 각각 별도 cron이 미리 캐시를 채워두므로 보통은 즉시 반환됨.
export const maxDuration = 60;

// 이 페이지 자체를 Vercel 엣지가 통째로 캐싱하지 않도록 강제.
// (내부 데이터는 getDailyAnalysis/getCospickSnapshot/getExitCheck가 각자
// unstable_cache로 캐싱하므로, 여기서 매 요청 재실행해도 웜 상태면 빠르다.
// 반대로 페이지 자체가 캐싱되면 cron이 데이터를 갱신해도 방문자는 예전
// 응답(예: 일시적 오류로 비어버린 exitCheck)을 계속 보게 되는 문제가 있었음.)
export const dynamic = "force-dynamic";

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
