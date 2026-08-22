"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, CATEGORY_ICONS, Category, INVESTMENT_TAB, Trend } from "@/data/trends";
import type { DailyAnalysis } from "@/lib/dailyAnalysis";
import type { CospickSnapshot, ExitCheckItem } from "@/lib/cospick";
import { useSavedTrends } from "@/hooks/useSavedTrends";
import TrendCard from "./TrendCard";
import TrendClusterCard from "./TrendClusterCard";
import InvestmentTab from "./InvestmentTab";

function formatTodayLabel() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

export default function HomeClient({
  trends,
  analysis,
  cospick,
  exitCheck,
}: {
  trends: Trend[];
  analysis: DailyAnalysis | null;
  cospick: CospickSnapshot | null;
  exitCheck: ExitCheckItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const activeCategory: Category | typeof INVESTMENT_TAB.label | "전체" =
    categoryParam === INVESTMENT_TAB.label
      ? INVESTMENT_TAB.label
      : categoryParam && (CATEGORIES as string[]).includes(categoryParam)
        ? (categoryParam as Category)
        : "전체";

  const setActiveCategory = (category: Category | typeof INVESTMENT_TAB.label | "전체") => {
    const href = category === "전체" ? "/" : `/?category=${encodeURIComponent(category)}`;
    router.replace(href, { scroll: false });
  };

  const { savedIds, toggleSave } = useSavedTrends();

  const filteredTrends = useMemo(
    () =>
      activeCategory === "전체"
        ? trends
        : trends.filter((t) => t.category === activeCategory),
    [activeCategory, trends],
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 py-10 shadow-lg shadow-indigo-200 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <p className="relative text-xs font-semibold tracking-wide text-blue-100">
          DAILY CURATION · {formatTodayLabel()}
        </p>
        <h1 className="relative mt-2 text-3xl font-bold text-white sm:text-4xl">
          오늘, 놓치면 아쉬운 흐름
        </h1>
        <p className="relative mt-2 text-sm text-blue-100">
          수많은 뉴스 속, 지금 주목할 변화만 간결하게 전합니다.
          <br />
          AI가 반복되는 흐름과 관심도, 산업 영향력을 분석해 매일 업데이트합니다.
        </p>

        <div className="relative mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("전체")}
            className={
              activeCategory === "전체"
                ? "rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm"
                : "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10"
            }
          >
            전체
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={
                activeCategory === category
                  ? "rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm"
                  : "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10"
              }
            >
              <span className="mr-1">{CATEGORY_ICONS[category]}</span>
              {category}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveCategory(INVESTMENT_TAB.label)}
            className={
              activeCategory === INVESTMENT_TAB.label
                ? "rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm"
                : "rounded-full border border-white/30 px-4 py-1.5 text-sm text-white hover:bg-white/10"
            }
          >
            <span className="mr-1">{INVESTMENT_TAB.icon}</span>
            {INVESTMENT_TAB.label}
          </button>
        </div>
      </div>

      {activeCategory === INVESTMENT_TAB.label && (
        <InvestmentTab cospick={cospick} exitCheck={exitCheck} />
      )}

      {activeCategory === "전체" && analysis && analysis.topTrends.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs">
              ✨
            </span>
            <span className="text-xs font-semibold tracking-wide text-indigo-600">
              오늘의 트렌드
            </span>
          </div>
          <div className="mt-3 space-y-4">
            {analysis.topTrends.map((trend, i) => (
              <TrendClusterCard key={i} trend={trend} />
            ))}
          </div>
        </div>
      )}

      {activeCategory !== INVESTMENT_TAB.label && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredTrends.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              saved={savedIds.includes(trend.id)}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
      )}
    </main>
  );
}
