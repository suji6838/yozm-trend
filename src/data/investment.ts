// 코스픽(KOSPIK) 연동 목업 데이터.
// 실제 시세/거래량/기술·수급 지표는 한국투자증권 KIS Open API 연동 후 이 파일을 대체할 예정.
// 구조(필드)는 실데이터 전환 시 그대로 재사용할 수 있게 맞춰둠.

export type StockPick = {
  code: string;
  name: string;
  sector: string;
  score: number; // 0~100 추천점수
  trend: number[]; // 최근 20일 종가 흐름(정규화 값, 스파크라인용)
  volumeLabel: string; // 예: "12,483천"
};

export type InvestmentStats = {
  backtestWinRate: number; // %
  avgReturnPerTrade: number; // %
  cumulativeReturn: number; // %
  maxDrawdown: number; // % (음수)
  updatedAt: string; // 표시용 문자열
  nextSignal: {
    label: string; // 예: "다음 거래일 09:00"
    takeProfitPct: number;
    stopLossPct: number;
    note: string;
  };
};

export const INVESTMENT_STATS: InvestmentStats = {
  backtestWinRate: 68.4,
  avgReturnPerTrade: 1.86,
  cumulativeReturn: 24.7,
  maxDrawdown: -6.3,
  updatedAt: "15:00 기준 (예시 데이터)",
  nextSignal: {
    label: "다음 거래일 09:00",
    takeProfitPct: 3.0,
    stopLossPct: -1.5,
    note: "추세 악화 감지 시 자동 재검토",
  },
};

export const STOCK_PICKS: StockPick[] = [
  {
    code: "005930",
    name: "삼성전자",
    sector: "반도체",
    score: 94,
    trend: [61, 63, 60, 65, 68, 66, 70, 72, 71, 75, 74, 78, 80, 79, 83, 85, 84, 88, 90, 92],
    volumeLabel: "18,102천",
  },
  {
    code: "000660",
    name: "SK하이닉스",
    sector: "반도체",
    score: 91,
    trend: [55, 58, 57, 60, 62, 59, 64, 66, 68, 65, 70, 72, 71, 75, 77, 76, 80, 82, 81, 85],
    volumeLabel: "9,443천",
  },
  {
    code: "035420",
    name: "NAVER",
    sector: "인터넷",
    score: 88,
    trend: [70, 68, 71, 69, 72, 74, 73, 76, 75, 78, 77, 80, 79, 82, 81, 84, 83, 86, 85, 88],
    volumeLabel: "1,988천",
  },
  {
    code: "051910",
    name: "LG화학",
    sector: "2차전지",
    score: 85,
    trend: [80, 78, 76, 79, 77, 75, 78, 76, 74, 77, 75, 78, 80, 79, 82, 81, 84, 83, 86, 85],
    volumeLabel: "743천",
  },
  {
    code: "005380",
    name: "현대차",
    sector: "자동차",
    score: 83,
    trend: [65, 66, 64, 67, 69, 68, 70, 69, 72, 71, 73, 75, 74, 76, 78, 77, 79, 81, 80, 83],
    volumeLabel: "2,146천",
  },
];
