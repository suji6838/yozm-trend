import { put, get } from "@vercel/blob";
import { getOverseasDailyChart } from "./kis";
import { sma, scoreTrend, classifyExit } from "./cospick";
import { OVERSEAS_UNIVERSE, OverseasTicker } from "./overseasTickers";

// 국내판과 달리 거래대금·시장분위기 점수는 뺀다 — 해외는 종목군 자체가 고정된 대형주
// 리스트라 거래대금 하한이 의미가 적고, KIS 해외 API에는 지수 일별시세가 없어 코스피/코스닥
// 20일선 같은 시장분위기 점수를 계산할 방법이 없다(분봉 조회만 지원).
const TREND_MAX = 20;
const VOLUME_MAX = 5;
export const OVERSEAS_SCORE_MAX = TREND_MAX + VOLUME_MAX;

const SURGE_LIMIT_PCT = 15; // 당일 +15% 이상 급등 → 주의 종목
const CRASH_LIMIT_PCT = -7; // 당일 -7% 이하 급락 → 주의 종목

function scoreVolume(volumes: number[]) {
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
  return { score, reasons };
}

function checkExclusion(changePct: number): string | null {
  if (changePct >= SURGE_LIMIT_PCT) {
    return `당일 +${changePct.toFixed(1)}% 급등 — 단기 과열`;
  }
  if (changePct <= CRASH_LIMIT_PCT) {
    return `당일 ${changePct.toFixed(1)}% 급락 — 악재 가능성`;
  }
  return null;
}

export type OverseasCandidate = {
  symbol: string;
  exchange: string;
  name: string;
  price: number;
  changePct: number;
  trend: number[]; // 최근 20일 종가(스파크라인용)
  score: { trend: number; volume: number; total: number };
  reasons: string[];
  caution?: string;
};

export type OverseasExitItem = {
  symbol: string;
  name: string;
  entryPrice: number;
  currentPrice: number;
  changePct: number;
  action: string;
};

export type OverseasCospickSnapshot = {
  candidates: OverseasCandidate[];
  exitCheck: OverseasExitItem[];
  scanned: number;
  generatedAt: string;
};

async function evaluateTicker(ticker: OverseasTicker): Promise<OverseasCandidate | null> {
  const bars = await getOverseasDailyChart(ticker.exchange, ticker.symbol, 90);
  if (bars.length < 61) return null;

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const latest = bars[bars.length - 1];

  const trend = scoreTrend(closes);
  const volume = scoreVolume(volumes);
  const total = Math.round(trend.score + volume.score);

  const exclusionReason = checkExclusion(latest.changePct);
  const reasons = [...trend.reasons, ...volume.reasons];
  if (exclusionReason) reasons.unshift(`⚠️ ${exclusionReason} — 주의 종목`);

  return {
    symbol: ticker.symbol,
    exchange: ticker.exchange,
    name: ticker.name,
    price: latest.close,
    changePct: latest.changePct,
    trend: closes.slice(-20),
    score: { trend: trend.score, volume: volume.score, total },
    reasons,
    caution: exclusionReason ?? undefined,
  };
}

async function buildOverseasSnapshot(): Promise<OverseasCospickSnapshot> {
  const prev = await getOverseasCospickSnapshot();

  const evaluated = await Promise.all(
    OVERSEAS_UNIVERSE.map(async (ticker) => {
      try {
        return await evaluateTicker(ticker);
      } catch (error) {
        console.error(`overseas cospick scoring failed for ${ticker.symbol}:`, error);
        return null;
      }
    }),
  );

  const results = evaluated.filter((c): c is OverseasCandidate => c !== null);
  const clean = results.filter((c) => !c.caution).sort((a, b) => b.score.total - a.score.total);
  const risky = results.filter((c) => c.caution).sort((a, b) => b.score.total - a.score.total);
  const candidates = [...clean, ...risky].slice(0, 3);

  // 매도 체크: 어제 후보 종목을, 오늘 스캔에서 이미 받아온 전체 유니버스 종가로 재평가한다.
  // 해외는 전일 종가 기준으로만 다루므로(장중 실시간 조회 없음) 국내처럼 별도 크론/API
  // 호출이 필요 없다 — 오늘 스캔 데이터를 그대로 재사용.
  const latestBySymbol = new Map(results.map((c) => [c.symbol, c]));
  const exitCheck: OverseasExitItem[] = (prev?.candidates ?? []).flatMap((prevCandidate) => {
    const latest = latestBySymbol.get(prevCandidate.symbol);
    if (!latest) return [];
    const pct = ((latest.price - prevCandidate.price) / prevCandidate.price) * 100;
    return [
      {
        symbol: prevCandidate.symbol,
        name: prevCandidate.name,
        entryPrice: prevCandidate.price,
        currentPrice: latest.price,
        changePct: Math.round(pct * 100) / 100,
        action: classifyExit(pct),
      },
    ];
  });

  return {
    candidates,
    exitCheck,
    scanned: OVERSEAS_UNIVERSE.length,
    generatedAt: new Date().toISOString(),
  };
}

