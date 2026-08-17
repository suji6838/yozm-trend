export type Category =
  | "AI/테크"
  | "금융/투자"
  | "건강/뷰티"
  | "소비/라이프"
  | "마케팅/비즈니스";

export const CATEGORIES: Category[] = [
  "AI/테크",
  "금융/투자",
  "건강/뷰티",
  "소비/라이프",
  "마케팅/비즈니스",
];

export const CATEGORY_STYLES: Record<Category, string> = {
  "AI/테크": "bg-blue-50 text-blue-600",
  "금융/투자": "bg-violet-50 text-violet-600",
  "건강/뷰티": "bg-green-50 text-green-600",
  "소비/라이프": "bg-amber-50 text-amber-600",
  "마케팅/비즈니스": "bg-rose-50 text-rose-600",
};

export type Trend = {
  id: string;
  category: Category;
  publishedDate: string;
  title: string;
  summary: string;
  source: string;
};

export const TRENDS: Trend[] = [
  {
    id: "1",
    category: "AI/테크",
    publishedDate: "2026-08-07",
    title: "신뢰 가능한 AI를 위한 출처 표시",
    summary:
      "생성 결과의 근거와 검토 과정을 함께 보여주는 제품 설계가 중요해지고 있습니다.",
    source: "퓨처 리포트",
  },
  {
    id: "2",
    category: "AI/테크",
    publishedDate: "2026-08-07",
    title: "AI 에이전트, 업무의 동료가 되다",
    summary:
      "질문에 답하는 것을 넘어 여러 단계를 실행하는 AI 활용이 본격화되고 있습니다.",
    source: "AI 시그널",
  },
  {
    id: "3",
    category: "AI/테크",
    publishedDate: "2026-08-07",
    title: "작은 팀의 자동화 도구 도입",
    summary:
      "반복 업무를 줄이는 연결형 도구가 소규모 조직의 업무 방식을 바꾸고 있습니다.",
    source: "워크플로우 위클리",
  },
  {
    id: "4",
    category: "AI/테크",
    publishedDate: "2026-08-07",
    title: "온디바이스 AI, 제품 경험을 바꾸다",
    summary:
      "개인 정보 보호와 빠른 응답성을 앞세운 기기 내 AI 기능이 확산 중입니다.",
    source: "테크 옵저버",
  },
  {
    id: "5",
    category: "금융/투자",
    publishedDate: "2026-08-07",
    title: "생활비 관리, 자동화가 기준이 되다",
    summary:
      "정기 지출을 분류하고 알림을 주는 개인 재무 관리 방식이 일상화되고 있어요.",
    source: "파이낸스 데일리",
  },
  {
    id: "6",
    category: "마케팅/비즈니스",
    publishedDate: "2026-08-07",
    title: "커뮤니티 언어를 배우는 캠페인",
    summary:
      "소비자가 쓰는 표현과 맥락을 반영한 참여형 메시지가 반응을 얻고 있어요.",
    source: "마케팅 인사이드",
  },
  {
    id: "7",
    category: "마케팅/비즈니스",
    publishedDate: "2026-08-07",
    title: "짧은 영상의 다음 단계는 시리즈화",
    summary:
      "단발성 바이럴보다 반복해서 찾게 만드는 짧은 연재형 콘텐츠가 늘고 있어요.",
    source: "브랜드 브리프",
  },
  {
    id: "8",
    category: "건강/뷰티",
    publishedDate: "2026-08-07",
    title: "스킨케어는 성분보다 사용감",
    summary:
      "효능과 함께 제형, 향, 루틴 경험을 설명하는 브랜드가 선택받고 있어요.",
    source: "뷰티 트렌드 노트",
  },
];

export const DATA_SOURCES = [
  "네이버 DataLab",
  "네이버 뉴스",
  "Google Trends",
  "Product Hunt",
  "Bloomberg",
];
