import { unstable_cache } from "next/cache";
import { CATEGORIES, Category, Trend } from "@/data/trends";
import { getCandidatePool, getDatalabSearchTrend } from "./naver";
import { generateWithGemini } from "./gemini";
import { CATEGORY_CRITERIA } from "./curationCriteria";

const PER_CATEGORY_COUNT = 3;

const DATALAB_CANDIDATE_KEYWORDS: Record<Category, string[]> = {
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
          keywordGroups: DATALAB_CANDIDATE_KEYWORDS[category].map((keyword) => ({
            groupName: keyword,
            keywords: [keyword],
          })),
        });

        let top = { name: DATALAB_CANDIDATE_KEYWORDS[category][0], ratio: -1 };
        for (const r of result.results) {
          const last = r.data[r.data.length - 1];
          if (last && last.ratio > top.ratio) {
            top = { name: r.title, ratio: last.ratio };
          }
        }
        return [category, top.name] as const;
      } catch (error) {
        console.error(`DataLab lookup failed for ${category}:`, error);
        return [category, DATALAB_CANDIDATE_KEYWORDS[category][0]] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<Category, string>;
}

type Candidate = { globalIndex: number; category: Category; trend: Trend };

function buildCandidateList(pool: Record<Category, Trend[]>): Candidate[] {
  let i = 0;
  const list: Candidate[] = [];
  for (const category of CATEGORIES) {
    for (const trend of pool[category]) {
      list.push({ globalIndex: i, category, trend });
      i += 1;
    }
  }
  return list;
}

function buildCriteriaBlock() {
  return CATEGORIES.map((category) => {
    const c = CATEGORY_CRITERIA[category];
    return `### ${category}
포함 기준: ${c.include.join(" / ")}
제외 기준: ${c.exclude.join(" / ")}`;
  }).join("\n\n");
}

function buildCandidateBlock(candidates: Candidate[]) {
  return candidates
    .map(
      (c) =>
        `[${c.globalIndex}] (${c.category}) ${c.trend.title} - ${c.trend.summary}`,
    )
    .join("\n");
}

function pickWithBackfill(
  selectedIndices: number[],
  pool: Record<Category, Trend[]>,
  candidates: Candidate[],
): Trend[] {
  const byCategory: Record<Category, Trend[]> = {
    "AI/테크": [],
    "금융/투자": [],
    "건강/뷰티": [],
    "소비/라이프": [],
    "마케팅/비즈니스": [],
  };

  for (const idx of selectedIndices) {
    const c = candidates[idx];
    if (!c) continue;
    if (byCategory[c.category].length < PER_CATEGORY_COUNT) {
      byCategory[c.category].push(c.trend);
    }
  }

  for (const category of CATEGORIES) {
    const selectedLinks = new Set(byCategory[category].map((t) => t.link));
    for (const trend of pool[category]) {
      if (byCategory[category].length >= PER_CATEGORY_COUNT) break;
      if (!selectedLinks.has(trend.link)) {
        byCategory[category].push(trend);
        selectedLinks.add(trend.link);
      }
    }
  }

  return CATEGORIES.flatMap((category) => byCategory[category]);
}

const CURATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    selectedIndices: { type: "array", items: { type: "integer" } },
    analysis: { type: "string" },
  },
  required: ["selectedIndices", "analysis"],
};

export type DailyAnalysis = {
  trends: Trend[];
  text: string;
  topKeywords: Record<Category, string>;
  generatedAt: string;
};

async function buildDailyAnalysis(): Promise<DailyAnalysis> {
  const [pool, topKeywords] = await Promise.all([
    getCandidatePool(6),
    getTopKeywordPerCategory(),
  ]);

  const candidates = buildCandidateList(pool);
  const keywordLines = Object.entries(topKeywords)
    .map(([category, keyword]) => `${category}: ${keyword}`)
    .join("\n");

  const prompt = `너는 데일리 트렌드 뉴스레터 에디터야. 아래 카테고리별 포함/제외 기준을 엄격히 적용해서 오늘의 후보 기사 중 카테고리마다 정확히 ${PER_CATEGORY_COUNT}개씩 골라줘.
제외 기준(단순 실적/인사/주가 변동/보도자료성 기사 등)에 해당하는 기사는 그 카테고리에 후보가 부족해지더라도 절대 고르지 마.

[카테고리별 포함/제외 기준]
${buildCriteriaBlock()}

[카테고리별 네이버 데이터랩 인기 검색어]
${keywordLines}

[오늘의 후보 기사 목록 (번호) (카테고리) 제목 - 요약]
${buildCandidateBlock(candidates)}

selectedIndices에는 고른 기사들의 번호만 넣고, analysis에는 고른 기사들과 인기 검색어를 바탕으로 카테고리를 넘나드는 공통된 흐름이나 오늘 주목할 만한 변화를 3~4문장으로, 친근하지만 신뢰감 있는 톤으로 작성해줘(이모지·제목 없이 본문 문장만).`;

  const raw = await generateWithGemini(prompt, {
    jsonSchema: CURATION_JSON_SCHEMA,
  });
  const parsed = JSON.parse(raw) as {
    selectedIndices: number[];
    analysis: string;
  };

  const trends = pickWithBackfill(parsed.selectedIndices ?? [], pool, candidates);

  return {
    trends,
    text: parsed.analysis,
    topKeywords,
    generatedAt: new Date().toISOString(),
  };
}

export const getDailyAnalysis = unstable_cache(
  buildDailyAnalysis,
  ["daily-trend-analysis-v2"],
  { revalidate: 86400 },
);
