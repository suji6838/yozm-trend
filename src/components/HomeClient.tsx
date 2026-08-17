"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_ICONS, Category, Trend } from "@/data/trends";
import { useSavedTrends } from "@/hooks/useSavedTrends";
import TrendCard from "./TrendCard";

function formatTodayLabel() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

export default function HomeClient({ trends }: { trends: Trend[] }) {
  const [bannerOpen, setBannerOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | "전체">(
    "전체",
  );
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

        {bannerOpen && (
          <div className="relative mb-6 flex items-center justify-between rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur-sm">
            <span>✦ 접속할 때마다 네이버 뉴스에서 실시간으로 트렌드를 가져와요.</span>
            <button
              type="button"
              onClick={() => setBannerOpen(false)}
              className="text-white/70 hover:text-white"
            >
              닫기
            </button>
          </div>
        )}

        <p className="relative text-xs font-semibold tracking-wide text-blue-100">
          DAILY CURATION · {formatTodayLabel()}
        </p>
        <h1 className="relative mt-2 text-3xl font-bold text-white sm:text-4xl">
          오늘, 놓치면 아쉬운 흐름
        </h1>
        <p className="relative mt-2 text-sm text-blue-100">
          수많은 이야기 중 지금 알아두면 좋은 변화만 간결하게 정리했어요.
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
        </div>
      </div>

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
    </main>
  );
}
