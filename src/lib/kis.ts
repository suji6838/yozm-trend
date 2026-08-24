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
const MIN_CALL_INTERVAL_MS = 800;
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

// 주말/공휴일 감안해 count의 2배(최소 60일) 범위로 조회 후 최근 거래일 count개만 사용
export async function getDailyChart(stockCode: string, count = 20) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(60, count * 2));

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

export type KisVolumeRankItem = {
  code: string;
  name: string;
  price: number;
  changePct: number;
  volume: number;
  tradingValue: number; // 당일 누적 거래대금(원)
};

// 코스피+코스닥 통합, 거래대금순 상위 종목 (관리종목/거래정지/ETF/ETN/SPAC 등 제외)
export async function getVolumeRankUniverse(limit = 20) {
  const data = (await kisFetch(
    "/uapi/domestic-stock/v1/quotations/volume-rank",
    "FHPST01710000",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_COND_SCR_DIV_CODE: "20171",
      FID_INPUT_ISCD: "0000",
      FID_DIV_CLS_CODE: "1",
      FID_BLNG_CLS_CODE: "3",
      FID_TRGT_CLS_CODE: "111111111",
      FID_TRGT_EXLS_CLS_CODE: "1111111101",
      FID_INPUT_PRICE_1: "",
      FID_INPUT_PRICE_2: "",
      FID_VOL_CNT: "",
      FID_INPUT_DATE_1: "",
    },
  )) as {
    output: {
      hts_kor_isnm: string;
      mksc_shrn_iscd: string;
      stck_prpr: string;
      prdy_ctrt: string;
      acml_vol: string;
      acml_tr_pbmn: string;
    }[];
  };

  return data.output.slice(0, limit).map(
    (d): KisVolumeRankItem => ({
      code: d.mksc_shrn_iscd,
      name: d.hts_kor_isnm,
      price: Number(d.stck_prpr),
      changePct: Number(d.prdy_ctrt),
      volume: Number(d.acml_vol),
      tradingValue: Number(d.acml_tr_pbmn),
    }),
  );
}

export type KisOverseasPrice = {
  last: string; // 현재가
  base: string; // 전일종가
  diff: string; // 대비
  rate: string; // 등락율
  tvol: string; // 거래량
};

export async function getOverseasCurrentPrice(excd: string, symb: string) {
  const data = (await kisFetch(
    "/uapi/overseas-price/v1/quotations/price",
    "HHDFS00000300",
    { AUTH: "", EXCD: excd, SYMB: symb },
  )) as { output: KisOverseasPrice };
  return data.output;
}

// 일자별 등락률(rate)이 output2 각 행에 이미 포함돼 있어, 현재가를 별도 호출하지 않고도
// 최근일 changePct를 구할 수 있다.
export type KisOverseasDailyBar = {
  date: string;
  close: number;
  volume: number;
  changePct: number;
};

// 해외주식은 국내와 달리 거래대금순위 조회 API가 없어 고정 종목 리스트를 순회하며
// 종목별 일별시세만 조회한다. GUBN "0"=일봉, MODP "0"=수정주가 미반영.
export async function getOverseasDailyChart(excd: string, symb: string, count = 90) {
  const data = (await kisFetch(
    "/uapi/overseas-price/v1/quotations/dailyprice",
    "HHDFS76240000",
    { AUTH: "", EXCD: excd, SYMB: symb, GUBN: "0", BYMD: "", MODP: "0" },
  )) as { output2: { xymd: string; clos: string; tvol: string; rate: string; sign: string }[] };

  // output2는 최신일→과거 순으로 내려오므로, 최근 count개를 골라 과거→최신 순으로 뒤집음
  // sign: 1/2=상승, 4/5=하락 — rate 절대값에 부호를 붙여준다.
  return data.output2
    .filter((d) => d.xymd)
    .slice(0, count)
    .reverse()
    .map((d): KisOverseasDailyBar => {
      const rate = Math.abs(Number(d.rate));
      const falling = d.sign === "4" || d.sign === "5";
      return {
        date: d.xymd,
        close: Number(d.clos),
        volume: Number(d.tvol),
        changePct: falling ? -rate : rate,
      };
    });
}

// 코스피(0001)/코스닥(1001) 지수가 20일 이격도 기준으로 20일선 위에 있는지
export async function getIndexAboveMa20(indexCode: "0001" | "1001") {
  const data = (await kisFetch(
    "/uapi/domestic-stock/v1/quotations/inquire-index-daily-price",
    "FHPUP02120000",
    {
      FID_PERIOD_DIV_CODE: "D",
      FID_COND_MRKT_DIV_CODE: "U",
      FID_INPUT_ISCD: indexCode,
      FID_INPUT_DATE_1: yyyymmdd(new Date()),
    },
  )) as { output1: { d20_dsrt: string } };

  return Number(data.output1.d20_dsrt) >= 100;
}
