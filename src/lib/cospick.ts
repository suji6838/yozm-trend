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
const SURGE_LIMIT_PCT = 15; // 당일 +15% 이상 급등 → 매수금지
const CRASH_LIMIT_PCT = -7; // 당일 -7% 이하 급락 → 매수금지

// 통화 무관 순수 함수라 해외판(cospickOverseas.ts)에서도 그대로 재사용한다.
export function sma(values: number[], period: number) {
  const slice = values.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function scoreTrend(closes: number[]) {
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
  caution?: string; // 급등락/유동성 부족 등으로 원래는 제외 대상이었지만 후보 부족으로 보충된 경우 사유
};

export type CospickSnapshot = {
  candidates: CospickCandidate[];
  scanned: number;
  marketMood: { kospiAboveMa20: boolean; kosdaqAboveMa20: boolean };
  generatedAt: string;
};

// 급등락/유동성 부족 종목도 차트 데이터가 있으면 점수까지 계산해 반환한다(null은 데이터
// 조회 자체가 실패한 경우만). 최종 후보가 3개 미만이면 이런 종목을 caution과 함께 보충한다 —
// 변동성 큰 날 거래대금 상위 종목이 전부 제외돼 매수 후보가 0개로 나오던 문제의 수정.
async function evaluateCandidate(
  item: KisVolumeRankItem,
  mood: ReturnType<typeof scoreMarketMood>,
): Promise<CospickCandidate | null> {
  const chart = await getDailyChart(item.code, 90);
  if (chart.length < 61) return null;

  const closes = chart.map((d) => d.close);
  const volumes = chart.map((d) => d.volume);

  const trend = scoreTrend(closes);
  const volume = scoreVolume(volumes, item.tradingValue);
  const total = Math.round(trend.score + volume.score + mood.score);

  const exclusionReason = checkExclusion(item);
  const reasons = [...trend.reasons, ...volume.reasons, ...mood.reasons];
  if (exclusionReason) reasons.unshift(`⚠️ ${exclusionReason} — 주의 종목`);

  return {
    code: item.code,
    name: item.name,
    price: item.price,
    changePct: item.changePct,
    tradingValueLabel: formatEok(item.tradingValue),
    trend: closes.slice(-20),
    score: { trend: trend.score, volume: volume.score, marketMood: mood.score, total },
    reasons,
    caution: exclusionReason ?? undefined,
  };
}

async function buildCospickSnapshot(): Promise<CospickSnapshot> {
  const [universe, kospiAbove, kosdaqAbove] = await Promise.all([
    getVolumeRankUniverse(30),
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

  const results = evaluated.filter((c): c is CospickCandidate => c !== null);
  const clean = results.filter((c) => !c.caution).sort((a, b) => b.score.total - a.score.total);
  const risky = results.filter((c) => c.caution).sort((a, b) => b.score.total - a.score.total);
  const candidates = [...clean, ...risky].slice(0, 3);

  return {
    candidates,
    scanned: universe.length,
    marketMood: { kospiAboveMa20: kospiAbove, kosdaqAboveMa20: kosdaqAbove },
    generatedAt: new Date().toISOString(),
  };
}

const SNAPSHOT_PATHNAME = "cospick-snapshot-latest.json";

async function saveSnapshot(snapshot: CospickSnapshot) {
  await put(SNAPSHOT_PATHNAME, JSON.stringify(snapshot), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// 방문자용 — KIS를 직접 부르지 않고 cron이 미리 저장해둔 Blob만 읽는다.
// (unstable_cache는 이 배포 환경에서 요청 간 재사용이 안 돼 매번 KIS를 다시 호출하는
// 문제가 있어 걷어냄 — Blob 직접 읽기로 대체)
export async function getCospickSnapshot(): Promise<CospickSnapshot | null> {
  try {
    const result = await get(SNAPSHOT_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as CospickSnapshot;
  } catch (error) {
    console.error("Failed to load cospick snapshot:", error);
    return null;
  }
}

// cron 전용 — 실제로 KIS를 호출해 새로 스캔하고 Blob에 저장한다.
// 실패 시 기존에 저장돼 있던 마지막 성공 스냅샷을 그대로 유지(덮어쓰지 않음).
export async function refreshCospickSnapshot(): Promise<CospickSnapshot> {
  const snapshot = await buildCospickSnapshot();
  await saveSnapshot(snapshot);
  return snapshot;
}

// ── 다음날 09:10 매도 체크 (전날 14시 30분 스캔가를 매수가로 가정) ──────────
export type ExitCheckItem = {
  code: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  changePct: number;
  action: string;
};

export function classifyExit(pct: number): string {
  if (pct >= 3) return "🟢 전량 익절";
  if (pct >= -1.5) return "🟡 09:10 전량 매도";
  if (pct >= -3) return "🟠 원칙적으로 손절";
  return "🔴 악재 확인 후 즉시 대응";
}

async function buildExitCheck(snapshot: CospickSnapshot): Promise<ExitCheckItem[]> {
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

const EXIT_CHECK_PATHNAME = "exit-check-latest.json";

async function saveExitCheck(items: ExitCheckItem[]) {
  await put(EXIT_CHECK_PATHNAME, JSON.stringify(items), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// 방문자용 — Blob만 읽는다.
export async function getExitCheck(): Promise<ExitCheckItem[]> {
  try {
    const result = await get(EXIT_CHECK_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as ExitCheckItem[];
  } catch (error) {
    console.error("Failed to load exit check:", error);
    return [];
  }
}

// cron 전용 — 저장된 코스픽 스냅샷 기준으로 현재가를 새로 조회해 Blob에 저장한다.
export async function refreshExitCheck(): Promise<ExitCheckItem[]> {
  const snapshot = await getCospickSnapshot();
  const items = snapshot ? await buildExitCheck(snapshot) : [];
  await saveExitCheck(items);
  return items;
}
