import { unstable_cache } from "next/cache";
import { CATEGORIES, Category } from "@/data/trends";
import { getDailyTrends, getDatalabSearchTrend } from "./naver";
import { generateWithGemini } from "./gemini";

const CANDIDATE_KEYWORDS: Record<Category, string[]> = {
  "AI/테크": ["AI", "반도체", "로봇", "클라우드", "챗봇"],
  "금융/투자": ["코스피", "환율", "금리", "ETF", "비트코인"],
  "건강/뷰티": ["화장품", "다이어트", "피부관리", "건강식품", "뷰티"],
  "소비/라이프": ["구독서비스", "1인가구", "친환경", "반려동물", "여행"],
  "마케팅/비즈니스": ["스타트업", "브랜드", "마케팅", "투자유치", "M&A"],
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function getTopKeywordPerCategory(): Promise<Record<Category, string>> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const entries = await Promise.all(
    CATEGORIES.map(async (category) => {
      try {
        const result = await getDatalabSearchTrend({
          startDate: formatDate(start),
          endDate: formatDate(end),
          timeUnit: "date",
          keywordGroups: CANDIDATE_KEYWORDS[category].map((keyword) => ({
            groupName: keyword,
            keywords: [keyword],
          })),
        });

        let top = { name: CANDIDATE_KEYWORDS[category][0], ratio: -1 };
        for (const r of result.results) {
          const last = r.data[r.data.length - 1];
          if (last && last.ratio > top.ratio) {
            top = { name: r.title, ratio: last.ratio };
          }
        }
        return [category, top.name] as const;
      } catch (error) {
        console.error(`DataLab lookup failed for ${category}:`, error);
        return [category, CANDIDATE_KEYWORDS[category][0]] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<Category, string>;
}

export type DailyAnalysis = {
  text: string;
  topKeywords: Record<Category, string>;
  generatedAt: string;
};

async function buildDailyAnalysis(): Promise<DailyAnalysis> {
  const [trends, topKeywords] = await Promise.all([
    getDailyTrends(),
    getTopKeywordPerCategory(),
  ]);

  const newsDigest = trends
    .map((t) => `[${t.category}] ${t.title} - ${t.summary}`)
    .join("\n");
  const keywordLines = Object.entries(topKeywords)
    .map(([category, keyword]) => `${category}: ${keyword}`)
    .join("\n");

  const prompt = `너는 데일리 트렌드 뉴스레터 에디터야. 아래 정보를 참고해서 "오늘의 트렌드 분석"을 3~4문장으로 작성해줘.
카테고리를 넘나드는 공통된 흐름이나 오늘 특히 주목할 만한 변화를 짚어주고, 친근하지만 신뢰감 있는 톤으로 써줘. 이모지나 제목 없이 본문 문장만 출력해.

[카테고리별 네이버 데이터랩 인기 검색어]
${keywordLines}

[오늘 수집된 뉴스 목록]
${newsDigest}`;

  const text = await generateWithGemini(prompt);

  return {
    text,
    topKeywords,
    generatedAt: new Date().toISOString(),
  };
}

export const getDailyAnalysis = unstable_cache(
  buildDailyAnalysis,
  ["daily-trend-analysis"],
  { revalidate: 86400 },
);
