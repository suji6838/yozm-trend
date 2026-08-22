const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_BASE = "https://openapi.koreainvestment.com:9443"; // 실전투자

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let inFlightIssue: Promise<string> | null = null;

async function issueAccessToken() {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error("KIS_APP_KEY / KIS_APP_SECRET is not set");
  }

  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`KIS token issue error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    accessToken: data.access_token,
    // KIS 토큰은 1분당 1회 발급 제한이 있어 만료 1분 전까지 재사용
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}

export async function getKisAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  // 동시 호출이 여러 번 토큰 발급을 시도하면 "1분당 1회" 제한에 걸리므로,
  // 진행 중인 발급 요청이 있으면 그 결과를 같이 기다린다.
  if (!inFlightIssue) {
    inFlightIssue = issueAccessToken().finally(() => {
      inFlightIssue = null;
    });
  }
  return inFlightIssue;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 실전투자 계정은 초당 호출 건수 제한이 빡빡해서(EGW00201), 요청을 한 번에
// 하나씩만 내보내도록 큐로 직렬화하고 호출 사이 최소 간격을 둔다.
const MIN_CALL_INTERVAL_MS = 1100;
let requestQueue: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function scheduleSlot(): Promise<void> {
  const slot = requestQueue.then(async () => {
    const wait = lastCallAt + MIN_CALL_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
  });
  requestQueue = slot;
  return slot;
}

async function rawKisFetch(
  path: string,
  trId: string,
  params: Record<string, string>,
) {
  const token = await getKisAccessToken();
  const url = new URL(`${KIS_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  await scheduleSlot();
  const res = await fetch(url, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: KIS_APP_KEY!,
      appsecret: KIS_APP_SECRET!,
      tr_id: trId,
    },
    cache: "no-store",
  });
  const data = (await res.json()) as Record<string, unknown> & { rt_cd?: string };
  if (!res.ok || data.rt_cd === "1") {
    throw new Error(`KIS API error: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function kisFetch(
  path: string,
  trId: string,
  params: Record<string, string>,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await rawKisFetch(path, trId, params);
    } catch (error) {
      const isRateLimited =
        error instanceof Error && error.message.includes("EGW00201");
      if (!isRateLimited || attempt === 4) throw error;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error("unreachable");
}

export type KisCurrentPrice = {
  stck_prpr: string; // 현재가
  prdy_vrss: string; // 전일 대비
  prdy_ctrt: string; // 전일 대비율
  acml_vol: string; // 누적 거래량
};

export async function getCurrentPrice(stockCode: string) {
  const data = (await kisFetch(
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    "FHKST01010100",
    { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: stockCode },
  )) as { output: KisCurrentPrice };
  return data.output;
}

export type KisDailyBar = { date: string; close: number; volume: number };

function yyyymmdd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// 주말/공휴일 감안해 60일 범위로 조회 후 최근 거래일 count개만 사용
export async function getDailyChart(stockCode: string, count = 20) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 60);

  const data = (await kisFetch(
    "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
    "FHKST03010100",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: stockCode,
      FID_INPUT_DATE_1: yyyymmdd(start),
      FID_INPUT_DATE_2: yyyymmdd(end),
      FID_PERIOD_DIV_CODE: "D",
      FID_ORG_ADJ_PRC: "0",
    },
  )) as { output2: { stck_bsop_date: string; stck_clpr: string; acml_vol: string }[] };

  // output2는 최신일→과거 순으로 내려오므로, 최근 count개를 골라 과거→최신 순으로 뒤집음
  return data.output2
    .filter((d) => d.stck_bsop_date)
    .slice(0, count)
    .reverse()
    .map(
      (d): KisDailyBar => ({
        date: d.stck_bsop_date,
        close: Number(d.stck_clpr),
        volume: Number(d.acml_vol),
      }),
    );
}
