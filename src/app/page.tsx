import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyAnalysis, DailyAnalysis } from "@/lib/dailyAnalysis";
import {
  getCospickSnapshot,
  CospickSnapshot,
  getExitCheck,
  ExitCheckItem,
  getCospickHistory,
  CospickHistoryEntry,
} from "@/lib/cospick";
import {
  getOverseasCospickSnapshot,
  OverseasCospickSnapshot,
  getOverseasCospickHistory,
  OverseasCospickHistoryEntry,
} from "@/lib/cospickOverseas";
import { getAdminUser } from "@/lib/adminAuth";

// getDailyAnalysis/getCospickSnapshot/getExitCheck는 각자 cron이 미리 채워둔
// Vercel Blob만 읽기 때문에(네이버/Gemini/KIS를 직접 호출하지 않음) 항상 빠르다.
// 여유를 위해 넉넉하게 설정.
export const maxDuration = 30;

// 이 페이지 자체를 Vercel 엣지가 통째로 캐싱하지 않도록 강제.
// (페이지가 캐싱되면 cron이 Blob 데이터를 갱신해도 방문자는 예전 응답을
// 계속 받게 되는 문제가 있었음 — 위 세 함수는 Blob을 매번 새로 읽으므로
// dynamic으로 강제해도 느려지지 않는다.)
export const dynamic = "force-dynamic";

export default async function Home() {
  let analysis: DailyAnalysis | null = null;
  try {
    analysis = await getDailyAnalysis();
  } catch (error) {
    console.error("Failed to build daily analysis:", error);
  }

  // 코스픽(매수/매도 추천 종목)은 아직 나만 보는 개인 트래킹용이라 관리자 계정에만
  // 노출한다 — 데이터 자체를 관리자가 아니면 서버에서부터 아예 안 가져온다(HTML에도 안 실림).
  const admin = await getAdminUser();
  const isAdmin = admin !== null;

  let cospick: CospickSnapshot | null = null;
  let exitCheck: ExitCheckItem[] = [];
  let overseasCospick: OverseasCospickSnapshot | null = null;
  let cospickHistory: CospickHistoryEntry[] = [];
  let overseasCospickHistory: OverseasCospickHistoryEntry[] = [];
  if (isAdmin) {
    try {
      cospick = await getCospickSnapshot();
    } catch (error) {
      console.error("Failed to build cospick snapshot:", error);
    }

    try {
      exitCheck = await getExitCheck();
    } catch (error) {
      console.error("Failed to build exit check:", error);
    }

    try {
      overseasCospick = await getOverseasCospickSnapshot();
    } catch (error) {
      console.error("Failed to build overseas cospick snapshot:", error);
    }

    try {
      cospickHistory = await getCospickHistory();
    } catch (error) {
      console.error("Failed to load cospick history:", error);
    }

    try {
      overseasCospickHistory = await getOverseasCospickHistory();
    } catch (error) {
      console.error("Failed to load overseas cospick history:", error);
    }
  }

  const trends = analysis && analysis.trends.length > 0 ? analysis.trends : TRENDS;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <Suspense>
        <HomeClient
          trends={trends}
          analysis={analysis}
          cospick={cospick}
          exitCheck={exitCheck}
          overseasCospick={overseasCospick}
          cospickHistory={cospickHistory}
          overseasCospickHistory={overseasCospickHistory}
          isAdmin={isAdmin}
        />
      </Suspense>
      <Footer />
    </div>
  );
}
