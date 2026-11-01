import { CATEGORIES, Category, Trend } from "@/data/trends";

const RSS_BASE = "https://news.google.com/rss/search";
const BATCH_EXECUTE_URL =
  "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 6000;
const RESOLVE_CONCURRENCY = 8;
const MIN_SUMMARY_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 200;

export const NEWS_WINDOW_DAYS = 7;

export type GoogleNewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
};

// 사용자가 준 카테고리별 핵심/확장 키워드 체계를 기반으로 한 후보 검색어(Gemini 큐레이션용 원본 풀 확보)
export const CANDIDATE_CATEGORY_QUERIES: Record<Category, string[]> = {
  "AI/테크": ["생성형 AI", "AI 에이전트", "AI 반도체", "로봇 자율주행"],
  "금융": ["국내증시", "해외증시 ETF", "핀테크", "가상자산"],
  "건강/뷰티": ["헬스케어", "화장품 뷰티", "다이어트 GLP-1"],
  "소비/라이프": ["이커머스 유통", "여행 레저", "1인가구 소비트렌드"],
  "마케팅/비즈니스": ["브랜드 마케팅", "스타트업 투자", "인플루언서 콘텐츠"],
};

function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function tagText(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(match[1]).trim() : "";
}

function parseRss(xml: string): GoogleNewsItem[] {
  return xml
    .split("<item>")
    .slice(1)
    .map((item) => {
      const source = tagText(item, "source");
      // 구글 뉴스 제목은 끝에 " - 언론사"가 붙고, 원래 제목에도 있으면 두 번 붙는다.
      let title = tagText(item, "title");
      while (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -` - ${source}`.length);
      }
      return {
        title,
        link: tagText(item, "link"),
        source: source || "Google 뉴스",
        pubDate: tagText(item, "pubDate"),
      };
    })
    .filter((item) => item.title && item.link);
}

export async function searchGoogleNews(query: string) {
  const url = new URL(RSS_BASE);
  url.searchParams.set("q", `${query} when:${NEWS_WINDOW_DAYS}d`);
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "KR");
  url.searchParams.set("ceid", "KR:ko");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Google News RSS error: ${res.status} ${query}`);
  }
  // RSS는 관련도순이라 최신순으로 다시 정렬한다.
  return parseRss(await res.text()).sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );
}

// RSS 링크는 구글 경유 주소라서 공개 문서가 없는 batchexecute로 원문 주소를 얻는다.
// 구글이 바꾸면 실패하므로, 실패하면 원래 링크를 그대로 쓴다(브라우저에서는 정상 이동).
async function resolveOriginalUrl(link: string) {
  const id = new URL(link).pathname.split("/").pop();
  const page = await fetch(`https://news.google.com/rss/articles/${id}`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const html = await page.text();
  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!signature || !timestamp) return null;

  const request = JSON.stringify([
    "garturlreq",
    [
      ["X", "X", ["X", "X"], null, null, 1, 1, "KR:ko", null, 1, null, null, null, null, null, 0, 1],
      "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
    ],
    id,
    Number(timestamp),
    signature,
  ]);
  const res = await fetch(BATCH_EXECUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    body: new URLSearchParams({
      "f.req": JSON.stringify([[["Fbv4je", request, null, "generic"]]]),
    }),
  });
  const line = (await res.text())
    .split("\n")
    .find((l) => l.includes("garturlres"));
  if (!line) return null;
  const payload = JSON.parse(JSON.parse(line)[0][2]) as [string, string];
  return payload[1] ?? null;
}

function metaContent(html: string, name: string) {
  const tag = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i"),
  )?.[0];
  const content = tag?.match(/content=(?:"([^"]*)"|'([^']*)')/i);
  return decodeEntities(content?.[1] ?? content?.[2] ?? "").trim();
}

// RSS에는 요약이 없어 기사 페이지의 메타 설명을 요약으로 쓴다.
// 국내 언론사 중에는 아직 EUC-KR 페이지가 있어 charset을 확인해 디코딩한다.
async function fetchArticleSummary(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return "";
  const buffer = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder("latin1").decode(buffer.slice(0, 4000));
  const charset =
    res.headers.get("content-type")?.match(/charset=([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";
  let html: string;
  try {
    html = new TextDecoder(charset.toLowerCase()).decode(buffer);
  } catch {
    html = new TextDecoder("utf-8").decode(buffer);
  }
  const summary =
    metaContent(html, "og:description") || metaContent(html, "description");
  // 너무 짧은 값은 기사 요약이 아니라 사이트 소개 문구인 경우가 많다.
  return summary.length < MIN_SUMMARY_LENGTH
    ? ""
    : summary.slice(0, MAX_SUMMARY_LENGTH);
}

async function resolveArticle(item: GoogleNewsItem) {
  try {
    const url = await resolveOriginalUrl(item.link);
    if (!url) return { link: item.link, summary: "" };
    const summary = await fetchArticleSummary(url).catch(() => "");
    return { link: url, summary };
  } catch {
    return { link: item.link, summary: "" };
  }
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

function formatPubDate(pubDate: string) {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return date.toISOString().slice(0, 10);
}

// 카테고리별로 검색어마다의 기사 목록을 그대로 돌려준다(모두 최신순).
export type NewsCorpus = Record<Category, GoogleNewsItem[][]>;

export async function getNewsCorpus(): Promise<NewsCorpus> {
  const perCategory = await Promise.all(
    CATEGORIES.map(async (category) => {
      const settled = await Promise.allSettled(
        CANDIDATE_CATEGORY_QUERIES[category].map(searchGoogleNews),
      );
      const lists = settled.flatMap((s) => {
        if (s.status === "fulfilled") return [s.value];
        console.error(s.reason);
        return [];
      });
      return [category, lists] as const;
    }),
  );
  const corpus = Object.fromEntries(perCategory) as NewsCorpus;
  if (CATEGORIES.every((category) => corpus[category].flat().length === 0)) {
    throw new Error("Google News returned no articles");
  }
  return corpus;
}

function dedupeByLink(items: GoogleNewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

export function corpusItems(corpus: NewsCorpus, category: Category) {
  return dedupeByLink(corpus[category].flat());
}

export async function getCandidatePool(
  corpus: NewsCorpus,
  displayPerQuery = 6,
): Promise<Record<Category, Trend[]>> {
  const perCategory = await Promise.all(
    CATEGORIES.map(async (category) => {
      const items = dedupeByLink(
        corpus[category].flatMap((list) => list.slice(0, displayPerQuery)),
      ).sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      );
      const resolved = await mapWithLimit(
        items,
        RESOLVE_CONCURRENCY,
        resolveArticle,
      );
      const trends = items.map(
        (item, index): Trend => ({
          id: `${category}-${index}-${item.link}`,
          category,
          publishedDate: formatPubDate(item.pubDate),
          title: item.title,
          summary: resolved[index].summary,
          source: item.source,
          link: resolved[index].link,
        }),
      );
      return [category, trends] as const;
    }),
  );
  return Object.fromEntries(perCategory) as Record<Category, Trend[]>;
}
