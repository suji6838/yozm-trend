import Header from "@/components/Header";
import HomeClient from "@/components/HomeClient";
import { TRENDS } from "@/data/trends";
import { getDailyTrends } from "@/lib/naver";

export const revalidate = 3600;

export default async function Home() {
  let trends = TRENDS;
  try {
    const liveTrends = await getDailyTrends();
    if (liveTrends.length > 0) trends = liveTrends;
  } catch (error) {
    console.error("Failed to fetch live trends, falling back to static data:", error);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <HomeClient trends={trends} />
    </div>
  );
}
