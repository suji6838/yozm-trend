import { unstable_cache } from "next/cache";
import { put, get } from "@vercel/blob";
import {
  getVolumeRankUniverse,
  getIndexAboveMa20,
  getDailyChart,
  getCurrentPrice,
  KisVolumeRankItem,
} from "./kis";

// ── 1단계 스코어링 범위 ──────────────────────────────────────────────
// 원 설계는 A(추세 20)+B(거래량 20, 수급 포함)+C(당일 장중흐름 25)+D(뉴스 20)+E(시장분위기 15) = 100점.
// 이번 단계에서는 일별 시세로 계산 가능한 것만 반영:
//   A 추세(20) 전부, B 거래량 중 수급 제외 2개 항목(10/20), E 시장분위기 중 지수 20일선(5/15)
// → 1단계 만점은 35점. 수급/장중분봉/뉴스는 2단계에서 추가 예정.
const TREND_MAX = 20;
const VOLUME_MAX = 10;
const MARKET_MOOD_MAX = 5;
export const COSPICK_SCORE_MAX = TREND_MAX + VOLUME_MAX + MARKET_MOOD_MAX;

const TRADING_VALUE_MIN = 30_000_000_000; // 300억: 이 미만이면 매수금지
const TRADING_VALUE_GOOD = 100_000_000_000; // 1,000억: B 거래대금 가점 기준
const SURGE_LIMIT_PCT = 15; // 당일 +15% 이상 급등 → 감점 + 매수금지
const CRASH_LIMIT_PCT = -7; // 당일 -7% 이하 급락 → 매수금지

function sma(values: number[], period: number) {
  const slice = values.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function scoreTrend(closes: number[]) {
  const reasons: string[] = [];
  let score = 0;

  if (closes.length < 61) {
    return { score: 0, reasons: ["일별 시세 데이터 부족(60일 미만)"] };
  }

  const last = closes[closes.length - 1];
  const ma20Now = sma(closes, 20);
  const ma20FiveDaysAgo = sma(closes.slice(0, -5), 20);
  const ma60 = sma(closes, 60);
  const close5DaysAgo = closes[closes.length - 6];

  if (ma20Now > ma20FiveDaysAgo) {
    score += 5;
    reasons.push("20일선 우상향");
  }
  if (last > ma60) {
    score += 5;
    reasons.push("60일선 위");
  }
  if (last > ma20Now) {
    score += 5;
    reasons.push("종가 20일선 위");
  }

  const return5d = (last / close5DaysAgo - 1) * 100;
  if (return5d >= 3 && return5d <= 10) {
    score += 5;
    reasons.push(`최근 5일 수익률 +${return5d.toFixed(1)}%`);
  }

  return { score, reasons };
}

function scoreVolume(volumes: number[], tradingValue: number) {
  const reasons: string[] = [];
  let score = 0;

  if (volumes.length >= 21) {
    const todayVolume = volumes[volumes.length - 1];
    const avg20 = sma(volumes.slice(0, -1), 20);
    if (avg20 > 0 && todayVolume >= avg20 * 1.5) {
      score += 5;
      reasons.push("거래량 20일평균 1.5배 이상");
    }
  }

  if (tradingValue >= TRADING_VALUE_GOOD) {
    score += 5;
    reasons.push("거래대금 1,000억 이상");
  }

  return { score, reasons };
}

function scoreMarketMood(kospiAbove: boolean, kosdaqAbove: boolean) {
  const reasons: string[] = [];
  let score = 0;
  if (kospiAbove && kosdaqAbove) {
    score = 5;
    reasons.push("코스피·코스닥 모두 20일선 위");
  } else if (kospiAbove || kosdaqAbove) {
    score = 2.5;
    reasons.push(`${kospiAbove ? "코스피" : "코스닥"}만 20일선 위`);
  } else {
    reasons.push("코스피·코스닥 모두 20일선 아래");
  }
  return { score, reasons };
}

function checkExclusion(item: KisVolumeRankItem): string | null {
  if (item.changePct >= SURGE_LIMIT_PCT) {
    return `당일 +${item.changePct.toFixed(1)}% 급등 — 단기 과열`;
  }
  if (item.changePct <= CRASH_LIMIT_PCT) {
    return `당일 ${item.changePct.toFixed(1)}% 급락 — 악재 가능성`;
  }
  if (item.tradingValue < TRADING_VALUE_MIN) {
    return "거래대금 300억 미만 — 유동성 부족";
  }
  return null;
}

function formatEok(won: number) {
  return `${Math.round(won / 100_000_000).toLocaleString("ko-KR")}억`;
}

export type CospickCandidate = {
  code: string;
  name: string;
  price: number;
  changePct: number;
  tradingValueLabel: string;
  trend: number[]; // 최근 20일 종가(스파크라인용)
  score: { trend: number; volume: number; marketMood: number; total: number };
  reasons: string[];
};

export type CospickSnapshot = {
  candidates: CospickCandidate[];
  scanned: number;
  marketMood: { kospiAboveMa20: boolean; kosdaqAboveMa20: boolean };
  generatedAt: string;
};

async function evaluateCandidate(
  item: KisVolumeRankItem,
  mood: ReturnType<typeof scoreMarketMood>,
): Promise<CospickCandidate | null> {
  if (checkExclusion(item)) return null;

  const chart = await getDailyChart(item.code, 90);
  if (chart.length < 61) return null;

  const closes = chart.map((d) => d.close);
  const volumes = chart.map((d) => d.volume);

  const trend = scoreTrend(closes);
  const volume = scoreVolume(volumes, item.tradingValue);
  const total = Math.round(trend.score + volume.score + mood.score);

  return {
    code: item.code,
    name: item.name,
    price: item.price,
    changePct: item.changePct,
    tradingValueLabel: formatEok(item.tradingValue),
    trend: closes.slice(-20),
    score: { trend: trend.score, volume: volume.score, marketMood: mood.score, total },
    reasons: [...trend.reasons, ...volume.reasons, ...mood.reasons],
  };
}

async function buildCospickSnapshot(): Promise<CospickSnapshot> {
  const [universe, kospiAbove, kosdaqAbove] = await Promise.all([
    getVolumeRankUniverse(20),
    getIndexAboveMa20("0001"),
    getIndexAboveMa20("1001"),
  ]);

  const mood = scoreMarketMood(kospiAbove, kosdaqAbove);

  const evaluated = await Promise.all(
    universe.map(async (item) => {
      try {
        return await evaluateCandidate(item, mood);
      } catch (error) {
        console.error(`cospick scoring failed for ${item.code}:`, error);
        return null;
      }
    }),
  );

  const candidates = evaluated
    .filter((c): c is CospickCandidate => c !== null)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 3);

  const snapshot: CospickSnapshot = {
    candidates,
    scanned: universe.length,
    marketMood: { kospiAboveMa20: kospiAbove, kosdaqAboveMa20: kosdaqAbove },
    generatedAt: new Date().toISOString(),
  };
  await saveLastGoodSnapshot(snapshot);
  return snapshot;
}

