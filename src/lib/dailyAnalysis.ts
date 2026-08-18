import { unstable_cache } from "next/cache";
import { put, list } from "@vercel/blob";
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

type MomentumSeries = { keyword: string; ratios: number[] };

async function getMomentumSeries(): Promise<Record<Category, MomentumSeries[]>> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

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
        const series = result.results.map((r) => ({
          keyword: r.title,
          ratios: r.data.map((d) => Math.round(d.ratio)),
        }));
        return [category, series] as const;
      } catch (error) {
        console.error(`DataLab momentum lookup failed for ${category}:`, error);
        return [category, [] as MomentumSeries[]] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<Category, MomentumSeries[]>;
}

function buildMomentumBlock(momentum: Record<Category, MomentumSeries[]>) {
  return CATEGORIES.map((category) => {
    const lines = momentum[category]
      .map((s) => `- ${s.keyword}: [${s.ratios.join(", ")}]`)
      .join("\n");
    return `### ${category}\n${lines || "(데이터 없음)"}`;
  }).join("\n\n");
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
        `[${c.globalIndex}] (${c.category}) ${c.trend.title} - ${c.trend.summary} - 출처:${c.trend.source}`,
    )
    .join("\n");
}

// ── 그리드 선정 + 트렌드 클러스터링을 Gemini 호출 1번으로 통합 (일일 무료 할당량 절약) ──

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

export type TrendCluster = {
  title: string;
  oneLineSummary: string;
  whyNow: string;
  whyItMatters: string;
  score: number;
  badge: string;
  momentum: "상승" | "유지" | "하락";
  category: Category;
  evidence: { title: string; source: string; link?: string }[];
};

type RawTrendCluster = {
  title: string;
  oneLineSummary: string;
  whyNow: string;
  whyItMatters: string;
  score: number;
  momentum: string;
  category: string;
  evidenceIndices: number[];
};

const COMBINED_JSON_SCHEMA = {
  type: "object",
  properties: {
    selectedIndices: { type: "array", items: { type: "integer" } },
    trends: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          oneLineSummary: { type: "string" },
          whyNow: { type: "string" },
          whyItMatters: { type: "string" },
          score: { type: "integer" },
          momentum: { type: "string" },
          category: { type: "string" },
          evidenceIndices: { type: "array", items: { type: "integer" } },
        },
        required: [
          "title",
          "oneLineSummary",
          "whyNow",
          "whyItMatters",
          "score",
          "momentum",
          "category",
          "evidenceIndices",
        ],
      },
    },
  },
  required: ["selectedIndices", "trends"],
};

function scoreBadge(score: number): string {
  if (score >= 90) return "🔥 Breakout";
  if (score >= 80) return "🚀 Strong";
  return "📈 Emerging";
}

function selectTopTrends(
  raw: RawTrendCluster[],
  candidates: Candidate[],
): TrendCluster[] {
  const passing = raw
    .filter(
      (t) =>
        typeof t.score === "number" &&
        t.score >= 70 &&
        (CATEGORIES as string[]).includes(t.category),
    )
    .sort((a, b) => b.score - a.score);

  const perCategoryCount: Partial<Record<Category, number>> = {};
  const selected: RawTrendCluster[] = [];

  for (const t of passing) {
    if (selected.length >= 5) break;
    const category = t.category as Category;
    const count = perCategoryCount[category] ?? 0;
    if (count < 2) {
      selected.push(t);
      perCategoryCount[category] = count + 1;
    }
  }

  if (selected.length < 3) {
    for (const t of passing) {
      if (selected.length >= 5) break;
      if (!selected.includes(t)) selected.push(t);
    }
  }

  return selected
    .sort((a, b) => b.score - a.score)
    .map((t) => ({
      title: t.title,
      oneLineSummary: t.oneLineSummary,
      whyNow: t.whyNow,
      whyItMatters: t.whyItMatters,
      score: t.score,
      badge: scoreBadge(t.score),
      momentum: (["상승", "유지", "하락"].includes(t.momentum)
        ? t.momentum
        : "유지") as TrendCluster["momentum"],
      category: t.category as Category,
      evidence: t.evidenceIndices
        .map((idx) => candidates[idx])
        .filter((c): c is Candidate => !!c)
        .slice(0, 4)
        .map((c) => ({
          title: c.trend.title,
          source: c.trend.source,
          link: c.trend.link,
        })),
    }));
}

