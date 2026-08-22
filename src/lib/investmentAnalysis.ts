import { unstable_cache } from "next/cache";
import { put, list } from "@vercel/blob";
import { STOCK_UNIVERSE, StockMeta, StockPick, EXAMPLE_INVESTMENT_STATS, InvestmentStats } from "@/data/investment";
import { getCurrentPrice, getDailyChart } from "./kis";

function formatVolumeLabel(volume: number) {
  return `${Math.round(volume / 1000).toLocaleString("ko-KR")}천`;
}

// 20일 전 대비 종가 변화율을 0~100 점수로 환산 (실전략 아님, 단순 모멘텀 지표)
function momentumScore(closes: number[]) {
  if (closes.length < 2) return 50;
  const first = closes[0];
  const last = closes[closes.length - 1];
  const raw = 50 + ((last - first) / first) * 500;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

async function buildStockPick(meta: StockMeta): Promise<StockPick> {
  const [price, chart] = await Promise.all([
    getCurrentPrice(meta.code),
    getDailyChart(meta.code, 20),
  ]);
  const closes = chart.map((d) => d.close);
  const trend = closes.length > 0 ? closes : [Number(price.stck_prpr)];

  return {
    code: meta.code,
    name: meta.name,
    sector: meta.sector,
    score: momentumScore(trend),
    trend,
    volumeLabel: formatVolumeLabel(Number(price.acml_vol)),
    price: Number(price.stck_prpr),
    changePct: Number(price.prdy_ctrt),
  };
}

export type InvestmentSnapshot = {
  stats: InvestmentStats;
  picks: StockPick[];
  generatedAt: string;
};

// Gemini 분석과 동일하게, KIS 호출이 실패해도 사이트가 비어 보이지 않도록
// 마지막으로 성공한 스냅샷을 Vercel Blob에 저장해뒀다가 재사용한다.
const LAST_GOOD_PATHNAME = "investment-snapshot-latest.json";

async function saveLastGoodSnapshot(snapshot: InvestmentSnapshot) {
  try {
    await put(LAST_GOOD_PATHNAME, JSON.stringify(snapshot), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("Failed to persist last-good investment snapshot:", error);
  }
}

async function loadLastGoodSnapshot(): Promise<InvestmentSnapshot | null> {
  try {
    const { blobs } = await list({ prefix: LAST_GOOD_PATHNAME, limit: 1 });
    const blob = blobs[0];
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as InvestmentSnapshot;
  } catch (error) {
    console.error("Failed to load last-good investment snapshot:", error);
    return null;
  }
}

async function buildInvestmentSnapshot(): Promise<InvestmentSnapshot> {
  try {
    const picks = await Promise.all(STOCK_UNIVERSE.map(buildStockPick));
    picks.sort((a, b) => b.score - a.score);

    const snapshot: InvestmentSnapshot = {
      stats: EXAMPLE_INVESTMENT_STATS,
      picks,
      generatedAt: new Date().toISOString(),
    };
    await saveLastGoodSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    console.error("Failed to build investment snapshot, falling back:", error);
    const lastGood = await loadLastGoodSnapshot();
    if (lastGood) return lastGood;
    throw error;
  }
}

export const getInvestmentSnapshot = unstable_cache(
  buildInvestmentSnapshot,
  ["investment-snapshot-v1"],
  { revalidate: 259200, tags: ["investment-snapshot"] },
);