const LAST_GOOD_PATHNAME = "cospick-snapshot-latest.json";

async function saveLastGoodSnapshot(snapshot: CospickSnapshot) {
  try {
    await put(LAST_GOOD_PATHNAME, JSON.stringify(snapshot), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("Failed to persist last-good cospick snapshot:", error);
  }
}

async function loadLastGoodSnapshot(): Promise<CospickSnapshot | null> {
  try {
    const result = await get(LAST_GOOD_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as CospickSnapshot;
  } catch (error) {
    console.error("Failed to load last-good cospick snapshot:", error);
    return null;
  }
}

async function buildCospickSnapshotWithFallback(): Promise<CospickSnapshot> {
  try {
    return await buildCospickSnapshot();
  } catch (error) {
    console.error("Failed to build cospick snapshot, falling back:", error);
    const lastGood = await loadLastGoodSnapshot();
    if (lastGood) return lastGood;
    throw error;
  }
}

export const getCospickSnapshot = unstable_cache(
  buildCospickSnapshotWithFallback,
  ["cospick-snapshot-v1"],
  { revalidate: 86400, tags: ["cospick-snapshot"] },
);

// ── 다음날 09:10 매도 체크 (전날 15시 스캔가를 매수가로 가정) ──────────
export type ExitCheckItem = {
  code: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  changePct: number;
  action: string;
};

function classifyExit(pct: number): string {
  if (pct >= 3) return "🟢 전량 익절";
  if (pct >= -1.5) return "🟡 09:10 전량 매도";
  if (pct >= -3) return "🟠 원칙적으로 손절";
  return "🔴 악재 확인 후 즉시 대응";
}

export async function checkExitStatus(): Promise<ExitCheckItem[]> {
  const snapshot = await getCospickSnapshot();
  return Promise.all(
    snapshot.candidates.map(async (candidate) => {
      const price = await getCurrentPrice(candidate.code);
      const current = Number(price.stck_prpr);
      const pct = ((current - candidate.price) / candidate.price) * 100;
      return {
        code: candidate.code,
        name: candidate.name,
        entryPrice: candidate.price,
        currentPrice: current,
        changePct: Math.round(pct * 100) / 100,
        action: classifyExit(pct),
      };
    }),
  );
}
