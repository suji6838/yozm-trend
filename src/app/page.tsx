import Header from "@/components/Header";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyAnalysis, DailyAnalysis } from "@/lib/dailyAnalysis";

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
      <HomeClient trends={trends} analysis={analysis} />
    </div>
  );
}
