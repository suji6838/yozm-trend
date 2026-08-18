import Header from "@/components/Header";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyTrends } from "@/lib/naver";
import { getDailyAnalysis, DailyAnalysis } from "@/lib/dailyAnalysis";

export const revalidate = 3600;

export default async function Home() {
  let trends = TRENDS;
  try {
    const liveTrends = await getDailyTrends();
    if (liveTrends.length > 0) trends = liveTrends;
  } catch (error) {
    console.error("Failed to fetch live trends, falling back to static data:", error);
  }

  let analysis: DailyAnalysis | null = null;
  try {
    analysis = await getDailyAnalysis();
  } catch (error) {
    console.error("Failed to build daily analysis:", error);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <HomeClient trends={trends} analysis={analysis} />
    </div>
  );
}
