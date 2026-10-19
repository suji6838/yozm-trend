import { put, get } from "@vercel/blob";
import {
  getVolumeRankUniverse,
  getIndexAboveMa20,
  getDailyChart,
  getDailyChartWithPrice,
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
// 당일 +5% 이상 급등 → 매수금지. 원래 +15%였으나 거래대금 상위 유니버스 특성상 당일 +6~14%
// 오른 종목이 계속 추천돼 고점 추격 매수가 되던 문제로 낮춤(해외판도 같은 값 사용).
export const SURGE_LIMIT_PCT = 5;
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
  market: "코스피" | "코스닥";
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
  surgeExcluded?: number; // 당일 급등으로 후보에서 뺀 종목 수(이 필드 도입 전 스냅샷엔 없음)
  marketMood: { kospiAboveMa20: boolean; kosdaqAboveMa20: boolean };
  generatedAt: string;
};

// 급등락/유동성 부족 종목도 차트 데이터가 있으면 점수까지 계산해 반환한다(null은 데이터
// 조회 자체가 실패한 경우만). 최종 후보가 3개 미만이면 이런 종목을 caution과 함께 보충한다 —
// 변동성 큰 날 거래대금 상위 종목이 전부 제외돼 매수 후보가 0개로 나오던 문제의 수정.
async function evaluateCandidate(
  item: KisVolumeRankItem,
  market: "코스피" | "코스닥",
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
    market,
    price: item.price,
    changePct: item.changePct,
    tradingValueLabel: formatEok(item.tradingValue),
    trend: closes.slice(-20),
    score: { trend: trend.score, volume: volume.score, marketMood: mood.score, total },
    reasons,
    caution: exclusionReason ?? undefined,
  };
}

// 시장별로 거래대금 상위 종목을 스크리닝해 상위 3개(부족하면 주의 종목으로 보충)를 뽑는다.
// 단, 당일 급등 종목은 보충에도 쓰지 않는다 — 고점 추격 매수를 막기 위해 후보가 3개
// 미만이 되더라도 아예 뺀다. surgeExcluded는 그렇게 빠진 종목 수.
async function pickMarketCandidates(
  universe: KisVolumeRankItem[],
  market: "코스피" | "코스닥",
  mood: ReturnType<typeof scoreMarketMood>,
): Promise<{ picks: CospickCandidate[]; surgeExcluded: number }> {
  const evaluated = await Promise.all(
    universe.map(async (item) => {
      try {
        return await evaluateCandidate(item, market, mood);
      } catch (error) {
        console.error(`cospick scoring failed for ${item.code}:`, error);
        return null;
      }
    }),
  );

  const scored = evaluated.filter((c): c is CospickCandidate => c !== null);
  const results = scored.filter((c) => c.changePct < SURGE_LIMIT_PCT);
  const clean = results.filter((c) => !c.caution).sort((a, b) => b.score.total - a.score.total);
  const risky = results.filter((c) => c.caution).sort((a, b) => b.score.total - a.score.total);
  return {
    picks: [...clean, ...risky].slice(0, 3),
    surgeExcluded: scored.length - results.length,
  };
}