type CombinedResult = { trends: Trend[]; topTrends: TrendCluster[] };

async function runCombinedGemini(
  pool: Record<Category, Trend[]>,
  candidates: Candidate[],
  momentum: Record<Category, MomentumSeries[]>,
): Promise<CombinedResult> {
  const prompt = `너는 데일리 트렌드 뉴스레터 에디터야. 아래 두 가지 작업을 한 번에 해줘 — ①은 카테고리별 기사 목록용, ②는 "오늘의 트렌드" 분석용이고 서로 별개의 결과물이야.

## ① 카테고리별 기사 선정 (selectedIndices)
아래 카테고리별 포함/제외 기준을 엄격히 적용해서, 오늘의 후보 기사 중 카테고리마다 정확히 ${PER_CATEGORY_COUNT}개씩 골라줘.
제외 기준(단순 실적/인사/주가 변동/보도자료성 기사 등)에 해당하는 기사는 그 카테고리에 후보가 부족해지더라도 절대 고르지 마.

[카테고리별 포함/제외 기준]
${buildCriteriaBlock()}

selectedIndices에는 이렇게 고른 기사들의 번호만 넣어줘(카테고리당 ${PER_CATEGORY_COUNT}개, 총 ${PER_CATEGORY_COUNT * CATEGORIES.length}개 목표).

## ② "오늘의 트렌드" 분석 (trends)
①과는 별도로, 아래 원칙에 따라 "오늘의 트렌드"를 선정해줘. ①에서 고르지 않은 기사도 트렌드 근거로 자유롭게 써도 됨.

[목적]
단순히 오늘 기사가 많이 나온 주제가 아니라, "최근 뉴스에서 반복적으로 나타나면서 앞으로 확산될 가능성이 높은 변화"를 찾는다.

[트렌드 후보 선정 조건]
- 서로 다른 출처에서 2개 이상의 관련 기사가 존재해야 함
- 동일 사건의 단순 반복 보도는 하나로 묶는다
- 단순 뉴스가 아니라 공통적인 "변화 방향"이 존재해야 함
- 최근 관심/언급량이 증가하는 흐름인지 확인
- 산업·기업·소비자에게 영향을 줄 가능성이 있는지 확인
- 향후 다른 분야로 확산될 가능성이 있는지 확인

[트렌드에서 제외할 것] (단, 여러 기업/기관/산업에서 같은 방향의 변화가 동시에 나타나면 예외적으로 인정)
- 단일 기업의 신제품 출시, 단일 기업의 실적 발표, 단일 사건
- 단순 주가 상승/하락, 단순 인사 발표, 단순 정책 발표, 단순 할인/프로모션
- 유명인의 단순 발언, 동일 사건의 언론사 반복 보도

[Trend Cluster 예시]
OpenAI Agent 발표 + Google Agent 확대 + Microsoft Agent 플랫폼 + Anthropic Computer Use
→ "AI Agent가 챗봇에서 실제 업무 수행형 AI로 진화" (개별 뉴스 나열이 아니라 공통된 변화 방향을 제목으로)

[Trend Score 기준 (100점 만점, 배점: 기사/출처 언급량25 + 최근 증가세(모멘텀)20 + 새로운 변화인지20 + 시장 영향력15 + 확산 가능성10 + 지속 가능성10)]
가능한 후보 전부에 대해 점수를 매겨서 반환해줘. 70점 미만이어도 괜찮음(최종 필터링은 내가 코드로 처리함).

[제목 작성 원칙]
기사 제목을 복사하지 말고, "무슨 뉴스가 나왔는가"가 아니라 "어떤 변화가 나타나고 있는가"를 20~35자로 작성.
예) ❌ "OpenAI 새로운 Agent 발표" / ⭕ "AI Agent, 챗봇에서 실제 업무 수행 단계로 진화"

[카테고리별 데이터랩 모멘텀 참고자료 (최근 7일 검색 비율, 100에 가까울수록 그 기간 내 최고치)]
${buildMomentumBlock(momentum)}

최대 8개까지 트렌드 후보를 골라서 각각 title(20~35자, 변화 방향 서술), oneLineSummary(변화를 한 문장으로), whyNow(왜 지금 나타난 트렌드인지 2문장), whyItMatters(시장/기업/소비자에게 어떤 의미인지 2~3문장), score(0~100), momentum(상승/유지/하락 중 하나), category(5개 카테고리 중 정확히 하나), evidenceIndices(이 트렌드를 뒷받침하는 후보 기사 번호 2~4개)를 trends에 JSON으로 반환해줘.

## ①·② 공통 후보 기사 목록 (번호) (카테고리) 제목 - 요약 - 출처
${buildCandidateBlock(candidates)}

최종적으로 selectedIndices(①)와 trends(②) 두 필드를 모두 채운 하나의 JSON으로 반환해줘.`;

  const raw = await generateWithGemini(prompt, {
    jsonSchema: COMBINED_JSON_SCHEMA,
  });
  const parsed = JSON.parse(raw) as {
    selectedIndices: number[];
    trends: RawTrendCluster[];
  };

  return {
    trends: pickWithBackfill(parsed.selectedIndices ?? [], pool, candidates),
    topTrends: selectTopTrends(parsed.trends ?? [], candidates),
  };
}