const OVERSEAS_SNAPSHOT_PATHNAME = "cospick-overseas-snapshot-latest.json";

async function saveOverseasSnapshot(snapshot: OverseasCospickSnapshot) {
  await put(OVERSEAS_SNAPSHOT_PATHNAME, JSON.stringify(snapshot), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// 방문자용 — KIS를 직접 부르지 않고 cron이 미리 저장해둔 Blob만 읽는다.
export async function getOverseasCospickSnapshot(): Promise<OverseasCospickSnapshot | null> {
  try {
    const result = await get(OVERSEAS_SNAPSHOT_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as OverseasCospickSnapshot;
  } catch (error) {
    console.error("Failed to load overseas cospick snapshot:", error);
    return null;
  }
}

// cron 전용 — 실제로 KIS를 호출해 새로 스캔하고 Blob에 저장한다.
export async function refreshOverseasCospickSnapshot(): Promise<OverseasCospickSnapshot> {
  const snapshot = await buildOverseasSnapshot();
  await saveOverseasSnapshot(snapshot);
  await appendOverseasCospickHistory(snapshot);
  return snapshot;
}

// ── 1주일 기록용 히스토리 (전일 종가 스캔 결과를 날짜별로 최대 7일 보관) ──────
export type OverseasCospickHistoryEntry = {
  date: string; // YYYY-MM-DD (한국시간 기준)
  generatedAt: string;
  candidates: {
    symbol: string;
    exchange: string;
    name: string;
    price: number;
    changePct: number;
    score: number;
  }[];
};

const OVERSEAS_HISTORY_PATHNAME = "cospick-overseas-history.json";
const OVERSEAS_HISTORY_DAYS = 7;

function toKstDateKey(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

async function getOverseasCospickHistoryRaw(): Promise<OverseasCospickHistoryEntry[]> {
  try {
    const result = await get(OVERSEAS_HISTORY_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as OverseasCospickHistoryEntry[];
  } catch (error) {
    console.error("Failed to load overseas cospick history:", error);
    return [];
  }
}

// 같은 날짜에 여러 번 실행돼도(재배포 등) 그날 기록은 마지막 결과로 덮어쓴다.
// 배포 직후 1회성 백필 스크립트에서도 재사용할 수 있도록 export.
export async function appendOverseasCospickHistory(snapshot: OverseasCospickSnapshot) {
  const existing = await getOverseasCospickHistoryRaw();
  const date = toKstDateKey(snapshot.generatedAt);
  const entry: OverseasCospickHistoryEntry = {
    date,
    generatedAt: snapshot.generatedAt,
    candidates: snapshot.candidates.map((c) => ({
      symbol: c.symbol,
      exchange: c.exchange,
      name: c.name,
      price: c.price,
      changePct: c.changePct,
      score: c.score.total,
    })),
  };
  const updated = [...existing.filter((e) => e.date !== date), entry]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, OVERSEAS_HISTORY_DAYS);
  await put(OVERSEAS_HISTORY_PATHNAME, JSON.stringify(updated), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// 방문자용 — Blob만 읽는다.
export async function getOverseasCospickHistory(): Promise<OverseasCospickHistoryEntry[]> {
  return getOverseasCospickHistoryRaw();
}
