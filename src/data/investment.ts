// 추천 종목 유니버스(코드/이름/섹터)와 백테스트 통계 예시값.
// 시세·거래량·추이·점수는 src/lib/investmentAnalysis.ts에서 한국투자증권 KIS Open API로 실시간 조회함.

export type StockMeta = { code: string; name: string; sector: string };

export const STOCK_UNIVERSE: StockMeta[] = [
  { code: "005930", name: "삼성전자", sector: "반도체" },
  { code: "000660", name: "SK하이닉스", sector: "반도체" },
  { code: "035420", name: "NAVER", sector: "인터넷" },
  { code: "051910", name: "LG화학", sector: "2차전지" },
  { code: "005380", name: "현대차", sector: "자동차" },
];

export type StockPick = {
  code: string;
  name: string;
  sector: string;
  score: number; // 0~100, 20일 모멘텀 기반 (실전 투자 전략 아님)
  trend: number[]; // 최근 20일 종가(원)
  volumeLabel: string; // 예: "18,102천"
  price: number; // 현재가(원)
  changePct: number; // 전일 대비율(%)
};

export type InvestmentStats = {
  backtestWinRate: number; // %
  avgReturnPerTrade: number; // %
  cumulativeReturn: number; // %
  maxDrawdown: number; // % (음수)
  nextSignal: {
    label: string;
    takeProfitPct: number;
    stopLossPct: number;
    note: string;
  };
};

// 실제 백테스트 엔진이 아직 없어 고정된 예시 값. 전략 구현 전까지는 참고용으로만 표시.
export const EXAMPLE_INVESTMENT_STATS: InvestmentStats = {
  backtestWinRate: 68.4,
  avgReturnPerTrade: 1.86,
  cumulativeReturn: 24.7,
  maxDrawdown: -6.3,
  nextSignal: {
    label: "다음 거래일 09:00",
    takeProfitPct: 3.0,
    stopLossPct: -1.5,
    note: "추세 악화 감지 시 자동 재검토",
  },
};