// ── 통합 파이프라인 ──

export type DailyAnalysis = {
  trends: Trend[];
  topTrends: TrendCluster[];
  generatedAt: string;
};

// Gemini 호출이 실패(할당량 소진 등)해도 사이트가 비어 보이지 않도록,
// 마지막으로 성공한 분석 결과를 Vercel Blob에 저장해뒀다가 그대로 재사용한다.
const LAST_GOOD_PATHNAME = "daily-analysis-latest.json";

async function saveLastGoodAnalysis(analysis: DailyAnalysis) {
  try {
    await put(LAST_GOOD_PATHNAME, JSON.stringify(analysis), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("Failed to persist last-good daily analysis:", error);
  }
}

async function loadLastGoodAnalysis(): Promise<DailyAnalysis | null> {
  try {
    const { blobs } = await list({ prefix: LAST_GOOD_PATHNAME, limit: 1 });
    const blob = blobs[0];
    if (!blob) return null;
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as DailyAnalysis;
  } catch (error) {
    console.error("Failed to load last-good daily analysis:", error);
    return null;
  }
}

async function buildDailyAnalysis(): Promise<DailyAnalysis> {
  const [pool, momentum] = await Promise.all([
    getCandidatePool(6),
    getMomentumSeries(),
  ]);
  const candidates = buildCandidateList(pool);

  try {
    const combined = await runCombinedGemini(pool, candidates, momentum);
    const analysis: DailyAnalysis = {
      trends: combined.trends,
      topTrends: combined.topTrends,
      generatedAt: new Date().toISOString(),
    };
    await saveLastGoodAnalysis(analysis);
    return analysis;
  } catch (error) {
    console.error(
      "Combined Gemini curation failed, falling back to last-good analysis:",
      error,
    );
    // 이전에 성공한 분석 결과가 있으면 그걸 그대로 재사용.
    const lastGood = await loadLastGoodAnalysis();
    if (lastGood) return lastGood;

    // 저장된 결과조차 없을 때만(최초 실행 등) 원문 후보 기사를 그대로 노출.
    return {
      trends: CATEGORIES.flatMap((category) =>
        pool[category].slice(0, PER_CATEGORY_COUNT),
      ),
      topTrends: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

export const getDailyAnalysis = unstable_cache(
  buildDailyAnalysis,
  ["daily-trend-analysis-v7"],
  { revalidate: 259200, tags: ["daily-analysis"] },
);
