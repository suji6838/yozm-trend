const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const NAVER_API_HUB_BASE = "https://naverapihub.apigw.ntruss.com";

function naverHeaders() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET is not set");
  }
  return {
    "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET,
  };
}

export type NaverNewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function searchNaverNews(query: string, display = 10) {
  const url = new URL(`${NAVER_API_HUB_BASE}/search/v1/news`);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("sort", "date");

  const res = await fetch(url, { headers: naverHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Naver News API error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { items: NaverNewsItem[] };
  return data.items;
}

export type DatalabTrendPoint = { period: string; ratio: number };
export type DatalabTrendResult = {
  results: { title: string; keywords: string[]; data: DatalabTrendPoint[] }[];
};

import { CATEGORIES, Category, Trend } from "@/data/trends";

const PER_CATEGORY_COUNT = 3;

const CATEGORY_QUERIES: Record<Category, string[]> = {
  "AI/테크": ["AI"],
  "금융/투자": ["국내증시", "해외증시 ETF"],
  "건강/뷰티": ["건강 뷰티"],
  "소비/라이프": ["소비 트렌드"],
  "마케팅/비즈니스": ["마케팅"],
};

function decodeHtmlEntities(text: string) {
  return text
    .replace(/<\/?b>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function formatPubDate(pubDate: string) {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return date.toISOString().slice(0, 10);
}

function sourceFromLink(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "네이버 뉴스";
  }
}

export async function getDailyTrends(): Promise<Trend[]> {
  const perCategory = await Promise.all(
    CATEGORIES.map(async (category) => {
      const queries = CATEGORY_QUERIES[category];
      const resultsPerQuery = await Promise.all(
        queries.map((query) => searchNaverNews(query, PER_CATEGORY_COUNT)),
      );

      const seenLinks = new Set<string>();
      const deduped = resultsPerQuery.flat().filter((item) => {
        const key = item.originallink || item.link;
        if (seenLinks.has(key)) return false;
        seenLinks.add(key);
        return true;
      });

      deduped.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );

      return deduped.slice(0, PER_CATEGORY_COUNT).map(
        (item, index): Trend => ({
          id: `${category}-${index}-${item.link}`,
          category,
          publishedDate: formatPubDate(item.pubDate),
          title: decodeHtmlEntities(item.title),
          summary: decodeHtmlEntities(item.description),
          source: sourceFromLink(item.originallink || item.link),
          link: item.originallink || item.link,
        }),
      );
    }),
  );
  return perCategory.flat();
}

export async function getDatalabSearchTrend(params: {
  startDate: string;
  endDate: string;
  timeUnit?: "date" | "week" | "month";
  keywordGroups: { groupName: string; keywords: string[] }[];
}) {
  const res = await fetch(`${NAVER_API_HUB_BASE}/search-trend/v1/search`, {
    method: "POST",
    headers: {
      ...naverHeaders(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      timeUnit: params.timeUnit ?? "date",
      keywordGroups: params.keywordGroups,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Naver DataLab API error: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as DatalabTrendResult;
}