// 코스피/코스닥을 각각 스캔해 3개씩(총 최대 6개) 후보를 뽑는다 — 통합 순위로 뽑으면
// 거래대금이 큰 코스피가 코스닥 종목을 밀어내던 문제의 수정.
async function buildCospickSnapshot(): Promise<CospickSnapshot> {
  const [kospiUniverse, kosdaqUniverse, kospiAbove, kosdaqAbove] = await Promise.all([
    getVolumeRankUniverse(15, "0001"),
    getVolumeRankUniverse(15, "1001"),
    getIndexAboveMa20("0001"),
    getIndexAboveMa20("1001"),
  ]);

  const mood = scoreMarketMood(kospiAbove, kosdaqAbove);

  const [kospi, kosdaq] = await Promise.all([
    pickMarketCandidates(kospiUniverse, "코스피", mood),
    pickMarketCandidates(kosdaqUniverse, "코스닥", mood),
  ]);

  return {
    candidates: [...kospi.picks, ...kosdaq.picks],
    scanned: kospiUniverse.length + kosdaqUniverse.length,
    surgeExcluded: kospi.surgeExcluded + kosdaq.surgeExcluded,
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
async function refreshCospickSnapshot(): Promise<CospickSnapshot> {
  const snapshot = await buildCospickSnapshot();
  await saveSnapshot(snapshot);
  await appendCospickHistory(snapshot);
  return snapshot;
}

// ── 1주일 기록용 히스토리 (14시 30분 스캔 결과를 날짜별로 최대 7일 보관) ──────
export type CospickHistoryEntry = {
  date: string; // YYYY-MM-DD (한국시간 기준)
  generatedAt: string;
  candidates: { code: string; name: string; price: number; changePct: number; score: number }[];
};

const HISTORY_PATHNAME = "cospick-history.json";
const HISTORY_DAYS = 7;

function toKstDateKey(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

async function getCospickHistoryRaw(): Promise<CospickHistoryEntry[]> {
  try {
    const result = await get(HISTORY_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as CospickHistoryEntry[];
  } catch (error) {
    console.error("Failed to load cospick history:", error);
    return [];
  }
}

// 같은 날짜에 여러 번 실행돼도(재배포 등) 그날 기록은 마지막 결과로 덮어쓴다.
// 배포 직후 1회성 백필 스크립트에서도 재사용할 수 있도록 export.
export async function appendCospickHistory(snapshot: CospickSnapshot) {
  const existing = await getCospickHistoryRaw();
  const date = toKstDateKey(snapshot.generatedAt);
  const entry: CospickHistoryEntry = {
    date,
    generatedAt: snapshot.generatedAt,
    candidates: snapshot.candidates.map((c) => ({
      code: c.code,
      name: c.name,
      price: c.price,
      changePct: c.changePct,
      score: c.score.total,
    })),
  };
  const updated = [...existing.filter((e) => e.date !== date), entry]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, HISTORY_DAYS);
  await put(HISTORY_PATHNAME, JSON.stringify(updated), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// 방문자용 — Blob만 읽는다.
export async function getCospickHistory(): Promise<CospickHistoryEntry[]> {
  return getCospickHistoryRaw();
}

// ── 보유 종목 추적 (추천 종목을 매도 신호가 날 때까지 매번 매도/홀딩으로 판정) ──
// 매수 후보는 스캔할 때마다 바뀌므로, 한 번 추천된 종목은 별도 목록(positions)에 담아두고
// 이후 매 실행마다 다시 평가한다. 기준은 추세: 현재가가 20일선 위면 홀딩, 이탈하면 매도.
// 매도 신호 없이 MAX_HOLD_DAYS 거래일이 지나면 기간 만료로 매도 처리해 목록에서 뺀다.
// 추천가 대비 수익률이 TAKE_PROFIT_PCT 이상이면 익절, STOP_LOSS_PCT 이하이면 손절이 추세보다 우선.
export const MAX_HOLD_DAYS = 5;
export const TAKE_PROFIT_PCT = 5;
export const STOP_LOSS_PCT = -3;

export type ExitCheckItem = {
  code: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  changePct: number;
  action: string;
  sell: boolean;
  heldDays: number; // 최초 추천 이후 지난 거래일 수
};

// 통화 무관 순수 함수라 해외판(cospickOverseas.ts)에서도 그대로 재사용한다.
export function classifyHolding(price: number, entryPrice: number, ma20: number, heldDays: number) {
  const pct = ((price - entryPrice) / entryPrice) * 100;
  if (pct >= TAKE_PROFIT_PCT) return { sell: true, action: `💰 익절 (+${TAKE_PROFIT_PCT}% 도달)` };
  if (pct <= STOP_LOSS_PCT) return { sell: true, action: `🛑 손절 (${STOP_LOSS_PCT}% 이탈)` };
  if (price < ma20) return { sell: true, action: "🔴 매도 (20일선 이탈)" };
  if (heldDays >= MAX_HOLD_DAYS) {
    return { sell: true, action: `⏰ 매도 (${MAX_HOLD_DAYS}거래일 경과)` };
  }
  return {
    sell: false,
    action: heldDays === 0 ? "🟢 홀딩 (당일 추천)" : `🟢 홀딩 (${heldDays}일차)`,
  };
}

type CospickPosition = {
  code: string;
  name: string;
  entryPrice: number; // 최초 추천 시점 스캔가(매수가로 가정)
  entryDate: string; // YYYYMMDD (한국시간 기준)
};

const POSITIONS_PATHNAME = "cospick-positions.json";

function toKstYyyymmdd(iso: string) {
  return toKstDateKey(iso).replace(/-/g, "");
}

// 파일이 아직 없으면 null(최초 실행 → 직전 스냅샷으로 시드). 조회 오류는 삼키지 않고
// 그대로 던진다 — 빈 목록으로 오인해 추적 중이던 종목을 통째로 잃지 않기 위함.
async function getPositions(): Promise<CospickPosition[] | null> {
  const result = await get(POSITIONS_PATHNAME, { access: "private" });
  if (!result) return null;
  if (result.statusCode !== 200) throw new Error("cospick positions blob not readable");
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as CospickPosition[];
}

async function savePositions(positions: CospickPosition[]) {
  await put(POSITIONS_PATHNAME, JSON.stringify(positions), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function evaluatePosition(position: CospickPosition, today: string): Promise<ExitCheckItem> {
  const base = {
    code: position.code,
    name: position.name,
    entryPrice: position.entryPrice,
  };
  try {
    const { bars, currentPrice } = await getDailyChartWithPrice(position.code, 30);
    if (bars.length === 0 || currentPrice <= 0) throw new Error("no chart data");

    // 장중에는 오늘 일봉이 아직 확정 전이라, 오늘 봉은 빼고 현재가를 마지막 값으로 넣어
    // 20일선을 계산한다(휴장일이면 오늘 봉이 없어 직전 거래일 기준 그대로).
    const pastCloses = bars.filter((b) => b.date < today).map((b) => b.close);
    const ma20 = sma([...pastCloses.slice(-19), currentPrice], 20);
    const heldDays = bars.filter((b) => b.date > position.entryDate).length;
    const pct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    return {
      ...base,
      currentPrice,
      changePct: Math.round(pct * 100) / 100,
      heldDays,
      ...classifyHolding(currentPrice, position.entryPrice, ma20, heldDays),
    };
  } catch (error) {
    // 한 종목 조회 실패로 전체 체크가 죽지 않게 하고, 종목은 목록에 남겨 다음 실행에서 재평가.
    console.error(`cospick position check failed for ${position.code}:`, error);
    return {
      ...base,
      currentPrice: position.entryPrice,
      changePct: 0,
      heldDays: 0,
      sell: false,
      action: "⚠️ 시세 조회 실패 — 다음 체크로 이월",
    };
  }
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

// cron 전용 — 해외판(cospickOverseas.ts)과 동일하게, 보유 종목 체크와 매수스캔을 한 요청
// 안에서 순서대로 처리한다(두 크론을 따로 스케줄링해 실행 순서를 맞추던 방식은 타이밍
// 의존·누락 위험이 있어 쓰지 않는다). 순서: ① 추적 중인 종목 매도/홀딩 판정 →
// ② 매도된 종목을 목록에서 제거 → ③ 새 매수 후보 스캔 → ④ 새 후보를 목록에 추가.
export type CospickRefreshResult = {
  snapshot: CospickSnapshot;
  exitItems: ExitCheckItem[];
};

export async function refreshCospickAndExitCheck(): Promise<CospickRefreshResult> {
  const now = new Date().toISOString();
  const today = toKstYyyymmdd(now);

  let positions = await getPositions();
  if (!positions) {
    const prevSnapshot = await getCospickSnapshot();
    const seedDate = prevSnapshot ? toKstYyyymmdd(prevSnapshot.generatedAt) : today;
    positions = (prevSnapshot?.candidates ?? []).map((c) => ({
      code: c.code,
      name: c.name,
      entryPrice: c.price,
      entryDate: seedDate,
    }));
  }

  const evaluated = await Promise.all(positions.map((p) => evaluatePosition(p, today)));
  // 알림/화면에서 매도 종목이 먼저 보이도록 정렬
  const exitItems = [...evaluated].sort((a, b) => Number(b.sell) - Number(a.sell));
  await saveExitCheck(exitItems);

  // 스캔이 실패하더라도 이미 알린 매도 종목이 다음 실행에서 또 매도로 뜨지 않도록 먼저 저장.
  const soldCodes = new Set(exitItems.filter((i) => i.sell).map((i) => i.code));
  const kept = positions.filter((p) => !soldCodes.has(p.code));
  await savePositions(kept);

  const snapshot = await refreshCospickSnapshot();

  // 이미 추적 중인 종목이 다시 추천되면 최초 추천가/추천일을 유지한다. 방금 매도 판정한
  // 종목은 같은 실행에서 다시 담지 않는다(같은 알림에 매도와 신규 편입이 겹치는 모순 방지 —
  // 다음 실행에서도 여전히 후보면 그때 새로 담긴다).
  const heldCodes = new Set(kept.map((p) => p.code));
  const added = snapshot.candidates
    .filter((c) => !heldCodes.has(c.code) && !soldCodes.has(c.code))
    .map((c) => ({ code: c.code, name: c.name, entryPrice: c.price, entryDate: today }));
  if (added.length > 0) await savePositions([...kept, ...added]);

  return { snapshot, exitItems };
}
